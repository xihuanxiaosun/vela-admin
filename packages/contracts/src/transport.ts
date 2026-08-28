export type Awaitable<T> = T | Promise<T>

export type TransportMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface TransportRequest<TBody = unknown> {
  readonly url: string
  readonly method?: TransportMethod
  readonly headers?: Readonly<Record<string, string>>
  readonly query?: Readonly<Record<string, string | readonly string[] | undefined>>
  readonly body?: TBody
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
}

export interface TransportResponse<TData = unknown> {
  readonly data: TData
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
}

export interface TransportAdapter {
  request<TData = unknown, TBody = unknown>(
    request: TransportRequest<TBody>,
  ): Promise<TransportResponse<TData>>
}

export interface AuthSnapshot<TIdentity = unknown> {
  readonly authenticated: boolean
  readonly identity?: TIdentity
  readonly accessToken?: string
}

export interface AuthAdapter<TIdentity = unknown> {
  getSnapshot(): Awaitable<AuthSnapshot<TIdentity>>
  refresh?(signal?: AbortSignal): Promise<AuthSnapshot<TIdentity>>
  signOut?(reason?: string): Awaitable<void>
}

export interface PermissionAdapter<TContext = unknown> {
  can(capability: string, context?: TContext): Awaitable<boolean>
  canAny?(capabilities: readonly string[], context?: TContext): Awaitable<boolean>
  canAll?(capabilities: readonly string[], context?: TContext): Awaitable<boolean>
}

export interface StorageAdapter {
  get<TValue>(key: string): Awaitable<TValue | undefined>
  set<TValue>(key: string, value: TValue): Awaitable<void>
  remove(key: string): Awaitable<void>
}
