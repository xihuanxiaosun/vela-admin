import type { AuthAdapter, AuthSnapshot, PermissionAdapter } from '@vela-admin/contracts'
import {
  computed,
  inject,
  shallowRef,
  type App,
  type ComputedRef,
  type InjectionKey,
  type Plugin,
} from 'vue'

export type VelaAccessStatus = 'idle' | 'loading' | 'ready' | 'refreshing' | 'signed-out' | 'error'

export type VelaPermissionFallback = 'deny' | 'allow-authenticated'

export interface VelaAccessOptions<TIdentity = unknown, TContext = unknown> {
  readonly auth: AuthAdapter<TIdentity>
  readonly permission?: PermissionAdapter<TContext>
  readonly initialSnapshot?: AuthSnapshot<TIdentity>
  readonly permissionFallback?: VelaPermissionFallback
  readonly onError?: (error: unknown) => void
}

export interface VelaAccessService<TIdentity = unknown, TContext = unknown> {
  readonly status: ComputedRef<VelaAccessStatus>
  readonly snapshot: ComputedRef<AuthSnapshot<TIdentity>>
  readonly error: ComputedRef<unknown>
  readonly revision: ComputedRef<number>
  readonly initialized: ComputedRef<boolean>
  readonly authenticated: ComputedRef<boolean>
  readonly identity: ComputedRef<TIdentity | undefined>
  readonly accessToken: ComputedRef<string | undefined>
  initialize(): Promise<AuthSnapshot<TIdentity>>
  refresh(): Promise<AuthSnapshot<TIdentity>>
  signOut(reason?: string): Promise<void>
  can(capability: string, context?: TContext): Promise<boolean>
  canAny(capabilities: readonly string[], context?: TContext): Promise<boolean>
  canAll(capabilities: readonly string[], context?: TContext): Promise<boolean>
  invalidatePermissions(): void
}

export type VelaAccessController<TIdentity = unknown, TContext = unknown> = VelaAccessService<
  TIdentity,
  TContext
> &
  Plugin

const accessKey: InjectionKey<VelaAccessController> = Symbol('vela-access')

function normalizeSnapshot<TIdentity>(snapshot: AuthSnapshot<TIdentity>): AuthSnapshot<TIdentity> {
  if (!snapshot.authenticated) return Object.freeze({ authenticated: false })
  return Object.freeze({ ...snapshot, authenticated: true })
}

export function createVelaAccess<TIdentity = unknown, TContext = unknown>(
  options: VelaAccessOptions<TIdentity, TContext>,
): VelaAccessController<TIdentity, TContext> {
  const initialSnapshot = normalizeSnapshot(options.initialSnapshot ?? { authenticated: false })
  const status = shallowRef<VelaAccessStatus>(
    options.initialSnapshot ? (initialSnapshot.authenticated ? 'ready' : 'signed-out') : 'idle',
  )
  const snapshot = shallowRef<AuthSnapshot<TIdentity>>(initialSnapshot)
  const error = shallowRef<unknown>()
  const revision = shallowRef(0)
  const publicStatus = computed(() => status.value)
  const publicSnapshot = computed(() => snapshot.value)
  const publicError = computed(() => error.value)
  const publicRevision = computed(() => revision.value)
  const hasInitialized = shallowRef(options.initialSnapshot !== undefined)
  const initialized = computed(() => hasInitialized.value)
  const authenticated = computed(() => snapshot.value.authenticated)
  const identity = computed(() => snapshot.value.identity)
  const accessToken = computed(() => snapshot.value.accessToken)
  const permissionFallback = options.permissionFallback ?? 'deny'
  let initialization: Promise<AuthSnapshot<TIdentity>> | undefined
  let refreshing: Promise<AuthSnapshot<TIdentity>> | undefined
  let operationRevision = 0

  function commit(next: AuthSnapshot<TIdentity>, operation: number): AuthSnapshot<TIdentity> {
    const normalized = normalizeSnapshot(next)
    if (operation === operationRevision) {
      snapshot.value = normalized
      hasInitialized.value = true
      status.value = normalized.authenticated ? 'ready' : 'signed-out'
      revision.value += 1
    }
    return normalized
  }

  function fail(reason: unknown, operation: number): never {
    if (operation === operationRevision) {
      error.value = reason
      status.value = 'error'
    }
    options.onError?.(reason)
    throw reason
  }

  async function initialize(): Promise<AuthSnapshot<TIdentity>> {
    if (initialized.value) return snapshot.value
    if (initialization) return initialization

    const operation = ++operationRevision
    status.value = 'loading'
    error.value = undefined
    initialization = Promise.resolve(options.auth.getSnapshot())
      .then((next) => commit(next, operation))
      .catch((reason: unknown) => fail(reason, operation))
      .finally(() => {
        initialization = undefined
      })
    return initialization
  }

  async function refresh(): Promise<AuthSnapshot<TIdentity>> {
    if (refreshing) return refreshing
    if (!initialized.value) await initialize()

    const operation = ++operationRevision
    status.value = 'refreshing'
    error.value = undefined
    const refreshSnapshot = () =>
      options.auth.refresh ? options.auth.refresh() : options.auth.getSnapshot()
    refreshing = Promise.resolve(refreshSnapshot())
      .then((next) => commit(next, operation))
      .catch((reason: unknown) => fail(reason, operation))
      .finally(() => {
        refreshing = undefined
      })
    return refreshing
  }

  async function signOut(reason?: string): Promise<void> {
    const operation = ++operationRevision
    error.value = undefined
    try {
      await options.auth.signOut?.(reason)
      commit({ authenticated: false }, operation)
    } catch (signOutError) {
      fail(signOutError, operation)
    }
  }

  async function can(capability: string, context?: TContext): Promise<boolean> {
    if (!snapshot.value.authenticated || !capability) return false
    if (!options.permission) return permissionFallback === 'allow-authenticated'
    return Boolean(await options.permission.can(capability, context))
  }

  async function canAny(capabilities: readonly string[], context?: TContext): Promise<boolean> {
    if (!snapshot.value.authenticated || capabilities.length === 0) return false
    if (!options.permission) return permissionFallback === 'allow-authenticated'
    if (options.permission.canAny) {
      return Boolean(await options.permission.canAny(capabilities, context))
    }
    for (const capability of capabilities) {
      if (await options.permission.can(capability, context)) return true
    }
    return false
  }

  async function canAll(capabilities: readonly string[], context?: TContext): Promise<boolean> {
    if (!snapshot.value.authenticated) return false
    if (capabilities.length === 0) return true
    if (!options.permission) return permissionFallback === 'allow-authenticated'
    if (options.permission.canAll) {
      return Boolean(await options.permission.canAll(capabilities, context))
    }
    for (const capability of capabilities) {
      if (!(await options.permission.can(capability, context))) return false
    }
    return true
  }

  const controller: VelaAccessController<TIdentity, TContext> = {
    status: publicStatus,
    snapshot: publicSnapshot,
    error: publicError,
    revision: publicRevision,
    initialized,
    authenticated,
    identity,
    accessToken,
    initialize,
    refresh,
    signOut,
    can,
    canAny,
    canAll,
    invalidatePermissions() {
      revision.value += 1
    },
    install(app: App) {
      app.provide(accessKey, controller as VelaAccessController)
    },
  }

  return controller
}

export function useVelaAccess<TIdentity = unknown, TContext = unknown>(): VelaAccessController<
  TIdentity,
  TContext
> {
  const access = inject(accessKey)
  if (!access) throw new Error('Vela access is not installed. Call app.use(access) first.')
  return access as VelaAccessController<TIdentity, TContext>
}
