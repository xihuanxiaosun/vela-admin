import type { PaginationRequest } from './pagination'
import type { DataPage, PaginationMeta } from './pagination'

export type SortDirection = 'asc' | 'desc'

export interface SortDescriptor<TKey extends string = string> {
  readonly key: TKey
  readonly direction: SortDirection
}

export type QueryPrimitive = string | number | boolean | null
export type QueryValue = QueryPrimitive | readonly QueryPrimitive[]
export type QueryFilters = Readonly<Record<string, QueryValue | undefined>>

export interface DataQuery<
  TFilters extends QueryFilters = QueryFilters,
  TSortKey extends string = string,
> {
  readonly filters: TFilters
  readonly pagination: PaginationRequest
  readonly sort: readonly SortDescriptor<TSortKey>[]
  readonly search?: string
}

export interface DataSourceContext {
  readonly signal: AbortSignal
  readonly requestId: number
}

export interface DataSource<
  TItem,
  TFilters extends QueryFilters = QueryFilters,
  TSortKey extends string = string,
  TMeta extends PaginationMeta = PaginationMeta,
> {
  load(
    query: DataQuery<TFilters, TSortKey>,
    context: DataSourceContext,
  ): Promise<DataPage<TItem, TMeta>>
}

export type SetStateAction<T> = T | ((current: T) => T)
