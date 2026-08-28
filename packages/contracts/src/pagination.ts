export interface PagePagination {
  readonly mode: 'page'
  readonly page: number
  readonly pageSize: number
}

export interface OffsetPagination {
  readonly mode: 'offset'
  readonly offset: number
  readonly limit: number
}

export interface CursorPagination {
  readonly mode: 'cursor'
  readonly cursor?: string
  readonly limit: number
  readonly direction?: 'forward' | 'backward'
}

export type PaginationRequest = PagePagination | OffsetPagination | CursorPagination

export interface PagePaginationMeta {
  readonly mode: 'page'
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly pageCount: number
}

export interface OffsetPaginationMeta {
  readonly mode: 'offset'
  readonly offset: number
  readonly limit: number
  readonly total?: number
  readonly hasMore: boolean
}

export interface CursorPaginationMeta {
  readonly mode: 'cursor'
  readonly limit: number
  readonly nextCursor?: string
  readonly previousCursor?: string
  readonly hasNext: boolean
  readonly hasPrevious: boolean
}

export type PaginationMeta = PagePaginationMeta | OffsetPaginationMeta | CursorPaginationMeta

export interface DataPage<TItem, TMeta extends PaginationMeta = PaginationMeta> {
  readonly items: readonly TItem[]
  readonly pagination: TMeta
}

export function createPagePagination(page = 1, pageSize = 25): PagePagination {
  if (!Number.isInteger(page) || page < 1) throw new RangeError('page must be an integer >= 1')
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('pageSize must be an integer >= 1')
  }
  return { mode: 'page', page, pageSize }
}

export function createOffsetPagination(offset = 0, limit = 25): OffsetPagination {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError('offset must be an integer >= 0')
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('limit must be an integer >= 1')
  }
  return { mode: 'offset', offset, limit }
}

export function createCursorPagination(limit = 25, cursor?: string): CursorPagination {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('limit must be an integer >= 1')
  }
  return cursor === undefined
    ? { mode: 'cursor', limit }
    : { mode: 'cursor', cursor, limit, direction: 'forward' }
}
