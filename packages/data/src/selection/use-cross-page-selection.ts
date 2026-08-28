import {
  computed,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

export type SelectionKey = string | number
export type PageSelectionState = 'none' | 'some' | 'all'

export type SelectionSnapshot<TKey extends SelectionKey> =
  | { readonly mode: 'explicit'; readonly keys: readonly TKey[] }
  | { readonly mode: 'all'; readonly except: readonly TKey[]; readonly total: number }

export interface UseCrossPageSelectionOptions {
  /** A filter/sort fingerprint. Pagination should not be part of this scope. */
  readonly scope?: MaybeRefOrGetter<unknown>
  readonly clearOnScopeChange?: boolean
}

export interface CrossPageSelectionController<TKey extends SelectionKey> {
  readonly mode: Readonly<Ref<'explicit' | 'all'>>
  readonly includedKeys: Readonly<Ref<ReadonlySet<TKey>>>
  readonly excludedKeys: Readonly<Ref<ReadonlySet<TKey>>>
  readonly matchingTotal: Readonly<Ref<number>>
  readonly selectedCount: ComputedRef<number>
  readonly hasSelection: ComputedRef<boolean>
  readonly isSelected: (key: TKey) => boolean
  readonly pageState: (keys: readonly TKey[]) => PageSelectionState
  readonly setSelected: (key: TKey, selected: boolean) => void
  readonly togglePage: (keys: readonly TKey[], selected: boolean) => void
  readonly selectAllMatching: (total: number) => void
  readonly clear: () => void
  readonly snapshot: () => SelectionSnapshot<TKey>
}

/**
 * Represents cross-page selection without materializing every matching key.
 * In `all` mode only explicit exclusions are retained.
 */
export function useCrossPageSelection<TKey extends SelectionKey = SelectionKey>(
  options: UseCrossPageSelectionOptions = {},
): CrossPageSelectionController<TKey> {
  const mode = shallowRef<'explicit' | 'all'>('explicit')
  const includedKeys = shallowRef<ReadonlySet<TKey>>(new Set())
  const excludedKeys = shallowRef<ReadonlySet<TKey>>(new Set())
  const matchingTotal = shallowRef(0)

  const clear = (): void => {
    mode.value = 'explicit'
    includedKeys.value = new Set()
    excludedKeys.value = new Set()
    matchingTotal.value = 0
  }

  const isSelected = (key: TKey): boolean =>
    mode.value === 'all' ? !excludedKeys.value.has(key) : includedKeys.value.has(key)

  const setSelected = (key: TKey, selected: boolean): void => {
    if (mode.value === 'all') {
      const next = new Set(excludedKeys.value)
      if (selected) next.delete(key)
      else next.add(key)
      excludedKeys.value = next
      return
    }
    const next = new Set(includedKeys.value)
    if (selected) next.add(key)
    else next.delete(key)
    includedKeys.value = next
  }

  const togglePage = (keys: readonly TKey[], selected: boolean): void => {
    if (keys.length === 0) return
    if (mode.value === 'all') {
      const next = new Set(excludedKeys.value)
      for (const key of keys) {
        if (selected) next.delete(key)
        else next.add(key)
      }
      excludedKeys.value = next
      return
    }
    const next = new Set(includedKeys.value)
    for (const key of keys) {
      if (selected) next.add(key)
      else next.delete(key)
    }
    includedKeys.value = next
  }

  const pageState = (keys: readonly TKey[]): PageSelectionState => {
    if (keys.length === 0) return 'none'
    const selected = keys.filter(isSelected).length
    if (selected === 0) return 'none'
    return selected === keys.length ? 'all' : 'some'
  }

  const selectAllMatching = (total: number): void => {
    if (!Number.isInteger(total) || total < 0) {
      throw new RangeError('total must be a non-negative integer')
    }
    mode.value = 'all'
    matchingTotal.value = total
    includedKeys.value = new Set()
    excludedKeys.value = new Set()
  }

  if (options.scope !== undefined) {
    watch(
      () => toValue(options.scope),
      () => {
        if (options.clearOnScopeChange ?? true) clear()
      },
      { deep: true },
    )
  }

  return {
    mode,
    includedKeys,
    excludedKeys,
    matchingTotal,
    selectedCount: computed(() =>
      mode.value === 'all'
        ? Math.max(0, matchingTotal.value - excludedKeys.value.size)
        : includedKeys.value.size,
    ),
    hasSelection: computed(() =>
      mode.value === 'all'
        ? matchingTotal.value > excludedKeys.value.size
        : includedKeys.value.size > 0,
    ),
    isSelected,
    pageState,
    setSelected,
    togglePage,
    selectAllMatching,
    clear,
    snapshot: () =>
      mode.value === 'all'
        ? { mode: 'all', except: [...excludedKeys.value], total: matchingTotal.value }
        : { mode: 'explicit', keys: [...includedKeys.value] },
  }
}
