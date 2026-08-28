import {
  computed,
  onScopeDispose,
  readonly,
  shallowReadonly,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import type { Awaitable, StorageAdapter } from '@vela-admin/contracts'

import type { UseFormReturn } from './use-form'

export type FormDraftSchemaVersion = string | number

export interface FormDraftEnvelope<TValues> {
  readonly format: 1
  readonly schemaVersion: FormDraftSchemaVersion
  readonly savedAt: number
  readonly values: TValues
}

export interface UseFormDraftOptions<TValues> {
  readonly form: Pick<UseFormReturn<TValues>, 'values' | 'dirty' | 'setValues'>
  readonly storage: StorageAdapter
  readonly storageKey: string
  readonly schemaVersion?: FormDraftSchemaVersion
  readonly debounceMs?: number
  readonly immediate?: boolean
  readonly autoRestore?: boolean
  readonly clearWhenPristine?: boolean
  readonly clone?: (values: TValues) => TValues
  readonly now?: () => number
  readonly migrate?: (draft: FormDraftEnvelope<unknown>) => Awaitable<TValues | undefined>
}

export interface FormDraftController<TValues> {
  readonly draft: Readonly<Ref<FormDraftEnvelope<TValues> | undefined>>
  readonly ready: Readonly<Ref<boolean>>
  readonly saving: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<unknown>>
  readonly hasDraft: ComputedRef<boolean>
  readonly restorable: Readonly<Ref<boolean>>
  readonly hydrate: () => Promise<FormDraftEnvelope<TValues> | undefined>
  readonly save: () => Promise<FormDraftEnvelope<TValues> | undefined>
  readonly restore: () => boolean
  readonly discard: () => Promise<void>
  readonly flush: () => Promise<void>
}

function isDraftEnvelope(value: unknown): value is FormDraftEnvelope<unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Partial<FormDraftEnvelope<unknown>>
  return (
    candidate.format === 1 &&
    (typeof candidate.schemaVersion === 'string' || typeof candidate.schemaVersion === 'number') &&
    typeof candidate.savedAt === 'number' &&
    Number.isFinite(candidate.savedAt) &&
    'values' in candidate
  )
}

/**
 * Persists form work-in-progress without coupling form schemas to localStorage or an API envelope.
 * Draft discovery is manual by default; applications decide when restoration is appropriate.
 */
export function useFormDraft<TValues>(
  options: UseFormDraftOptions<TValues>,
): FormDraftController<TValues> {
  const schemaVersion = options.schemaVersion ?? 1
  const debounceMs = Math.max(0, options.debounceMs ?? 500)
  const clone: (values: TValues) => TValues = options.clone ?? structuredClone
  const now = options.now ?? Date.now
  const draft = shallowRef<FormDraftEnvelope<TValues>>()
  const ready = shallowRef(false)
  const saving = shallowRef(false)
  const error = shallowRef<unknown>()
  const restorable = shallowRef(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  let queued = Promise.resolve()
  let activeOperations = 0

  function isDisposed(): boolean {
    return disposed
  }

  function enqueue(operation: () => Awaitable<void>): Promise<void> {
    activeOperations += 1
    saving.value = true
    const current = queued.catch(() => undefined).then(operation)
    queued = current.catch(() => undefined)
    return current.finally(() => {
      activeOperations -= 1
      if (activeOperations === 0) saving.value = false
    })
  }

  function clearTimer(): void {
    if (timer) clearTimeout(timer)
    timer = undefined
  }

  async function save(): Promise<FormDraftEnvelope<TValues> | undefined> {
    clearTimer()
    if (isDisposed() || !options.form.dirty.value) return undefined
    const envelope: FormDraftEnvelope<TValues> = {
      format: 1,
      schemaVersion,
      savedAt: now(),
      values: clone(options.form.values.value),
    }
    error.value = undefined
    try {
      await enqueue(() => options.storage.set(options.storageKey, envelope))
      if (!isDisposed()) draft.value = envelope
      return envelope
    } catch (cause) {
      if (!isDisposed()) error.value = cause
      return undefined
    }
  }

  function scheduleSave(): void {
    clearTimer()
    timer = setTimeout(() => void save(), debounceMs)
  }

  async function discard(): Promise<void> {
    clearTimer()
    draft.value = undefined
    restorable.value = false
    error.value = undefined
    try {
      await enqueue(() => options.storage.remove(options.storageKey))
    } catch (cause) {
      if (!isDisposed()) error.value = cause
    }
  }

  function restore(): boolean {
    if (!draft.value) return false
    options.form.setValues(clone(draft.value.values))
    restorable.value = false
    return true
  }

  async function hydrate(): Promise<FormDraftEnvelope<TValues> | undefined> {
    if (isDisposed()) return undefined
    error.value = undefined
    try {
      const stored = await options.storage.get<unknown>(options.storageKey)
      if (!isDraftEnvelope(stored)) return undefined
      if (stored.schemaVersion === schemaVersion) {
        draft.value = {
          ...stored,
          values: clone(stored.values as TValues),
        }
      } else if (options.migrate) {
        const migrated = await options.migrate(stored)
        if (migrated !== undefined) {
          draft.value = {
            format: 1,
            schemaVersion,
            savedAt: stored.savedAt,
            values: clone(migrated),
          }
        }
      }
      restorable.value = draft.value !== undefined
      if (options.autoRestore && draft.value) restore()
      return draft.value
    } catch (cause) {
      error.value = cause
      return undefined
    } finally {
      ready.value = true
    }
  }

  watch(
    [options.form.values, options.form.dirty],
    ([, dirty]) => {
      if (!ready.value || isDisposed()) return
      if (dirty) {
        scheduleSave()
      } else if (options.clearWhenPristine ?? true) {
        void discard()
      }
    },
    { deep: true },
  )

  async function flush(): Promise<void> {
    if (timer) await save()
    await queued.catch(() => undefined)
  }

  onScopeDispose(() => {
    clearTimer()
    disposed = true
  })

  if (options.immediate ?? true) void hydrate()

  return {
    draft: shallowReadonly(draft),
    ready: readonly(ready),
    saving: readonly(saving),
    error: readonly(error),
    hasDraft: computed(() => draft.value !== undefined),
    restorable: readonly(restorable),
    hydrate,
    save,
    restore,
    discard,
    flush,
  }
}
