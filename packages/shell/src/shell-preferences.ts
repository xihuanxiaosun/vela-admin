import { readonly, shallowRef, type Ref } from 'vue'
import type { StorageAdapter } from '@vela-admin/contracts'

import type {
  ShellContentSpacing,
  ShellContentWidth,
  ShellHeaderStyle,
  ShellLayout,
  ShellPreferences,
} from './types'

export interface ShellPreferencesOptions {
  readonly storage?: StorageAdapter
  readonly storageKey?: string
  readonly defaults?: Partial<ShellPreferences>
  readonly immediate?: boolean
}

export interface ShellPreferencesController {
  readonly preferences: Readonly<Ref<ShellPreferences>>
  readonly ready: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<unknown>>
  readonly set: (patch: Partial<ShellPreferences>) => Promise<void>
  readonly reset: () => Promise<void>
  readonly hydrate: () => Promise<void>
}

interface StoredShellPreferencesV1 {
  readonly version: 1
  readonly preferences: Partial<Omit<ShellPreferences, 'contentSpacing'>>
}

interface StoredShellPreferencesV2 {
  readonly version: 2
  readonly preferences: Partial<ShellPreferences>
}

type StoredShellPreferences = StoredShellPreferencesV1 | StoredShellPreferencesV2

const STORAGE_KEY = 'vela.shell'
const layouts = new Set<ShellLayout>(['sidebar', 'compact', 'topbar'])
const contentWidths = new Set<ShellContentWidth>(['boxed', 'fluid'])
const headerStyles = new Set<ShellHeaderStyle>(['floating', 'attached'])
const contentSpacings = new Set<ShellContentSpacing>(['compact', 'comfortable', 'spacious'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizePreferences(value: unknown, fallback: ShellPreferences): ShellPreferences {
  const source = isRecord(value) ? value : {}
  return Object.freeze({
    layout: layouts.has(source.layout as ShellLayout)
      ? (source.layout as ShellLayout)
      : fallback.layout,
    contentWidth: contentWidths.has(source.contentWidth as ShellContentWidth)
      ? (source.contentWidth as ShellContentWidth)
      : fallback.contentWidth,
    headerStyle: headerStyles.has(source.headerStyle as ShellHeaderStyle)
      ? (source.headerStyle as ShellHeaderStyle)
      : fallback.headerStyle,
    contentSpacing: contentSpacings.has(source.contentSpacing as ShellContentSpacing)
      ? (source.contentSpacing as ShellContentSpacing)
      : fallback.contentSpacing,
  })
}

/** Persists presentation-only Shell choices without coupling navigation to a router or backend. */
export function createShellPreferencesController(
  options: ShellPreferencesOptions = {},
): ShellPreferencesController {
  const defaults = normalizePreferences(options.defaults, {
    layout: 'sidebar',
    contentWidth: 'boxed',
    headerStyle: 'floating',
    contentSpacing: 'comfortable',
  })
  const preferences = shallowRef<ShellPreferences>(defaults)
  const ready = shallowRef(false)
  const error = shallowRef<unknown>()
  let revision = 0
  let storageQueue: Promise<void> = Promise.resolve()

  const enqueueStorage = (operation: () => Promise<void> | void): Promise<void> => {
    const queued = storageQueue.then(operation, operation)
    storageQueue = queued.catch(() => undefined)
    return queued
  }

  const persist = async (value: ShellPreferences): Promise<void> => {
    await enqueueStorage(() =>
      options.storage?.set<StoredShellPreferences>(options.storageKey ?? STORAGE_KEY, {
        version: 2,
        preferences: value,
      }),
    )
  }

  const set = async (patch: Partial<ShellPreferences>): Promise<void> => {
    const currentRevision = ++revision
    const next = normalizePreferences({ ...preferences.value, ...patch }, defaults)
    preferences.value = next
    error.value = undefined
    try {
      await persist(next)
    } catch (cause) {
      if (currentRevision === revision) error.value = cause
      throw cause
    }
  }

  const hydrate = async (): Promise<void> => {
    const currentRevision = revision
    error.value = undefined
    try {
      const stored = await options.storage?.get<StoredShellPreferences>(
        options.storageKey ?? STORAGE_KEY,
      )
      if (currentRevision !== revision) return
      preferences.value = normalizePreferences(
        stored?.version === 1 || stored?.version === 2 ? stored.preferences : undefined,
        defaults,
      )
    } catch (cause) {
      if (currentRevision === revision) {
        preferences.value = defaults
        error.value = cause
      }
    } finally {
      ready.value = true
    }
  }

  const reset = async (): Promise<void> => {
    revision += 1
    preferences.value = defaults
    error.value = undefined
    try {
      await enqueueStorage(() => options.storage?.remove(options.storageKey ?? STORAGE_KEY))
    } catch (cause) {
      error.value = cause
      throw cause
    }
  }

  const controller: ShellPreferencesController = {
    preferences: readonly(preferences),
    ready: readonly(ready),
    error: readonly(error),
    set,
    reset,
    hydrate,
  }

  if (options.immediate !== false) void hydrate()
  return controller
}
