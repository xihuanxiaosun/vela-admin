import {
  computed,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type { StorageAdapter } from '@vela-admin/contracts'

import { resolveColumnResizeBounds } from './layout'
import type { DataColumn } from './types'

export interface ColumnPreferenceState {
  readonly order: readonly string[]
  readonly hidden: readonly string[]
  readonly widths: Readonly<Record<string, number>>
}

type StoredColumnPreferences =
  | {
      readonly version: 1
      readonly state: Omit<ColumnPreferenceState, 'widths'>
    }
  | {
      readonly version: 2
      readonly state: ColumnPreferenceState
    }

export interface UseColumnPreferencesOptions<TItem> {
  readonly columns: MaybeRefOrGetter<readonly DataColumn<TItem>[]>
  readonly storageKey: string
  readonly storage?: StorageAdapter
  readonly immediate?: boolean
}

export interface ColumnPreferencesController<TItem> {
  readonly state: Readonly<Ref<ColumnPreferenceState>>
  readonly orderedColumns: ComputedRef<readonly DataColumn<TItem>[]>
  readonly visibleColumns: ComputedRef<readonly DataColumn<TItem>[]>
  readonly configurableColumns: ComputedRef<readonly DataColumn<TItem>[]>
  readonly ready: Readonly<Ref<boolean>>
  readonly saving: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<unknown>>
  readonly isVisible: (key: string) => boolean
  readonly canHide: (key: string) => boolean
  readonly canMove: (key: string, direction: -1 | 1) => boolean
  readonly setVisible: (key: string, visible: boolean) => boolean
  readonly move: (key: string, direction: -1 | 1) => boolean
  readonly setOrder: (keys: readonly string[]) => void
  readonly hasCustomWidth: (key: string) => boolean
  readonly setWidth: (key: string, width: number) => boolean
  readonly resetWidth: (key: string) => boolean
  readonly hydrate: () => Promise<void>
  readonly reset: () => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isConfigurable<TItem>(column: DataColumn<TItem>): boolean {
  return column.configurable ?? !['selection', 'actions'].includes(column.role ?? '')
}

function defaultState<TItem>(columns: readonly DataColumn<TItem>[]): ColumnPreferenceState {
  return {
    order: columns.map((column) => column.key),
    hidden: columns.filter((column) => column.visible === false).map((column) => column.key),
    widths: {},
  }
}

function normalizeState<TItem>(
  columns: readonly DataColumn<TItem>[],
  candidate: unknown,
): ColumnPreferenceState {
  const defaults = defaultState(columns)
  if (!isRecord(candidate)) return defaults
  const known = new Set(defaults.order)
  const rawOrder = Array.isArray(candidate.order)
    ? candidate.order.filter((key): key is string => typeof key === 'string' && known.has(key))
    : []
  const order = [...new Set(rawOrder), ...defaults.order.filter((key) => !rawOrder.includes(key))]
  const rawHidden = Array.isArray(candidate.hidden)
    ? candidate.hidden.filter((key): key is string => typeof key === 'string' && known.has(key))
    : []
  const existingKeys = new Set(rawOrder)
  const hidden = new Set(rawHidden)
  const rawWidths = isRecord(candidate.widths) ? candidate.widths : {}
  const widths: Record<string, number> = {}
  for (const [key, width] of Object.entries(rawWidths)) {
    if (known.has(key) && typeof width === 'number' && Number.isFinite(width)) {
      widths[key] = width
    }
  }

  for (const column of columns) {
    if (!isConfigurable(column)) {
      if (column.visible === false) hidden.add(column.key)
      else hidden.delete(column.key)
      continue
    }
    if (!existingKeys.has(column.key) && column.visible === false) hidden.add(column.key)
  }

  return { order, hidden: [...hidden], widths }
}

/** Keeps user column choices versioned, schema-aware, and independent of a storage implementation. */
export function useColumnPreferences<TItem>(
  options: UseColumnPreferencesOptions<TItem>,
): ColumnPreferencesController<TItem> {
  const schemaColumns = computed(() => toValue(options.columns))
  const state = shallowRef<ColumnPreferenceState>(defaultState(schemaColumns.value))
  const ready = shallowRef(!options.storage)
  const saving = shallowRef(false)
  const error = shallowRef<unknown>()
  let persistenceRevision = 0

  const columnByKey = computed(
    () => new Map(schemaColumns.value.map((column) => [column.key, column] as const)),
  )
  const orderedColumns = computed(() =>
    state.value.order
      .map((key) => columnByKey.value.get(key))
      .filter((column): column is DataColumn<TItem> => column !== undefined),
  )
  const configurableColumns = computed(() => orderedColumns.value.filter(isConfigurable))
  const visibleColumns = computed(() =>
    orderedColumns.value
      .filter((column) => !state.value.hidden.includes(column.key))
      .map((column) => {
        const width = state.value.widths[column.key]
        return width === undefined
          ? column
          : { ...column, sizing: { mode: 'fixed' as const, size: width } }
      }),
  )

  const persist = async (): Promise<void> => {
    if (!options.storage) return
    const revision = ++persistenceRevision
    saving.value = true
    try {
      const payload: StoredColumnPreferences = { version: 2, state: state.value }
      await options.storage.set(options.storageKey, payload)
      if (revision === persistenceRevision) error.value = undefined
    } catch (cause) {
      if (revision === persistenceRevision) error.value = cause
    } finally {
      if (revision === persistenceRevision) saving.value = false
    }
  }

  const update = (next: ColumnPreferenceState): void => {
    state.value = normalizeState(schemaColumns.value, next)
    void persist()
  }

  const isVisible = (key: string): boolean => !state.value.hidden.includes(key)

  const canHide = (key: string): boolean => {
    const column = columnByKey.value.get(key)
    if (!column || !isConfigurable(column) || !isVisible(key)) return false
    return configurableColumns.value.filter((candidate) => isVisible(candidate.key)).length > 1
  }

  const setVisible = (key: string, visible: boolean): boolean => {
    const column = columnByKey.value.get(key)
    if (!column || !isConfigurable(column)) return false
    if (!visible && !canHide(key)) return false
    const hidden = new Set(state.value.hidden)
    if (visible) hidden.delete(key)
    else hidden.add(key)
    update({ ...state.value, hidden: [...hidden] })
    return true
  }

  const configurableOrder = (): string[] => configurableColumns.value.map((column) => column.key)

  const canMove = (key: string, direction: -1 | 1): boolean => {
    const keys = configurableOrder()
    const index = keys.indexOf(key)
    return index >= 0 && index + direction >= 0 && index + direction < keys.length
  }

  const move = (key: string, direction: -1 | 1): boolean => {
    if (!canMove(key, direction)) return false
    const configurableKeys = configurableOrder()
    const currentIndex = configurableKeys.indexOf(key)
    const targetKey = configurableKeys[currentIndex + direction]
    if (!targetKey) return false
    const order = [...state.value.order]
    const sourceIndex = order.indexOf(key)
    const targetIndex = order.indexOf(targetKey)
    ;[order[sourceIndex], order[targetIndex]] = [
      order[targetIndex] ?? key,
      order[sourceIndex] ?? targetKey,
    ]
    update({ ...state.value, order })
    return true
  }

  const setOrder = (keys: readonly string[]): void => {
    update({ ...state.value, order: [...keys] })
  }

  const hasCustomWidth = (key: string): boolean => state.value.widths[key] !== undefined

  const setWidth = (key: string, width: number): boolean => {
    const column = columnByKey.value.get(key)
    if (!column || !isConfigurable(column) || !Number.isFinite(width)) return false
    const bounds = resolveColumnResizeBounds(column)
    const normalizedWidth = Math.round(Math.min(bounds.max, Math.max(bounds.min, width)))
    update({ ...state.value, widths: { ...state.value.widths, [key]: normalizedWidth } })
    return true
  }

  const resetWidth = (key: string): boolean => {
    if (!hasCustomWidth(key)) return false
    const widths = { ...state.value.widths }
    delete widths[key]
    update({ ...state.value, widths })
    return true
  }

  const hydrate = async (): Promise<void> => {
    if (!options.storage) {
      ready.value = true
      return
    }
    try {
      const stored = await options.storage.get<StoredColumnPreferences>(options.storageKey)
      state.value = normalizeState(
        schemaColumns.value,
        stored?.version === 1 || stored?.version === 2 ? stored.state : undefined,
      )
      error.value = undefined
    } catch (cause) {
      error.value = cause
      state.value = defaultState(schemaColumns.value)
    } finally {
      ready.value = true
    }
  }

  const reset = async (): Promise<void> => {
    persistenceRevision += 1
    state.value = defaultState(schemaColumns.value)
    saving.value = false
    error.value = undefined
    if (!options.storage) return
    try {
      await options.storage.remove(options.storageKey)
    } catch (cause) {
      error.value = cause
    }
  }

  watch(
    schemaColumns,
    (columns) => {
      state.value = normalizeState(columns, state.value)
    },
    { deep: true },
  )

  if (options.immediate ?? true) void hydrate()

  return {
    state,
    orderedColumns,
    visibleColumns,
    configurableColumns,
    ready,
    saving,
    error,
    isVisible,
    canHide,
    canMove,
    setVisible,
    move,
    setOrder,
    hasCustomWidth,
    setWidth,
    resetWidth,
    hydrate,
    reset,
  }
}
