import { computed, onScopeDispose, shallowRef, type ComputedRef, type Ref } from 'vue'
import type {
  NormalizedError,
  UploadAdapter,
  UploadFileLike,
  UploadProgress,
  UploadResult,
} from '@vela-admin/contracts'
import { useVelaLocale } from '@vela-admin/locale'

import type { UploadQueueItem, UploadRemoteAsset, UploadValidator } from './types'

export interface UploadPreviewAdapter<TFile extends UploadFileLike> {
  create(file: TFile): string | undefined
  revoke(url: string): void
}

export interface UploadQueueOptions<TValue, TFile extends UploadFileLike, TMetadata> {
  readonly adapter: UploadAdapter<TValue, TFile, TMetadata>
  readonly validators?: readonly UploadValidator<TFile>[]
  readonly concurrency?: number
  readonly autoRetry?: number
  readonly autoStart?: boolean
  readonly createId?: () => string
  readonly preview?: UploadPreviewAdapter<TFile>
  readonly messages?: Partial<UploadQueueMessages>
}

export interface UploadQueueMessages {
  readonly cancelled: string
  readonly failed: string
}

export interface UploadQueue<
  TValue = unknown,
  TFile extends UploadFileLike = UploadFileLike,
  TMetadata = unknown,
> {
  readonly items: Readonly<Ref<readonly UploadQueueItem<TValue, TFile, TMetadata>[]>>
  readonly activeCount: ComputedRef<number>
  readonly pendingCount: ComputedRef<number>
  readonly completedCount: ComputedRef<number>
  readonly add: (files: readonly TFile[], metadata?: TMetadata) => readonly string[]
  readonly seed: (assets: readonly UploadRemoteAsset<TValue, TMetadata>[]) => readonly string[]
  readonly start: () => void
  readonly pause: () => void
  readonly cancel: (id: string) => void
  readonly retry: (id: string) => void
  readonly move: (id: string, targetIndex: number) => void
  readonly remove: (id: string) => void
  readonly clearCompleted: () => void
  readonly drain: () => Promise<void>
  readonly dispose: () => void
}

const defaultMessages: UploadQueueMessages = {
  cancelled: 'Upload cancelled',
  failed: 'Upload failed',
}

function defaultError(error: unknown, messages: UploadQueueMessages): NormalizedError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { kind: 'cancelled', message: messages.cancelled, retryable: false, cause: error }
  }
  return {
    kind: 'network',
    message: error instanceof Error ? error.message : messages.failed,
    retryable: true,
    cause: error,
  }
}

function normalizeProgress(progress: UploadProgress): UploadProgress {
  const total = progress.total
  const percentage =
    progress.percentage ??
    (total === undefined || total <= 0 ? undefined : Math.min(100, (progress.loaded / total) * 100))
  return {
    loaded: Math.max(0, progress.loaded),
    ...(total === undefined ? {} : { total: Math.max(0, total) }),
    ...(percentage === undefined ? {} : { percentage: Math.max(0, Math.min(100, percentage)) }),
  }
}

export function createUploadQueue<
  TValue = unknown,
  TFile extends UploadFileLike = UploadFileLike,
  TMetadata = unknown,
