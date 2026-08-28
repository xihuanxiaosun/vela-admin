import { describe, expect, it, vi } from 'vitest'

import {
  createAuthenticatedTransport,
  createFetchTransport,
  createCursorResponseAdapter,
  createOffsetResponseAdapter,
  createPageResponseAdapter,
  createUrlStateAdapter,
  createWebStorageAdapter,
  encodeCursorPagination,
  encodeOffsetPagination,
  encodePagePagination,
  readPath,
  selectValue,
  serializeFilters,
  serializeSort,
  TransportFailure,
} from './index'

import type { AuthSnapshot, TransportRequest, TransportResponse } from '@vela-admin/contracts'

function createTransportMock(
  handler: (request: TransportRequest) => Promise<TransportResponse<unknown>>,
) {
  const request = vi.fn(handler)
  return {
    request,
    transport: {
      async request<TData, TBody>(input: TransportRequest<TBody>) {
        return (await request(input)) as TransportResponse<TData>
      },
    },
  }
}

describe('object paths', () => {
  it('reads dot and array paths without evaluating input', () => {
    expect(readPath({ data: { records: [{ id: 7 }] } }, 'data.records[0].id')).toBe(7)
    expect(readPath({}, '__proto__.polluted')).toBeUndefined()
    expect(readPath({ data: null }, 'data.value')).toBeUndefined()
    expect(selectValue({ count: 3 }, (source) => source.count)).toBe(3)
  })
})

describe('pagination adapters', () => {
  it('encodes configurable page parameter names', () => {
    expect(
      encodePagePagination({ mode: 'page', page: 3, pageSize: 50 }, { pageSize: 'pageSize' }),
    ).toEqual({ page: 3, pageSize: 50 })
    expect(encodeOffsetPagination({ mode: 'offset', offset: 10, limit: 5 })).toEqual({
      offset: 10,
      limit: 5,
    })
    expect(
      encodeCursorPagination(
        { mode: 'cursor', cursor: 'next', limit: 12, direction: 'backward' },
        { cursor: 'after', limit: 'size', direction: 'move' },
      ),
    ).toEqual({ after: 'next', size: 12, move: 'backward' })
  })

  it('parses nested page responses', () => {
    const parse = createPageResponseAdapter<
      { data: { list: { id: number }[]; total: number } },
      { id: number }
    >({
      items: 'data.list',
      total: 'data.total',
    })
    const page = parse(
      { data: { list: [{ id: 1 }], total: 41 } },
      { mode: 'page', page: 2, pageSize: 20 },
    )

    expect(page.pagination).toEqual({
      mode: 'page',
      page: 2,
      pageSize: 20,
      total: 41,
      pageCount: 3,
    })
  })

  it('parses cursor responses through selectors', () => {
    const parse = createCursorResponseAdapter<{ records: string[]; next?: string }, string>({
      items: (source) => source.records,
      nextCursor: (source) => source.next,
    })
    expect(
      parse({ records: ['a'], next: 'b' }, { mode: 'cursor', limit: 10 }).pagination,
    ).toMatchObject({
      hasNext: true,
      nextCursor: 'b',
    })
  })

  it('derives offset and cursor metadata when optional selectors are absent', () => {
    const offset = createOffsetResponseAdapter<{ items: string[] }, string>({ items: 'items' })
    const cursor = createCursorResponseAdapter<{ items: string[] }, string>({ items: 'items' })

    expect(offset({ items: ['a', 'b'] }, { mode: 'offset', offset: 2, limit: 2 })).toEqual({
      items: ['a', 'b'],
      pagination: { mode: 'offset', offset: 2, limit: 2, hasMore: true },
    })
    expect(cursor({ items: [] }, { mode: 'cursor', limit: 10 }).pagination).toEqual({
      mode: 'cursor',
      limit: 10,
      hasNext: false,
      hasPrevious: false,
    })
  })

  it('honors response pagination selectors and rejects malformed response shapes', () => {
    const page = createPageResponseAdapter<
      { rows: string[]; total: number; page: number; size: number },
      string
    >({ items: 'rows', total: 'total', page: 'page', pageSize: 'size' })
    const offset = createOffsetResponseAdapter<
      { rows: string[]; total: number; more: boolean },
      string
    >({ items: 'rows', total: 'total', hasMore: 'more' })

    expect(
      page({ rows: ['a'], total: 0, page: 0, size: 0 }, { mode: 'page', page: 1, pageSize: 25 })
        .pagination,
    ).toEqual({ mode: 'page', page: 0, pageSize: 0, total: 0, pageCount: 0 })
    expect(
      offset({ rows: ['a'], total: 20, more: false }, { mode: 'offset', offset: 10, limit: 10 })
        .pagination,
    ).toEqual({ mode: 'offset', offset: 10, limit: 10, hasMore: false, total: 20 })
    expect(() =>
      page(
        { rows: null as unknown as string[], total: 0, page: 1, size: 10 },
        { mode: 'page', page: 1, pageSize: 10 },
      ),
    ).toThrow(TypeError)
    expect(() =>
      page({ rows: [], total: -1, page: 1, size: 10 }, { mode: 'page', page: 1, pageSize: 10 }),
    ).toThrow('non-negative number')
  })
})

