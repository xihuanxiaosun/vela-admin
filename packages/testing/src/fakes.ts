import type {
  PermissionAdapter,
  StorageAdapter,
  TransportAdapter,
  TransportRequest,
  TransportResponse,
  UploadAdapter,
  UploadFileLike,
  UploadRequest,
  UploadResult,
} from '@vela-admin/contracts'

export function createMemoryStorage(
  initial: Readonly<Record<string, unknown>> = {},
): StorageAdapter & {
  readonly snapshot: () => Readonly<Record<string, unknown>>
} {
  const values = new Map(Object.entries(initial))
  return {
    get: <TValue>(key: string) => values.get(key) as TValue | undefined,
    set: <TValue>(key: string, value: TValue) => {
      values.set(key, value)
    },
    remove: (key) => {
      values.delete(key)
    },
    snapshot: () => Object.fromEntries(values),
  }
}

export function createPermissionFake(granted: readonly string[]): PermissionAdapter {
  const capabilities = new Set(granted)
  return {
    can: (capability) => capabilities.has(capability),
    canAny: (requested) => requested.some((capability) => capabilities.has(capability)),
    canAll: (requested) => requested.every((capability) => capabilities.has(capability)),
  }
}

export type TransportHandler = (
  request: TransportRequest,
) => TransportResponse | Promise<TransportResponse>

export function createTransportFake(
  handler: TransportHandler,
): TransportAdapter & { readonly requests: readonly TransportRequest[] } {
  const requests: TransportRequest[] = []
  return {
    requests,
    async request<TData, TBody>(request: TransportRequest<TBody>) {
      requests.push(request)
      return (await handler(request)) as TransportResponse<TData>
    },
  }
}

export function createUploadFake<TValue>(
  value: (file: UploadFileLike) => TValue,
): UploadAdapter<TValue> & { readonly requests: readonly UploadRequest[] } {
  const requests: UploadRequest[] = []
  return {
    requests,
    upload(request): Promise<UploadResult<TValue>> {
      requests.push(request)
      request.onProgress({
        loaded: request.file.size,
        total: request.file.size,
        percentage: 100,
      })
      return Promise.resolve({ value: value(request.file) })
    },
  }
}
