import { describe, expect, it } from 'vitest'

import {
  createCursorPagination,
  createOffsetPagination,
  createPagePagination,
  createNormalizedError,
  errorState,
  hasAsyncData,
  idleState,
  isCancelledError,
  loadingState,
  readAsyncData,
  refreshingState,
  successState,
} from './index'

describe('pagination contracts', () => {
  it('creates valid pagination requests', () => {
    expect(createPagePagination()).toEqual({ mode: 'page', page: 1, pageSize: 25 })
    expect(createOffsetPagination()).toEqual({ mode: 'offset', offset: 0, limit: 25 })
    expect(createCursorPagination(50, 'next')).toEqual({
      mode: 'cursor',
      cursor: 'next',
      limit: 50,
      direction: 'forward',
    })
  })

  it('rejects invalid pagination values', () => {
    expect(() => createPagePagination(0)).toThrow(RangeError)
    expect(() => createPagePagination(1, 0)).toThrow(RangeError)
    expect(() => createPagePagination(1.5, 10)).toThrow(RangeError)
    expect(() => createOffsetPagination(-1)).toThrow(RangeError)
    expect(() => createOffsetPagination(0, 0)).toThrow(RangeError)
    expect(() => createOffsetPagination(0.5, 10)).toThrow(RangeError)
    expect(() => createCursorPagination(0)).toThrow(RangeError)
    expect(() => createCursorPagination(1.5)).toThrow(RangeError)
    expect(createCursorPagination(10)).toEqual({ mode: 'cursor', limit: 10 })
  })
})

describe('async state contracts', () => {
  it('retains data while refreshing and after a recoverable failure', () => {
    const success = successState(['row'], 10)
    const refreshing = refreshingState(success, 20)
    const error = createNormalizedError({
      kind: 'network',
      message: 'Offline',
      retryable: true,
    })
    const failed = errorState(error, 30, refreshing.data)

    expect(hasAsyncData(refreshing)).toBe(true)
    expect(hasAsyncData(failed)).toBe(true)
    expect(readAsyncData(failed)).toEqual(['row'])
  })

  it('represents idle, loading, and terminal failures without stale data', () => {
    const idle = idleState()
    const loading = loadingState(10)
    const error = createNormalizedError({
      kind: 'cancelled',
      message: 'Stopped',
      retryable: false,
    })
    const failed = errorState(error, 20)

    expect(hasAsyncData(idle)).toBe(false)
    expect(hasAsyncData(loading)).toBe(false)
    expect(hasAsyncData(failed)).toBe(false)
    expect(readAsyncData(idle)).toBeUndefined()
    expect(readAsyncData(loading)).toBeUndefined()
    expect(readAsyncData(failed)).toBeUndefined()
    expect(isCancelledError(error)).toBe(true)
    expect(isCancelledError({ ...error, kind: 'network' })).toBe(false)
    expect(Object.isFrozen(error)).toBe(true)
  })
})
