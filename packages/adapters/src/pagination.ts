import type {
  CursorPagination,
  CursorPaginationMeta,
  DataPage,
  OffsetPagination,
  OffsetPaginationMeta,
  PagePagination,
  PagePaginationMeta,
} from '@vela-admin/contracts'

import { selectValue, type ValueSelector } from './path'

export type EncodedQueryValue = string | number | boolean | readonly (string | number | boolean)[]
export type EncodedQuery = Readonly<Record<string, EncodedQueryValue | undefined>>

export interface PageParameterNames {
  readonly page?: string
  readonly pageSize?: string
}

export interface OffsetParameterNames {
  readonly offset?: string
  readonly limit?: string
}

export interface CursorParameterNames {
  readonly cursor?: string
  readonly limit?: string
  readonly direction?: string
}

export function encodePagePagination(
  pagination: PagePagination,
  names: PageParameterNames = {},
): EncodedQuery {
  return {
    [names.page ?? 'page']: pagination.page,
    [names.pageSize ?? 'limit']: pagination.pageSize,
  }
}

export function encodeOffsetPagination(
  pagination: OffsetPagination,
  names: OffsetParameterNames = {},
): EncodedQuery {
  return {
    [names.offset ?? 'offset']: pagination.offset,
    [names.limit ?? 'limit']: pagination.limit,
  }
}

export function encodeCursorPagination(
  pagination: CursorPagination,
  names: CursorParameterNames = {},
): EncodedQuery {
  return {
    [names.cursor ?? 'cursor']: pagination.cursor,
    [names.limit ?? 'limit']: pagination.limit,
    [names.direction ?? 'direction']: pagination.direction,
  }
}

interface BaseResponseAdapterOptions<TResponse, TItem> {
  readonly items: ValueSelector<TResponse, readonly TItem[]>
}

export interface PageResponseAdapterOptions<TResponse, TItem> extends BaseResponseAdapterOptions<
  TResponse,
  TItem
> {
  readonly total: ValueSelector<TResponse, number>
  readonly page?: ValueSelector<TResponse, number>
  readonly pageSize?: ValueSelector<TResponse, number>
}

export interface OffsetResponseAdapterOptions<TResponse, TItem> extends BaseResponseAdapterOptions<
  TResponse,
  TItem
> {
  readonly total?: ValueSelector<TResponse, number | undefined>
  readonly hasMore?: ValueSelector<TResponse, boolean>
}

export interface CursorResponseAdapterOptions<TResponse, TItem> extends BaseResponseAdapterOptions<
  TResponse,
  TItem
> {
  readonly nextCursor?: ValueSelector<TResponse, string | undefined>
  readonly previousCursor?: ValueSelector<TResponse, string | undefined>
  readonly hasNext?: ValueSelector<TResponse, boolean>
  readonly hasPrevious?: ValueSelector<TResponse, boolean>
}

function assertItems<TItem>(items: readonly TItem[] | undefined): readonly TItem[] {
  const candidate: unknown = items
  if (!Array.isArray(candidate))
    throw new TypeError('The configured items selector did not return an array')
  return candidate as readonly TItem[]
}

function assertCount(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`The configured ${label} selector did not return a non-negative number`)
  }
  return value
}

export function createPageResponseAdapter<TResponse, TItem>(
  options: PageResponseAdapterOptions<TResponse, TItem>,
): (response: TResponse, request: PagePagination) => DataPage<TItem, PagePaginationMeta> {
  return (response, request) => {
    const items = assertItems(selectValue(response, options.items))
    const total = assertCount(selectValue(response, options.total), 'total')
    const page = options.page
      ? assertCount(selectValue(response, options.page), 'page')
      : request.page
    const pageSize = options.pageSize
      ? assertCount(selectValue(response, options.pageSize), 'pageSize')
      : request.pageSize

    return {
      items,
      pagination: {
        mode: 'page',
        page,
        pageSize,
        total,
        pageCount: pageSize === 0 ? 0 : Math.ceil(total / pageSize),
      },
    }
  }
}

export function createOffsetResponseAdapter<TResponse, TItem>(
  options: OffsetResponseAdapterOptions<TResponse, TItem>,
): (response: TResponse, request: OffsetPagination) => DataPage<TItem, OffsetPaginationMeta> {
  return (response, request) => {
    const items = assertItems(selectValue(response, options.items))
    const total = options.total ? selectValue(response, options.total) : undefined
    const hasMore = options.hasMore
      ? selectValue(response, options.hasMore)
      : total === undefined
        ? items.length === request.limit
        : request.offset + items.length < total
    const pagination: OffsetPaginationMeta = {
      mode: 'offset',
      offset: request.offset,
      limit: request.limit,
      hasMore,
      ...(total === undefined ? {} : { total: assertCount(total, 'total') }),
    }

    return { items, pagination }
  }
}

export function createCursorResponseAdapter<TResponse, TItem>(
  options: CursorResponseAdapterOptions<TResponse, TItem>,
): (response: TResponse, request: CursorPagination) => DataPage<TItem, CursorPaginationMeta> {
  return (response, request) => {
    const items = assertItems(selectValue(response, options.items))
    const nextCursor = options.nextCursor ? selectValue(response, options.nextCursor) : undefined
    const previousCursor = options.previousCursor
      ? selectValue(response, options.previousCursor)
      : undefined
    const pagination: CursorPaginationMeta = {
      mode: 'cursor',
      limit: request.limit,
      hasNext: options.hasNext ? selectValue(response, options.hasNext) : nextCursor !== undefined,
      hasPrevious: options.hasPrevious
        ? selectValue(response, options.hasPrevious)
        : previousCursor !== undefined,
      ...(nextCursor === undefined ? {} : { nextCursor }),
      ...(previousCursor === undefined ? {} : { previousCursor }),
    }

    return { items, pagination }
  }
}