describe('query serialization', () => {
  it('normalizes filters without changing backend keys by default', () => {
    expect(
      serializeFilters(
        { active: true, tags: ['a', 'b'], keyword: '', ignored: undefined },
        { boolean: 'number', omitEmptyString: true },
      ),
    ).toEqual({ active: 1, tags: ['a', 'b'] })
    expect(serializeSort([{ key: 'createdAt', direction: 'desc' }])).toEqual({
      sort: ['createdAt:desc'],
    })
  })

  it('supports key mapping, transforms, comma arrays, nulls, and custom sort syntax', () => {
    expect(
      serializeFilters(
        { enabled: false, tags: ['a', null, true], keyword: null, age: 0 },
        {
          boolean: 'string',
          array: 'comma',
          keyMap: { enabled: 'is_enabled', age: 'years' },
          transform: { age: (value) => Number(value) + 1 },
        },
      ),
    ).toEqual({ is_enabled: 'false', tags: 'a,,true', keyword: '', years: 1 })
    expect(serializeFilters({ empty: null }, { omitNull: true })).toEqual({})
    expect(
      serializeSort([{ key: 'name', direction: 'asc' }], {
        sortKey: 'orderBy',
        sortSeparator: '.',
      }),
    ).toEqual({ orderBy: ['name.asc'] })
    expect(serializeSort([])).toEqual({})
  })
})

describe('web storage adapter', () => {
  it('serializes values behind an optional namespace', async () => {
    const values = new Map<string, string>()
    const storage = createWebStorageAdapter(
      {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value)
        },
        removeItem: (key) => {
          values.delete(key)
        },
      },
      { namespace: 'demo' },
    )

    await storage.set('settings', { dark: true })

    expect(values.get('demo:settings')).toBe('{"dark":true}')
    expect(await storage.get('settings')).toEqual({ dark: true })
    await storage.remove('settings')
    expect(await storage.get('settings')).toBeUndefined()
  })
})

describe('URL state adapter', () => {
  it('preserves unrelated parameters and supports replace, push, and popstate synchronization', async () => {
    const location = { href: 'https://admin.example.test/users?tab=activity&count=2' }
    let popstate: (() => void) | undefined
    const replaceState = vi.fn((_data, _unused, url?: string | URL | null) => {
      if (url) location.href = String(url)
    })
    const pushState = vi.fn((_data, _unused, url?: string | URL | null) => {
      if (url) location.href = String(url)
    })
    const adapter = createUrlStateAdapter({
      location,
      history: { replaceState, pushState },
      events: {
        addEventListener: (_type, listener) => {
          popstate = listener
        },
        removeEventListener: (_type, listener) => {
          if (popstate === listener) popstate = undefined
        },
      },
      codec: {
        decode: (parameters) => {
          const count = Number(parameters.get('count'))
          return Number.isFinite(count) ? { count } : undefined
        },
        encode: (value, current) => {
          const parameters = new URLSearchParams(current)
          parameters.set('count', `${value.count}`)
          return parameters
        },
      },
    })

    expect(await adapter.read()).toEqual({ count: 2 })
    await adapter.write({ count: 3 })
    expect(replaceState).toHaveBeenCalledOnce()
    expect(location.href).toBe('https://admin.example.test/users?tab=activity&count=3')
    await adapter.write({ count: 4 }, { mode: 'push' })
    expect(pushState).toHaveBeenCalledOnce()

    const listener = vi.fn()
    const stop = adapter.subscribe?.(listener)
    location.href = 'https://admin.example.test/users?tab=activity&count=9'
    popstate?.()
    expect(listener).toHaveBeenCalledWith({ count: 9 })
    stop?.()
    expect(popstate).toBeUndefined()
  })
})

