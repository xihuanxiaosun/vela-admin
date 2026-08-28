import type {
  CursorPagination,
  OffsetPagination,
  PagePagination,
  PaginationMeta,
  PaginationRequest,
} from '@vela-admin/contracts'

export interface PaginationDisplay {
  readonly mode: PaginationMeta['mode']
  readonly pageSize: number
  readonly itemCount: number
  readonly start?: number
  readonly end?: number
  readonly total?: number
  readonly page?: number
  readonly pageCount?: number
  readonly canPrevious: boolean
  readonly canNext: boolean
}

function safeItemCount(itemCount: number): number {
  return Number.isInteger(itemCount) && itemCount > 0 ? itemCount : 0
}

export function resolvePaginationDisplay(
  pagination: PaginationMeta,
  itemCount: number,
): PaginationDisplay {
  const count = safeItemCount(itemCount)

  if (pagination.mode === 'page') {
    const total = Math.max(0, pagination.total)
    const start = count === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
    return {
      mode: 'page',
      pageSize: pagination.pageSize,
      itemCount: count,
      start,
      end: count === 0 ? 0 : Math.min(start + count - 1, total),
      total,
      page: pagination.page,
      pageCount: Math.max(1, pagination.pageCount),
      canPrevious: pagination.page > 1,
      canNext: pagination.page < pagination.pageCount,
    }
  }

  if (pagination.mode === 'offset') {
    const start = count === 0 ? 0 : pagination.offset + 1
    return {
      mode: 'offset',
      pageSize: pagination.limit,
      itemCount: count,
      start,
      end: count === 0 ? 0 : pagination.offset + count,
      ...(pagination.total === undefined ? {} : { total: Math.max(0, pagination.total) }),
      canPrevious: pagination.offset > 0,
      canNext: pagination.hasMore,
    }
  }

  return {
    mode: 'cursor',
    pageSize: pagination.limit,
    itemCount: count,
    canPrevious: pagination.hasPrevious && pagination.previousCursor !== undefined,
    canNext: pagination.hasNext && pagination.nextCursor !== undefined,
  }
}

export function formatPaginationRange(display: PaginationDisplay): string {
  if (display.mode === 'cursor') {
    return `${display.itemCount} ${display.itemCount === 1 ? 'row' : 'rows'}`
  }
  const range = `${display.start ?? 0}–${display.end ?? 0}`
  return display.total === undefined ? range : `${range} of ${display.total}`
}

export function changePaginationPageSize(
  pagination: PaginationMeta,
  pageSize: number,
): PaginationRequest {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('pageSize must be an integer >= 1')
  }
  if (pagination.mode === 'page') return { mode: 'page', page: 1, pageSize }
  if (pagination.mode === 'offset') return { mode: 'offset', offset: 0, limit: pageSize }
  return { mode: 'cursor', limit: pageSize }
}

export function changePage(pagination: PaginationMeta, page: number): PagePagination {
  if (pagination.mode !== 'page') throw new TypeError('Page navigation requires page pagination')
  if (!Number.isInteger(page) || page < 1) throw new RangeError('page must be an integer >= 1')
  return { mode: 'page', page, pageSize: pagination.pageSize }
}

export function normalizePaginationJump(
  value: string | number,
  pageCount: number,
): number | undefined {
  const normalized = typeof value === 'string' ? value.trim() : value
  if (normalized === '') return undefined
  const requested = typeof normalized === 'number' ? normalized : Number(normalized)
  if (!Number.isInteger(requested)) return undefined
  const maximum = Number.isInteger(pageCount) && pageCount > 0 ? pageCount : 1
  return Math.min(maximum, Math.max(1, requested))
}

export function previousPagination(pagination: PaginationMeta): PaginationRequest | undefined {
  if (pagination.mode === 'page') {
    return pagination.page > 1
      ? { mode: 'page', page: pagination.page - 1, pageSize: pagination.pageSize }
      : undefined
  }
  if (pagination.mode === 'offset') {
    if (pagination.offset <= 0) return undefined
    const request: OffsetPagination = {
      mode: 'offset',
      offset: Math.max(0, pagination.offset - pagination.limit),
      limit: pagination.limit,
    }
    return request
  }
  if (!pagination.hasPrevious || pagination.previousCursor === undefined) return undefined
  const request: CursorPagination = {
    mode: 'cursor',
    cursor: pagination.previousCursor,
    limit: pagination.limit,
    direction: 'backward',
  }
  return request
}

export function nextPagination(pagination: PaginationMeta): PaginationRequest | undefined {
  if (pagination.mode === 'page') {
    return pagination.page < pagination.pageCount
      ? { mode: 'page', page: pagination.page + 1, pageSize: pagination.pageSize }
      : undefined
  }
  if (pagination.mode === 'offset') {
    if (!pagination.hasMore) return undefined
    const request: OffsetPagination = {
      mode: 'offset',
      offset: pagination.offset + pagination.limit,
      limit: pagination.limit,
    }
    return request
  }
  if (!pagination.hasNext || pagination.nextCursor === undefined) return undefined
  const request: CursorPagination = {
    mode: 'cursor',
    cursor: pagination.nextCursor,
    limit: pagination.limit,
    direction: 'forward',
  }
  return request
}
