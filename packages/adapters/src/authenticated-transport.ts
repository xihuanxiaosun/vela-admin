import type {
  AuthAdapter,
  AuthSnapshot,
  TransportAdapter,
  TransportRequest,
  TransportResponse,
} from '@vela-admin/contracts'

import { TransportFailure } from './fetch-transport'

export interface AuthenticatedTransportOptions<TIdentity = unknown> {
  readonly headerName?: string
  readonly getToken?: (snapshot: AuthSnapshot<TIdentity>) => string | undefined
  readonly formatToken?: (token: string, snapshot: AuthSnapshot<TIdentity>) => string
  readonly overrideRequestHeader?: boolean
  readonly retryUnauthorized?: boolean
  readonly signOutOnRefreshFailure?: boolean
  readonly signOutReason?: string
  readonly isUnauthorized?: (error: unknown) => boolean
  readonly onRefreshFailure?: (error: unknown) => void
}

function defaultIsUnauthorized(error: unknown): boolean {
  if (error instanceof TransportFailure) {
    return error.normalized.kind === 'unauthorized' || error.normalized.status === 401
  }
  if (typeof error !== 'object' || error === null || !('normalized' in error)) return false
  const normalized = (error as { normalized?: { kind?: unknown; status?: unknown } }).normalized
  return normalized?.kind === 'unauthorized' || normalized?.status === 401
}

function hasHeader(headers: Readonly<Record<string, string>>, name: string): boolean {
  const normalizedName = name.toLocaleLowerCase()
  return Object.keys(headers).some((key) => key.toLocaleLowerCase() === normalizedName)
}

export function createAuthenticatedTransport<TIdentity = unknown>(
  transport: TransportAdapter,
  auth: AuthAdapter<TIdentity>,
  options: AuthenticatedTransportOptions<TIdentity> = {},
): TransportAdapter {
  const headerName = options.headerName ?? 'Authorization'
  const getToken = options.getToken ?? ((snapshot: AuthSnapshot<TIdentity>) => snapshot.accessToken)
  const formatToken = options.formatToken ?? ((token: string) => `Bearer ${token}`)
  const isUnauthorized = options.isUnauthorized ?? defaultIsUnauthorized
  let refreshOperation: Promise<AuthSnapshot<TIdentity>> | undefined

  async function refreshSession(): Promise<AuthSnapshot<TIdentity>> {
    if (!auth.refresh) return { authenticated: false }
    refreshOperation ??= auth.refresh().finally(() => {
      refreshOperation = undefined
    })
    return refreshOperation
  }

  async function signOutAfterFailure(): Promise<void> {
    if (options.signOutOnRefreshFailure === false) return
    try {
      await auth.signOut?.(options.signOutReason ?? 'session-refresh-failed')
    } catch {
      // The refresh error remains the actionable failure. Sign-out cleanup is best effort.
    }
  }

  function withAuthentication<TBody>(
    request: TransportRequest<TBody>,
    snapshot: AuthSnapshot<TIdentity>,
  ): TransportRequest<TBody> {
    const token = getToken(snapshot)
    if (!snapshot.authenticated || !token) return request
    const headers = { ...request.headers }
    if (options.overrideRequestHeader || !hasHeader(headers, headerName)) {
      headers[headerName] = formatToken(token, snapshot)
    }
    return { ...request, headers }
  }

  return {
    async request<TData, TBody>(
      request: TransportRequest<TBody>,
    ): Promise<TransportResponse<TData>> {
      const initialSnapshot = await auth.getSnapshot()
      try {
        return await transport.request<TData, TBody>(withAuthentication(request, initialSnapshot))
      } catch (error) {
        if (options.retryUnauthorized === false || !isUnauthorized(error)) throw error

        const currentSnapshot = await auth.getSnapshot()
        const initialToken = getToken(initialSnapshot)
        const currentToken = getToken(currentSnapshot)
        let retrySnapshot = currentSnapshot

        if (!currentSnapshot.authenticated || !currentToken || currentToken === initialToken) {
          try {
            retrySnapshot = await refreshSession()
            if (!retrySnapshot.authenticated || !getToken(retrySnapshot)) {
              await signOutAfterFailure()
              throw error
            }
          } catch (refreshError) {
            await signOutAfterFailure()
            options.onRefreshFailure?.(refreshError)
            throw refreshError
          }
        }

        return transport.request<TData, TBody>(withAuthentication(request, retrySnapshot))
      }
    },
  }
}