describe('fetch transport', () => {
  it('serializes query, headers, JSON bodies, credentials, and JSON responses', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ id: 7 }), {
          status: 201,
          headers: { 'content-type': 'application/json', 'x-request-id': 'request-1' },
        }),
      ),
    )
    const transport = createFetchTransport({
      baseUrl: 'https://api.example.test/v1/',
      credentials: 'include',
      defaultHeaders: { authorization: 'Bearer token' },
      fetch,
    })

    const result = await transport.request<{ id: number }, { name: string }>({
      url: 'users',
      method: 'POST',
      query: { role: ['admin', 'editor'], ignored: undefined },
      headers: { 'x-client': 'vela' },
      body: { name: 'Ada' },
    })

    expect(result).toMatchObject({ data: { id: 7 }, status: 201 })
    expect(result.headers['x-request-id']).toBe('request-1')
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBeInstanceOf(URL)
    expect((url as URL).href).toBe('https://api.example.test/v1/users?role=admin&role=editor')
    expect(init?.method).toBe('POST')
    expect(init?.credentials).toBe('include')
    expect(init?.body).toBe('{"name":"Ada"}')
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json')
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token')
  })

  it('passes text and FormData bodies through and parses text responses', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response('saved', { status: 200 }))
      .mockResolvedValueOnce(new Response('uploaded', { status: 200 }))
    const transport = createFetchTransport({ baseUrl: 'https://api.example.test/', fetch })

    const text = await transport.request<string, string>({ url: '/text', body: 'raw' })
    const form = new FormData()
    form.append('title', 'avatar')
    await transport.request<string, FormData>({ url: '/upload', body: form })

    expect(text.data).toBe('saved')
    expect(fetch.mock.calls[0]?.[1]?.body).toBe('raw')
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(form)
  })

  it.each([
    [401, 'unauthorized', false],
    [403, 'forbidden', false],
    [404, 'not-found', false],
    [409, 'conflict', false],
    [429, 'rate-limit', true],
    [500, 'server', true],
    [418, 'server', false],
  ] as const)('normalizes HTTP %s failures', async (status, kind, retryable) => {
    const transport = createFetchTransport({
      fetch: () => Promise.resolve(new Response('', { status, statusText: '' })),
    })

    await expect(transport.request({ url: '/failure' })).rejects.toMatchObject({
      normalized: { kind, retryable, status },
    })
  })

  it('normalizes network, cancellation, and custom failures', async () => {
    const network = createFetchTransport({
      fetch: () => Promise.reject(new Error('offline')),
    })
    await expect(network.request({ url: '/network' })).rejects.toMatchObject({
      normalized: { kind: 'network', message: 'offline', retryable: true },
    })

    const cancelled = createFetchTransport({
      fetch: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('cancelled', 'AbortError')),
          )
        }),
    })
    const controller = new AbortController()
    const request = cancelled.request({ url: '/cancel', signal: controller.signal })
    controller.abort('done')
    await expect(request).rejects.toMatchObject({ normalized: { kind: 'cancelled' } })

    const custom = createFetchTransport({
      // Deliberately verifies that third-party clients may reject with a non-Error value.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      fetch: () => Promise.reject('failure'),
      normalizeError: () => ({ kind: 'unknown', message: 'custom', retryable: false }),
    })
    await expect(custom.request({ url: '/custom' })).rejects.toMatchObject({
      name: 'TransportFailure',
      message: 'custom',
    })
  })

  it('aborts timed-out requests and preserves the normalized cause', async () => {
    vi.useFakeTimers()
    const transport = createFetchTransport({
      fetch: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('timed out', 'AbortError')),
          )
        }),
    })
    const pending = transport.request({ url: '/slow', timeoutMs: 25 })
    const assertion = expect(pending).rejects.toBeInstanceOf(TransportFailure)
    await vi.advanceTimersByTimeAsync(25)
    await assertion
    vi.useRealTimers()
  })
})

describe('authenticated transport', () => {
  it('injects a configurable token without overriding explicit request headers', async () => {
    const { request, transport: baseTransport } = createTransportMock(() =>
      Promise.resolve({ data: 'ok', status: 200, headers: {} }),
    )
    const transport = createAuthenticatedTransport(baseTransport, {
      getSnapshot: () => ({ authenticated: true, accessToken: 'token-1' }),
    })

    await transport.request({ url: '/first' })
    await transport.request({
      url: '/second',
      headers: { authorization: 'Custom signed-request' },
    })

    expect(request.mock.calls[0]?.[0].headers).toEqual({ Authorization: 'Bearer token-1' })
    expect(request.mock.calls[1]?.[0].headers).toEqual({ authorization: 'Custom signed-request' })
  })

  it('uses one refresh for concurrent unauthorized requests and retries with the new token', async () => {
    let snapshot: AuthSnapshot = { authenticated: true, accessToken: 'expired' }
    const { request, transport: baseTransport } = createTransportMock((input) => {
      const token = input.headers?.Authorization
      return token === 'Bearer fresh'
        ? Promise.resolve({ data: 'ready', status: 200, headers: {} })
        : Promise.reject(
            new TransportFailure({
              kind: 'unauthorized',
              message: 'Expired',
              retryable: false,
              status: 401,
            }),
          )
    })
    const refresh = vi.fn(async () => {
      await Promise.resolve()
      snapshot = { authenticated: true, accessToken: 'fresh' }
      return snapshot
    })
    const transport = createAuthenticatedTransport(baseTransport, {
      getSnapshot: () => snapshot,
      refresh,
    })

    await expect(
      Promise.all([transport.request({ url: '/one' }), transport.request({ url: '/two' })]),
    ).resolves.toHaveLength(2)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(4)
  })

  it('fails closed and signs out when refresh cannot recover a session', async () => {
    const unauthorized = new TransportFailure({
      kind: 'unauthorized',
      message: 'Expired',
      retryable: false,
      status: 401,
    })
    const signOut = vi.fn()
    const refreshError = new Error('refresh failed')
    const transport = createAuthenticatedTransport(
      { request: () => Promise.reject(unauthorized) },
      {
        getSnapshot: () => ({ authenticated: true, accessToken: 'expired' }),
        refresh: () => Promise.reject(refreshError),
        signOut,
      },
    )

    await expect(transport.request({ url: '/secure' })).rejects.toBe(refreshError)
    expect(signOut).toHaveBeenCalledWith('session-refresh-failed')
  })
})
