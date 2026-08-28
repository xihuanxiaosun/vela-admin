import type { Awaitable } from './transport'

export interface StateSyncWriteOptions {
  readonly mode?: 'replace' | 'push'
}

/**
 * Synchronizes serializable UI state with an external location such as a URL, desktop shell, or
 * host router. StorageAdapter remains the contract for durable preferences.
 */
export interface StateSyncAdapter<TValue> {
  readonly read: () => Awaitable<TValue | undefined>
  readonly write: (value: TValue, options?: StateSyncWriteOptions) => Awaitable<void>
  readonly subscribe?: (listener: (value: TValue | undefined) => void) => () => void
}
