import type { Awaitable } from '@vela-admin/contracts'
import type { NavigationGuard, RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

import type { VelaAccessController } from './access'

export type VelaCapabilityMode = 'all' | 'any'

export interface VelaRouteAccessRequirement<TContext = unknown> {
  readonly public?: boolean
  readonly guestOnly?: boolean
  readonly capabilities?: readonly string[]
  readonly capabilityMode?: VelaCapabilityMode
  readonly context?: TContext
  readonly resolveContext?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
  ) => Awaitable<TContext | undefined>
}

export type VelaRouteTarget = RouteLocationRaw | ((to: RouteLocationNormalized) => RouteLocationRaw)

export interface VelaRouteGuardOptions<TContext = unknown> {
  readonly resolveRequirement: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
  ) => Awaitable<VelaRouteAccessRequirement<TContext> | undefined>
  readonly signInRoute: VelaRouteTarget
  readonly forbiddenRoute: VelaRouteTarget
  readonly authenticatedHomeRoute?: VelaRouteTarget
  readonly initializationErrorRoute?: VelaRouteTarget
  readonly initializePublicRoutes?: boolean
  readonly redirectQueryKey?: string | false
  readonly onInitializationError?: (error: unknown) => void
}

export function defineRouteAccess<TContext = unknown>(
  requirement: VelaRouteAccessRequirement<TContext>,
): VelaRouteAccessRequirement<TContext> {
  return requirement
}

export function createMetaAccessResolver<TContext = unknown>(
  metaKey = 'access',
): VelaRouteGuardOptions<TContext>['resolveRequirement'] {
  return (to) => to.meta[metaKey] as VelaRouteAccessRequirement<TContext> | undefined
}

function resolveTarget(target: VelaRouteTarget, to: RouteLocationNormalized): RouteLocationRaw {
  return typeof target === 'function' ? target(to) : target
}

function addRedirectQuery(
  target: RouteLocationRaw,
  to: RouteLocationNormalized,
  queryKey: string | false,
): RouteLocationRaw {
  if (!queryKey) return target
  if (typeof target === 'string') {
    return { path: target, query: { [queryKey]: to.fullPath } }
  }
  return {
    ...target,
    query: { ...('query' in target ? target.query : undefined), [queryKey]: to.fullPath },
  }
}

export function createVelaRouteGuard<TIdentity = unknown, TContext = unknown>(
  access: VelaAccessController<TIdentity, TContext>,
  options: VelaRouteGuardOptions<TContext>,
): NavigationGuard {
  return async (to, from) => {
    const requirement = (await options.resolveRequirement(to, from)) ?? {}
    const publicWithoutSession =
      requirement.public && !requirement.guestOnly && !options.initializePublicRoutes
    if (publicWithoutSession) return true

    try {
      await access.initialize()
    } catch (error) {
      options.onInitializationError?.(error)
      if (options.initializationErrorRoute) {
        return resolveTarget(options.initializationErrorRoute, to)
      }
      throw error
    }

    if (requirement.guestOnly && access.authenticated.value) {
      return options.authenticatedHomeRoute
        ? resolveTarget(options.authenticatedHomeRoute, to)
        : true
    }
    if (requirement.public || requirement.guestOnly) return true

    if (!access.authenticated.value) {
      return addRedirectQuery(
        resolveTarget(options.signInRoute, to),
        to,
        options.redirectQueryKey ?? 'redirect',
      )
    }

    const capabilities = requirement.capabilities ?? []
    if (capabilities.length === 0) return true
    const context = requirement.resolveContext
      ? await requirement.resolveContext(to, from)
      : requirement.context
    const allowed =
      requirement.capabilityMode === 'any'
        ? await access.canAny(capabilities, context)
        : await access.canAll(capabilities, context)
    return allowed ? true : resolveTarget(options.forbiddenRoute, to)
  }
}
