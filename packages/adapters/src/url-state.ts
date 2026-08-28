import type { StateSyncAdapter, StateSyncWriteOptions } from '@vela-admin/contracts'

export interface UrlStateCodec<TValue> {
  readonly decode: (parameters: URLSearchParams) => TValue | undefined
  readonly encode: (value: TValue, current: URLSearchParams) => URLSearchParams
}

export interface UrlLocationLike {
  readonly href: string
}

export interface UrlHistoryLike {
  readonly pushState: (data: unknown, unused: string, url?: string | URL | null) => void
  readonly replaceState: (data: unknown, unused: string, url?: string | URL | null) => void
}

export interface PopStateSource {
  readonly addEventListener: (type: 'popstate', listener: () => void) => void
  readonly removeEventListener: (type: 'popstate', listener: () => void) => void
}

export interface UrlStateAdapterOptions<TValue> {
  readonly codec: UrlStateCodec<TValue>
  readonly location: UrlLocationLike
  readonly history: UrlHistoryLike
  readonly events?: PopStateSource
  readonly defaultWriteMode?: StateSyncWriteOptions['mode']
}

/** Browser-router-neutral URL synchronization. Hosts inject location/history for SSR safety. */
export function createUrlStateAdapter<TValue>(
  options: UrlStateAdapterOptions<TValue>,
): StateSyncAdapter<TValue> {
  const read = (): TValue | undefined => {
    const url = new URL(options.location.href)
    return options.codec.decode(url.searchParams)
  }

  return {
    read,
    write(value, writeOptions) {
      const url = new URL(options.location.href)
      url.search = options.codec.encode(value, url.searchParams).toString()
      const mode = writeOptions?.mode ?? options.defaultWriteMode ?? 'replace'
      options.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url)
    },
    ...(options.events
      ? {
          subscribe(listener: (value: TValue | undefined) => void) {
            const onPopState = () => listener(read())
            options.events?.addEventListener('popstate', onPopState)
            return () => options.events?.removeEventListener('popstate', onPopState)
          },
        }
      : {}),
  }
}
