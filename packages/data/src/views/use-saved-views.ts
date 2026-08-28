import { computed, shallowReadonly, shallowRef, type ComputedRef, type Ref } from 'vue'
import type { StorageAdapter } from '@vela-admin/contracts'

export interface SavedDataView<TState> {
  readonly id: string
  readonly name: string
  readonly state: TState
  readonly createdAt: number
  readonly updatedAt: number
}

interface StoredSavedViews<TState> {
  readonly version: 1
  readonly views: readonly SavedDataView<TState>[]
  readonly defaultId?: string
}

export interface UseSavedViewsOptions<TState> {
  readonly storage: StorageAdapter
  readonly storageKey: string
  readonly maxViews?: number
  readonly createId?: () => string
  readonly now?: () => number
  readonly clone?: (state: TState) => TState
  readonly immediate?: boolean
}

export interface SavedViewsController<TState> {
  readonly views: Readonly<Ref<readonly SavedDataView<TState>[]>>
  readonly activeId: Readonly<Ref<string | undefined>>
  readonly defaultId: Readonly<Ref<string | undefined>>
  readonly activeView: ComputedRef<SavedDataView<TState> | undefined>
  readonly defaultView: ComputedRef<SavedDataView<TState> | undefined>
  readonly ready: Readonly<Ref<boolean>>
  readonly saving: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<unknown>>
  readonly create: (name: string, state: TState, makeDefault?: boolean) => SavedDataView<TState>
  readonly update: (id: string, state: TState) => boolean
  readonly rename: (id: string, name: string) => boolean
  readonly remove: (id: string) => boolean
  readonly setDefault: (id: string | undefined) => boolean
  readonly activate: (id: string | undefined) => TState | undefined
  readonly markModified: () => void
  readonly hydrate: () => Promise<void>
  readonly flush: () => Promise<void>
  readonly clear: () => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeStoredViews<TState>(candidate: unknown): StoredSavedViews<TState> | undefined {
  if (!isRecord(candidate) || candidate.version !== 1 || !Array.isArray(candidate.views)) {
    return undefined
  }
  const views = candidate.views.filter((view): view is SavedDataView<TState> => {
    if (!isRecord(view)) return false
    return (
      typeof view.id === 'string' &&
      view.id.length > 0 &&
      typeof view.name === 'string' &&
      view.name.trim().length > 0 &&
      typeof view.createdAt === 'number' &&
      Number.isFinite(view.createdAt) &&
      typeof view.updatedAt === 'number' &&
      Number.isFinite(view.updatedAt) &&
      'state' in view
    )
  })
  const defaultId =
    typeof candidate.defaultId === 'string' && views.some((view) => view.id === candidate.defaultId)
      ? candidate.defaultId
      : undefined
  return { version: 1, views, ...(defaultId ? { defaultId } : {}) }
}

/** Durable named data views without assuming a router, backend, or column implementation. */
export function useSavedViews<TState>(
  options: UseSavedViewsOptions<TState>,
): SavedViewsController<TState> {
  const clone = options.clone ?? ((state: TState) => structuredClone(state))
  const now = options.now ?? Date.now
  const createId = options.createId ?? (() => crypto.randomUUID())
  const maxViews = Math.max(1, Math.floor(options.maxViews ?? 20))
  const views = shallowRef<readonly SavedDataView<TState>[]>([])
  const activeId = shallowRef<string>()
  const defaultId = shallowRef<string>()
  const ready = shallowRef(false)
  const saving = shallowRef(false)
  const error = shallowRef<unknown>()
  let persistenceRevision = 0
  let persistenceQueue: Promise<void> = Promise.resolve()

  const snapshot = (): StoredSavedViews<TState> => ({
    version: 1,
    views: views.value.map((view) => ({ ...view, state: clone(view.state) })),
    ...(defaultId.value ? { defaultId: defaultId.value } : {}),
  })

  const persist = (): void => {
    const revision = ++persistenceRevision
    const state = snapshot()
    saving.value = true
    persistenceQueue = persistenceQueue
      .catch(() => undefined)
      .then(() => options.storage.set(options.storageKey, state))
      .then(() => {
        if (revision === persistenceRevision) error.value = undefined
      })
      .catch((cause) => {
        if (revision === persistenceRevision) error.value = cause
      })
      .finally(() => {
        if (revision === persistenceRevision) saving.value = false
      })
  }

  const uniqueName = (name: string, exceptId?: string): string => {
    const normalized = name.trim()
    if (!normalized) throw new TypeError('Saved view name cannot be empty')
    if (
      views.value.some(
        (view) =>
          view.id !== exceptId &&
          view.name.localeCompare(normalized, undefined, { sensitivity: 'accent' }) === 0,
      )
    ) {
      throw new Error('A saved view with this name already exists')
    }
    return normalized
  }

  const hydrate = async (): Promise<void> => {
    try {
      const stored = normalizeStoredViews<TState>(await options.storage.get(options.storageKey))
      views.value = stored?.views.map((view) => ({ ...view, state: clone(view.state) })) ?? []
      defaultId.value = stored?.defaultId
      activeId.value = stored?.defaultId
      error.value = undefined
    } catch (cause) {
      error.value = cause
      views.value = []
      activeId.value = undefined
      defaultId.value = undefined
    } finally {
      ready.value = true
    }
  }

  if (options.immediate ?? true) void hydrate()

  return {
    views: shallowReadonly(views),
    activeId: shallowReadonly(activeId),
    defaultId: shallowReadonly(defaultId),
    activeView: computed(() => views.value.find((view) => view.id === activeId.value)),
    defaultView: computed(() => views.value.find((view) => view.id === defaultId.value)),
    ready: shallowReadonly(ready),
    saving: shallowReadonly(saving),
    error: shallowReadonly(error),
    create(name, state, makeDefault = false) {
      if (views.value.length >= maxViews)
        throw new RangeError(`A maximum of ${maxViews} views is allowed`)
      const timestamp = now()
      const view: SavedDataView<TState> = {
        id: createId(),
        name: uniqueName(name),
        state: clone(state),
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      views.value = [...views.value, view]
      activeId.value = view.id
      if (makeDefault) defaultId.value = view.id
      persist()
      return view
    },
    update(id, state) {
      if (!views.value.some((view) => view.id === id)) return false
      views.value = views.value.map((view) =>
        view.id === id ? { ...view, state: clone(state), updatedAt: now() } : view,
      )
      activeId.value = id
      persist()
      return true
    },
    rename(id, name) {
      if (!views.value.some((view) => view.id === id)) return false
      const normalized = uniqueName(name, id)
      views.value = views.value.map((view) =>
        view.id === id ? { ...view, name: normalized, updatedAt: now() } : view,
      )
      persist()
      return true
    },
    remove(id) {
      if (!views.value.some((view) => view.id === id)) return false
      views.value = views.value.filter((view) => view.id !== id)
      if (activeId.value === id) activeId.value = undefined
      if (defaultId.value === id) defaultId.value = undefined
      persist()
      return true
    },
    setDefault(id) {
      if (id !== undefined && !views.value.some((view) => view.id === id)) return false
      defaultId.value = id
      persist()
      return true
    },
    activate(id) {
      const view = views.value.find((candidate) => candidate.id === id)
      activeId.value = view?.id
      return view ? clone(view.state) : undefined
    },
    markModified: () => {
      activeId.value = undefined
    },
    hydrate,
    flush: () => persistenceQueue,
    async clear() {
      persistenceRevision += 1
      views.value = []
      activeId.value = undefined
      defaultId.value = undefined
      saving.value = false
      try {
        await options.storage.remove(options.storageKey)
        error.value = undefined
      } catch (cause) {
        error.value = cause
      }
    },
  }
}
