import type {
  NormalizedError,
  TransportAdapter,
  TransportRequest,
  TransportResponse,
} from '@vela-admin/contracts'

export interface FetchTransportOptions {
  readonly baseUrl?: string
  readonly defaultHeaders?: Readonly<Record<string, string>>
  readonly credentials?: RequestCredentials
  readonly normalizeError?: (error: unknown, response?: Response) => NormalizedError
  readonly fetch?: typeof globalThis.fetch
}

export class TransportFailure extends Error {
  readonly normalized: NormalizedError

  constructor(normalized: NormalizedError) {
    super(normalized.message, { cause: normalized.cause })
    this.name = 'TransportFailure'
    this.normalized = normalized
  }
}

function defaultNormalizeError(error: unknown, response?: Response): NormalizedError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { kind: 'cancelled', message: 'Request cancelled', retryable: false, cause: error }
  }
  if (response) {
    const kind =
      response.status === 401
        ? 'unauthorized'
        : response.status === 403
          ? 'forbidden'
          : response.status === 404
            ? 'not-found'
            : response.status === 409
              ? 'conflict'
              : response.status === 429
                ? 'rate-limit'
                : 'server'
    return {
      kind,
      message: response.statusText || `Request failed with status ${response.status}`,
      retryable: response.status === 408 || response.status === 429 || response.status >= 500,
      status: response.status,
      cause: error,
    }
  }
  return {
    kind: 'network',
    message: error instanceof Error ? error.message : 'Network request failed',
    retryable: true,
    cause: error,
  }
}

function appendQuery(url: URL, query: TransportRequest['query']): void {
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue
    const values: readonly string[] = typeof value === 'string' ? [value] : value
    for (const item of values) url.searchParams.append(key, item)
  }
}

export function createFetchTransport(options: FetchTransportOptions = {}): TransportAdapter {
  const fetchImplementation = options.fetch ?? globalThis.fetch

  return {
    async request<TData, TBody>(
      request: TransportRequest<TBody>,
    ): Promise<TransportResponse<TData>> {
      const controller = new AbortController()
      const timeout =
        request.timeoutMs === undefined
          ? undefined
          : setTimeout(
              () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
              request.timeoutMs,
            )
      const onAbort = () => controller.abort(request.signal?.reason)
      request.signal?.addEventListener('abort', onAbort, { once: true })
      let response: Response | undefined

      try {
        const runtimeLocation = (globalThis as unknown as { location?: Location }).location
        const base = options.baseUrl ?? runtimeLocation?.origin ?? 'http://localhost'
        const url = new URL(request.url, base)
        appendQuery(url, request.query)
        const headers = new Headers({ ...options.defaultHeaders, ...request.headers })
        const hasBody = request.body !== undefined
        if (hasBody && !headers.has('content-type')) headers.set('content-type', 'application/json')

        response = await fetchImplementation(url, {
          method: request.method ?? 'GET',
          headers,
          signal: controller.signal,
          ...(options.credentials === undefined ? {} : { credentials: options.credentials }),
          ...(hasBody
            ? {
                body:
                  (typeof FormData !== 'undefined' && request.body instanceof FormData) ||
                  typeof request.body === 'string'
                    ? request.body
                    : JSON.stringify(request.body),
              }
            : {}),
        })

        if (!response.ok) throw new Error(response.statusText)
        const contentType = response.headers.get('content-type') ?? ''
        const data = (
          contentType.includes('application/json') ? await response.json() : await response.text()
        ) as TData

        return {
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        }
      } catch (error) {
        const normalized = (options.normalizeError ?? defaultNormalizeError)(error, response)
        throw new TransportFailure(normalized)
      } finally {
        if (timeout !== undefined) clearTimeout(timeout)
        request.signal?.removeEventListener('abort', onAbort)
      }
    },
  }
}