>(options: UploadQueueOptions<TValue, TFile, TMetadata>): UploadQueue<TValue, TFile, TMetadata> {
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 3))
  const autoRetry = Math.max(0, Math.floor(options.autoRetry ?? 0))
  const createId = options.createId ?? (() => crypto.randomUUID())
  const messages: UploadQueueMessages = { ...defaultMessages, ...options.messages }
  const items = shallowRef<readonly UploadQueueItem<TValue, TFile, TMetadata>[]>([])
  const controllers = new Map<string, AbortController>()
  const drainResolvers = new Set<() => void>()
  let running = options.autoStart ?? true
  let disposed = false
  let schedulePending = false

  const update = (
    id: string,
    updater: (
      item: UploadQueueItem<TValue, TFile, TMetadata>,
    ) => UploadQueueItem<TValue, TFile, TMetadata>,
  ) => {
    items.value = items.value.map((item) => (item.id === id ? updater(item) : item))
  }

  const settleDrains = () => {
    const unsettled = items.value.some((item) =>
      ['queued', 'validating', 'uploading'].includes(item.status),
    )
    if (unsettled || controllers.size > 0) return
    for (const resolve of drainResolvers) resolve()
    drainResolvers.clear()
  }

  const schedule = () => {
    if (schedulePending || disposed) return
    schedulePending = true
    queueMicrotask(() => {
      schedulePending = false
      if (!running || disposed) return
      const available = concurrency - controllers.size
      if (available <= 0) return
      const queued = items.value.filter((item) => item.status === 'queued').slice(0, available)
      for (const item of queued) void upload(item.id)
      settleDrains()
    })
  }

  const upload = async (id: string) => {
    const item = items.value.find((candidate) => candidate.id === id)
    if (item?.status !== 'queued' || item.source !== 'local' || disposed) return
    const file = item.file as TFile
    const controller = new AbortController()
    controllers.set(id, controller)
    update(id, (current) => ({ ...current, status: 'validating', error: undefined }))

    try {
      for (const validator of options.validators ?? []) {
        const validationError = await validator(file)
        if (validationError) {
          update(id, (current) => ({ ...current, status: 'error', error: validationError }))
          return
        }
      }

      update(id, (current) => ({
        ...current,
        status: 'uploading',
        attempts: current.attempts + 1,
      }))
      const result: UploadResult<TValue> = await options.adapter.upload({
        file,
        signal: controller.signal,
        onProgress: (progress) => {
          if (controller.signal.aborted) return
          update(id, (current) => ({ ...current, progress: normalizeProgress(progress) }))
        },
        ...(item.metadata === undefined ? {} : { metadata: item.metadata }),
      })
      if (controller.signal.aborted) return
      update(id, (current) => ({
        ...current,
        status: 'success',
        result,
        progress: { loaded: file.size, total: file.size, percentage: 100 },
      }))
    } catch (error) {
      const normalized = options.adapter.normalizeError?.(error) ?? defaultError(error, messages)
      if (controller.signal.aborted || normalized.kind === 'cancelled') {
        update(id, (current) => ({ ...current, status: 'cancelled', error: normalized }))
        return
      }
      const latest = items.value.find((candidate) => candidate.id === id)
      if (latest && latest.attempts <= autoRetry && normalized.retryable) {
        update(id, (current) => ({ ...current, status: 'queued', error: normalized }))
      } else {
        update(id, (current) => ({ ...current, status: 'error', error: normalized }))
      }
    } finally {
      controllers.delete(id)
      schedule()
      settleDrains()
    }
  }

  const revokePreview = (item: UploadQueueItem<TValue, TFile, TMetadata>) => {
    if (item.source === 'local' && item.previewUrl) options.preview?.revoke(item.previewUrl)
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    for (const controller of controllers.values()) controller.abort()
    controllers.clear()
    for (const item of items.value) revokePreview(item)
    items.value = []
    settleDrains()
  }

  onScopeDispose(dispose, true)

  return {
    items,
    activeCount: computed(
      () => items.value.filter((item) => ['validating', 'uploading'].includes(item.status)).length,
    ),
    pendingCount: computed(
      () =>
        items.value.filter((item) => ['queued', 'validating', 'uploading'].includes(item.status))
          .length,
    ),
    completedCount: computed(
      () =>
        items.value.filter((item) => ['success', 'error', 'cancelled'].includes(item.status))
          .length,
    ),
    add: (files, metadata) => {
      if (disposed) throw new Error('The upload queue has been disposed')
      const added = files.map((file): UploadQueueItem<TValue, TFile, TMetadata> => {
        const previewUrl = options.preview?.create(file)
        return {
          id: createId(),
          source: 'local',
          file,
          status: 'queued',
          progress: { loaded: 0, total: file.size, percentage: 0 },
          attempts: 0,
          ...(metadata === undefined ? {} : { metadata }),
          ...(previewUrl === undefined ? {} : { previewUrl }),
        }
      })
      items.value = [...items.value, ...added]
      schedule()
      return added.map((item) => item.id)
    },
    seed: (assets) => {
      if (disposed) throw new Error('The upload queue has been disposed')
      const existingIds = new Set(items.value.map((item) => item.id))
      const seeded = assets.map((asset): UploadQueueItem<TValue, TFile, TMetadata> => {
        const id = asset.id ?? createId()
        if (existingIds.has(id)) throw new Error(`Duplicate upload queue item id "${id}"`)
        existingIds.add(id)
        const size = Math.max(0, asset.size ?? 0)
        return {
          id,
          source: 'remote',
          file: {
            name: asset.name,
            size,
            type: asset.type ?? '',
          },
          status: 'success',
          progress: { loaded: size, total: size, percentage: 100 },
          attempts: 0,
          previewUrl: asset.url,
          ...(asset.metadata === undefined ? {} : { metadata: asset.metadata }),
          ...(asset.result === undefined ? {} : { result: asset.result }),
        }
      })
      items.value = [...items.value, ...seeded]
      settleDrains()
      return seeded.map((item) => item.id)
    },
    start: () => {
      running = true
      schedule()
    },
    pause: () => {
      running = false
    },
    cancel: (id) => {
      controllers.get(id)?.abort()
      update(id, (item) => ({ ...item, status: 'cancelled' }))
      settleDrains()
    },
    retry: (id) => {
      update(id, (item) => ({
        ...item,
        status: 'queued',
        error: undefined,
        result: undefined,
        progress: { loaded: 0, total: item.file.size, percentage: 0 },
      }))
      schedule()
    },
    move: (id, targetIndex) => {
      const currentIndex = items.value.findIndex((item) => item.id === id)
      if (currentIndex < 0 || items.value.length < 2) return
      const nextIndex = Math.max(0, Math.min(items.value.length - 1, Math.floor(targetIndex)))
      if (currentIndex === nextIndex) return
      const reordered = [...items.value]
      const [item] = reordered.splice(currentIndex, 1)
      if (!item) return
      reordered.splice(nextIndex, 0, item)
      items.value = reordered
    },
    remove: (id) => {
      const item = items.value.find((candidate) => candidate.id === id)
      if (!item) return
      controllers.get(id)?.abort()
      revokePreview(item)
      items.value = items.value.filter((candidate) => candidate.id !== id)
      settleDrains()
    },
    clearCompleted: () => {
      const retained = items.value.filter(
        (item) => !['success', 'error', 'cancelled'].includes(item.status),
      )
      for (const item of items.value) if (!retained.includes(item)) revokePreview(item)
      items.value = retained
      settleDrains()
    },
    drain: () => {
      const unsettled = items.value.some((item) =>
        ['queued', 'validating', 'uploading'].includes(item.status),
      )
      if (!unsettled && controllers.size === 0) return Promise.resolve()
      return new Promise<void>((resolve) => drainResolvers.add(resolve))
    },
    dispose,
  }
}

/**
 * Locale-aware setup helper. The queue remains transport-independent; only its fallback copy is
 * resolved from the current application locale.
 */
export function useUploadQueue<
  TValue = unknown,
  TFile extends UploadFileLike = UploadFileLike,
  TMetadata = unknown,
>(options: UploadQueueOptions<TValue, TFile, TMetadata>): UploadQueue<TValue, TFile, TMetadata> {
  const locale = useVelaLocale()
  return createUploadQueue({
    ...options,
    messages: {
      cancelled: locale.t('upload.error.cancelled'),
      failed: locale.t('upload.error.failed'),
      ...options.messages,
    },
  })
}

export function createBrowserPreviewAdapter(): UploadPreviewAdapter<File> {
  return {
    create: (file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined),
    revoke: (url) => URL.revokeObjectURL(url),
  }
}
