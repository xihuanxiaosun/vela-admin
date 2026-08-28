import { onScopeDispose, shallowReadonly, shallowRef, type Ref } from 'vue'
import type {
  DataQuery,
  PaginationRequest,
  QueryFilters,
  SortDescriptor,
  StateSyncAdapter,
  StateSyncWriteOptions,
} from '@vela-admin/contracts'

export interface UseDataQueryStateOptions<TFilters extends QueryFilters, TSortKey extends string> {
  readonly initialQuery: DataQuery<TFilters, TSortKey>
  readonly sync?: StateSyncAdapter<DataQuery<TFilters, TSortKey>>
  readonly immediate?: boolean
  readonly clone?: (query: DataQuery<TFilters, TSortKey>) => DataQuery<TFilters, TSortKey>
  readonly normalize?: (query: DataQuery<TFilters, TSortKey>) => DataQuery<TFilters, TSortKey>
}

export interface DataQueryStateController<TFilters extends QueryFilters, TSortKey extends string> {
  readonly query: Readonly<Ref<DataQuery<TFilters, TSortKey>>>
  readonly ready: Readonly<Ref<boolean>>
  readonly syncing: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<unknown>>
  readonly replace: (query: DataQuery<TFilters, TSortKey>, options?: StateSyncWriteOptions) => void
  readonly setFilters: (filters: TFilters, options?: StateSyncWriteOptions) => void
  readonly setSearch: (search: string | undefined, options?: StateSyncWriteOptions) => void
  readonly setSort: (
    sort: readonly SortDescriptor<TSortKey>[],
    options?: StateSyncWriteOptions,
  ) => void
  readonly paginate: (pagination: PaginationRequest, options?: StateSyncWriteOptions) => void
  readonly reset: (options?: StateSyncWriteOptions) => void
  readonly hydrate: () => Promise<void>
  readonly flush: () => Promise<void>
}

function firstPaginationPage(pagination: PaginationRequest): PaginationRequest {
  if (pagination.mode === 'page') return { ...pagination, page: 1 }
  if (pagination.mode === 'offset') return { ...pagination, offset: 0 }
  return { mode: 'cursor', limit: pagination.limit }
}

/** Owns filter/sort/pagination transitions and optionally synchronizes a shareable external state. */
export function useDataQueryState<
  TFilters extends QueryFilters = QueryFilters,
  TSortKey extends string = string,
>(
  options: UseDataQueryStateOptions<TFilters, TSortKey>,
): DataQueryStateController<TFilters, TSortKey> {
  const clone = options.clone ?? ((value: DataQuery<TFilters, TSortKey>) => structuredClone(value))
  const normalize = options.normalize ?? ((value) => value)
  const initialQuery = normalize(clone(options.initialQuery))
  const query = shallowRef<DataQuery<TFilters, TSortKey>>(clone(initialQuery))
  const ready = shallowRef(!options.sync)
  const syncing = shallowRef(false)
  const error = shallowRef<unknown>()
  let writeRevision = 0
  let writeQueue: Promise<void> = Promise.resolve()
  let stopSync: (() => void) | undefined

  const applyExternal = (value: DataQuery<TFilters, TSortKey> | undefined): void => {
    if (!value) return
    query.value = normalize(clone(value))
  }

  const persist = (
    value: DataQuery<TFilters, TSortKey>,
    writeOptions?: StateSyncWriteOptions,
  ): void => {
    if (!options.sync || !ready.value) return
    const revision = ++writeRevision
    const snapshot = clone(value)
    syncing.value = true
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(() => options.sync?.write(snapshot, writeOptions))
      .then(() => {
        if (revision === writeRevision) error.value = undefined
      })
      .catch((cause) => {
        if (revision === writeRevision) error.value = cause
      })
      .finally(() => {
        if (revision === writeRevision) syncing.value = false
      })
  }

  const replace = (
    value: DataQuery<TFilters, TSortKey>,
    writeOptions?: StateSyncWriteOptions,
  ): void => {
    query.value = normalize(clone(value))
    persist(query.value, writeOptions)
  }

  const hydrate = async (): Promise<void> => {
    if (!options.sync) {
      ready.value = true
      return
    }
    syncing.value = true
    try {
      applyExternal(await options.sync.read())
      error.value = undefined
      stopSync ??= options.sync.subscribe?.(applyExternal)
    } catch (cause) {
      error.value = cause
    } finally {
      syncing.value = false
      ready.value = true
    }
  }

  onScopeDispose(() => stopSync?.(), true)
  if (options.immediate ?? true) void hydrate()

  const replaceSearch = (
    search: string | undefined,
    writeOptions?: StateSyncWriteOptions,
  ): void => {
    const pagination = firstPaginationPage(query.value.pagination)
    if (search !== undefined && search !== '') {
      replace({ ...query.value, search, pagination }, writeOptions)
      return
    }
    const withoutSearch = { ...query.value }
    delete withoutSearch.search
    replace({ ...withoutSearch, pagination }, writeOptions)
  }

  return {
    query: shallowReadonly(query),
    ready: shallowReadonly(ready),
    syncing: shallowReadonly(syncing),
    error: shallowReadonly(error),
    replace,
    setFilters: (filters, writeOptions) =>
      replace(
        {
          ...query.value,
          filters,
          pagination: firstPaginationPage(query.value.pagination),
        },
        writeOptions,
      ),
    setSearch: replaceSearch,
    setSort: (sort, writeOptions) =>
      replace(
        {
          ...query.value,
          sort: [...sort],
          pagination: firstPaginationPage(query.value.pagination),
        },
        writeOptions,
      ),
    paginate: (pagination, writeOptions) => replace({ ...query.value, pagination }, writeOptions),
    reset: (writeOptions) => replace(initialQuery, writeOptions),
    hydrate,
    flush: () => writeQueue,
  }
}
