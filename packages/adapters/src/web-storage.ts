import type { StorageAdapter } from '@vela-admin/contracts'

export interface StorageLike {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
  readonly removeItem: (key: string) => void
}

export interface WebStorageAdapterOptions {
  readonly namespace?: string
  readonly serialize?: (value: unknown) => string
  readonly deserialize?: (value: string) => unknown
}

export function createWebStorageAdapter(
  storage: StorageLike,
  options: WebStorageAdapterOptions = {},
): StorageAdapter {
  const prefix = options.namespace ? `${options.namespace}:` : ''
  const serialize = options.serialize ?? JSON.stringify
  const deserialize = options.deserialize ?? JSON.parse
  const keyFor = (key: string) => `${prefix}${key}`

  return {
    get<TValue>(key: string): TValue | undefined {
      const value = storage.getItem(keyFor(key))
      return value === null ? undefined : (deserialize(value) as TValue)
    },
    set<TValue>(key: string, value: TValue): void {
      storage.setItem(keyFor(key), serialize(value))
    },
    remove(key: string): void {
      storage.removeItem(keyFor(key))
    },
  }
}
