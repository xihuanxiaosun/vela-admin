import type {
  DataQuery,
  PaginationRequest,
  QueryFilters,
  QueryValue,
  SortDescriptor,
} from '@vela-admin/contracts'

export type QueryFilterParamType = 'string' | 'number' | 'boolean' | 'string-array' | 'number-array'

export interface QueryFilterParam {
  readonly type: QueryFilterParamType
  readonly param?: string
}

export interface DataQuerySearchParamsOptions<
  TFilters extends QueryFilters,
  TSortKey extends string,
> {
  readonly defaults: DataQuery<TFilters, TSortKey>
  readonly filters: Readonly<Partial<Record<keyof TFilters & string, QueryFilterParam>>>
  readonly prefix?: string
  readonly searchParam?: string
  readonly sortParam?: string
  readonly paginationPrefix?: string
  readonly allowedSortKeys?: readonly TSortKey[]
}

export interface DataQuerySearchParamsCodec<
  TFilters extends QueryFilters,
  TSortKey extends string,
> {
  readonly decode: (parameters: URLSearchParams) => DataQuery<TFilters, TSortKey> | undefined
  readonly encode: (
    query: DataQuery<TFilters, TSortKey>,
    current?: URLSearchParams,
  ) => URLSearchParams
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return undefined
}

function parseFilter(parameters: URLSearchParams, name: string, type: QueryFilterParamType) {
  const values = parameters.getAll(name)
  if (values.length === 0) return undefined
  if (type === 'string') return values.at(-1) ?? undefined
  if (type === 'number') {
    const number = Number(values.at(-1))
    return Number.isFinite(number) ? number : undefined
  }
  if (type === 'boolean') return parseBoolean(values.at(-1) ?? null)
  if (type === 'number-array') {
    const numbers = values.map(Number).filter(Number.isFinite)
    return numbers.length > 0 ? numbers : undefined
  }
  return values
}

function appendFilter(parameters: URLSearchParams, name: string, value: QueryValue | undefined) {
  if (value === undefined || value === null || value === '') return
  const values = Array.isArray(value) ? value : [value]
  for (const item of values)
    parameters.append(name, item === true ? '1' : item === false ? '0' : `${item}`)
}

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function nonNegativeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

/** Typed URL codec for filter, sort and all three supported pagination modes. */
export function createDataQuerySearchParamsCodec<
  TFilters extends QueryFilters,
  TSortKey extends string,
>(
  options: DataQuerySearchParamsOptions<TFilters, TSortKey>,
): DataQuerySearchParamsCodec<TFilters, TSortKey> {
  const prefix = options.prefix ?? 'filter.'
  const searchParam = options.searchParam ?? 'q'
  const sortParam = options.sortParam ?? 'sort'
  const paginationPrefix = options.paginationPrefix ?? 'p.'
  const paginationKeys = {
    mode: `${paginationPrefix}mode`,
    page: `${paginationPrefix}page`,
    pageSize: `${paginationPrefix}pageSize`,
    offset: `${paginationPrefix}offset`,
    limit: `${paginationPrefix}limit`,
    cursor: `${paginationPrefix}cursor`,
    direction: `${paginationPrefix}direction`,
  }
  const filterEntries = Object.entries(options.filters) as [string, QueryFilterParam][]
  const filterName = (key: string, definition: QueryFilterParam) =>
    definition.param ?? `${prefix}${key}`
  const managed = new Set([
    searchParam,
    sortParam,
    ...Object.values(paginationKeys),
    ...filterEntries.map(([key, definition]) => filterName(key, definition)),
  ])
  const allowedSort = options.allowedSortKeys ? new Set<string>(options.allowedSortKeys) : undefined

  const decodePagination = (parameters: URLSearchParams): PaginationRequest => {
    const fallback = options.defaults.pagination
    const mode = parameters.get(paginationKeys.mode) ?? fallback.mode
    if (mode === 'page') {
      const defaultPage = fallback.mode === 'page' ? fallback.page : 1
      const defaultSize = fallback.mode === 'page' ? fallback.pageSize : 25
      return {
        mode: 'page',
        page: positiveInteger(parameters.get(paginationKeys.page), defaultPage),
        pageSize: positiveInteger(parameters.get(paginationKeys.pageSize), defaultSize),
      }
    }
    if (mode === 'offset') {
      const defaultOffset = fallback.mode === 'offset' ? fallback.offset : 0
      const defaultLimit = fallback.mode === 'offset' ? fallback.limit : 25
      return {
        mode: 'offset',
        offset: nonNegativeInteger(parameters.get(paginationKeys.offset), defaultOffset),
        limit: positiveInteger(parameters.get(paginationKeys.limit), defaultLimit),
      }
    }
    const defaultLimit = fallback.mode === 'cursor' ? fallback.limit : 25
    const cursor = parameters.get(paginationKeys.cursor) ?? undefined
    const direction = parameters.get(paginationKeys.direction)
    return {
      mode: 'cursor',
      limit: positiveInteger(parameters.get(paginationKeys.limit), defaultLimit),
      ...(cursor ? { cursor } : {}),
      ...(direction === 'forward' || direction === 'backward' ? { direction } : {}),
    }
  }

  return {
    decode(parameters) {
      if (![...managed].some((key) => parameters.has(key))) return undefined
      const filters: Record<string, QueryValue | undefined> = { ...options.defaults.filters }
      for (const [key, definition] of filterEntries) {
        filters[key] = parseFilter(parameters, filterName(key, definition), definition.type)
      }
      const sort: SortDescriptor<TSortKey>[] = []
      for (const value of parameters.getAll(sortParam)) {
        const separator = value.lastIndexOf(':')
        const key = (separator < 0 ? value : value.slice(0, separator)) as TSortKey
        const direction = separator < 0 ? 'asc' : value.slice(separator + 1)
        if (
          (!allowedSort || allowedSort.has(key)) &&
          (direction === 'asc' || direction === 'desc')
        ) {
          sort.push({ key, direction })
        }
      }
      const search = parameters.get(searchParam) ?? undefined
      return {
        filters: filters as TFilters,
        pagination: decodePagination(parameters),
        sort: sort.length > 0 ? sort : options.defaults.sort,
        ...(search ? { search } : {}),
      }
    },
    encode(query, current = new URLSearchParams()) {
      const parameters = new URLSearchParams(current)
      for (const key of managed) parameters.delete(key)
      for (const [key, definition] of filterEntries) {
        appendFilter(parameters, filterName(key, definition), query.filters[key])
      }
      if (query.search) parameters.set(searchParam, query.search)
      for (const descriptor of query.sort) {
        parameters.append(sortParam, `${descriptor.key}:${descriptor.direction}`)
      }
      parameters.set(paginationKeys.mode, query.pagination.mode)
      if (query.pagination.mode === 'page') {
        parameters.set(paginationKeys.page, `${query.pagination.page}`)
        parameters.set(paginationKeys.pageSize, `${query.pagination.pageSize}`)
      } else if (query.pagination.mode === 'offset') {
        parameters.set(paginationKeys.offset, `${query.pagination.offset}`)
        parameters.set(paginationKeys.limit, `${query.pagination.limit}`)
      } else {
        parameters.set(paginationKeys.limit, `${query.pagination.limit}`)
        if (query.pagination.cursor) parameters.set(paginationKeys.cursor, query.pagination.cursor)
        if (query.pagination.direction) {
          parameters.set(paginationKeys.direction, query.pagination.direction)
        }
      }
      return parameters
    },
  }
}
