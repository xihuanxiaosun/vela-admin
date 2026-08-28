import { computed, shallowRef, type ComputedRef, type Ref } from 'vue'
import type { Awaitable } from '@vela-admin/contracts'

export interface GlobalLoadingOptions {
  readonly label?: string
  readonly delay?: number
  readonly minimumDuration?: number
}

export interface GlobalLoadingEntry {
  readonly id: string
  readonly label: string
}

export interface GlobalLoadingHandle {
  readonly id: string
  readonly update: (input: string | Pick<GlobalLoadingOptions, 'label'>) => void
  readonly close: () => void
}

export interface GlobalLoadingController {
  readonly entries: Readonly<Ref<readonly GlobalLoadingEntry[]>>
  readonly active: ComputedRef<boolean>
  readonly current: ComputedRef<GlobalLoadingEntry | undefined>
  readonly count: ComputedRef<number>
  readonly start: (input?: GlobalLoadingOptions | string) => GlobalLoadingHandle
  readonly run: <T>(task: () => Awaitable<T>, input?: GlobalLoadingOptions | string) => Promise<T>
  readonly clear: () => void
}

export interface GlobalLoadingDefaults {
  readonly label?: string
  readonly delay?: number
  readonly minimumDuration?: number
}

interface LoadingRecord {
  readonly id: string
  label: string
  readonly minimumDuration: number
  visibleAt?: number
  showTimer?: ReturnType<typeof setTimeout>
  closeTimer?: ReturnType<typeof setTimeout>
  closed: boolean
}

const DEFAULT_DELAY = 120
const DEFAULT_MINIMUM_DURATION = 280

function nonNegative(value: number | undefined, fallback: number): number {
  return value === undefined ? fallback : Math.max(0, value)
}

export function createGlobalLoadingController(
  defaults: GlobalLoadingDefaults = {},
): GlobalLoadingController {
  const entries = shallowRef<readonly GlobalLoadingEntry[]>([])
  const records = new Map<string, LoadingRecord>()
  let sequence = 0

  const syncEntries = () => {
    entries.value = [...records.values()]
      .filter((record) => record.visibleAt !== undefined && !record.closed)
      .map(({ id, label }) => ({ id, label }))
  }

  const remove = (record: LoadingRecord) => {
    if (record.showTimer) clearTimeout(record.showTimer)
    if (record.closeTimer) clearTimeout(record.closeTimer)
    records.delete(record.id)
    syncEntries()
  }

  const close = (record: LoadingRecord) => {
    if (record.closed) return
    record.closed = true
    if (record.visibleAt === undefined) {
      remove(record)
      return
    }

    const elapsed = Date.now() - record.visibleAt
    const remaining = Math.max(0, record.minimumDuration - elapsed)
    if (remaining === 0) remove(record)
    else record.closeTimer = setTimeout(() => remove(record), remaining)
  }

  const start = (input: GlobalLoadingOptions | string = {}): GlobalLoadingHandle => {
    const options = typeof input === 'string' ? { label: input } : input
    const id = `vela-loading-${++sequence}`
    const delay = nonNegative(options.delay, nonNegative(defaults.delay, DEFAULT_DELAY))
    const record: LoadingRecord = {
      id,
      label: options.label ?? defaults.label ?? 'Loading',
      minimumDuration: nonNegative(
        options.minimumDuration,
        nonNegative(defaults.minimumDuration, DEFAULT_MINIMUM_DURATION),
      ),
      closed: false,
    }
    records.set(id, record)

    const show = () => {
      if (record.closed) return
      record.visibleAt = Date.now()
      syncEntries()
    }
    if (delay === 0) show()
    else record.showTimer = setTimeout(show, delay)

    return {
      id,
      update: (next) => {
        if (record.closed) return
        record.label = typeof next === 'string' ? next : (next.label ?? record.label)
        syncEntries()
      },
      close: () => close(record),
    }
  }

  const clear = () => {
    for (const record of records.values()) {
      if (record.showTimer) clearTimeout(record.showTimer)
      if (record.closeTimer) clearTimeout(record.closeTimer)
    }
    records.clear()
    syncEntries()
  }

  return {
    entries,
    active: computed(() => entries.value.length > 0),
    current: computed(() => entries.value.at(-1)),
    count: computed(() => entries.value.length),
    start,
    run: async <T>(task: () => Awaitable<T>, nextInput?: GlobalLoadingOptions | string) => {
      const handle = start(nextInput)
      try {
        return await task()
      } finally {
        handle.close()
      }
    },
    clear,
  }
}
