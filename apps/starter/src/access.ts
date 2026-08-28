import { createVelaAccess, useVelaAccess, type VelaAccessController } from '@vela-admin/access'
import type { AuthAdapter, AuthSnapshot, PermissionAdapter } from '@vela-admin/contracts'
import { readonly, ref, shallowRef, watch, type Ref } from 'vue'

import {
  issueStarterAccessToken,
  starterRoleCan,
  type StarterAccessRole,
  type StarterCapability,
} from './access-policy'

export interface StarterIdentity {
  readonly id: string
  readonly name: string
  readonly role: StarterAccessRole
}

export interface StarterAccessRuntime {
  readonly access: VelaAccessController<StarterIdentity>
  readonly auth: AuthAdapter<StarterIdentity>
  readonly permission: PermissionAdapter
  readonly role: Readonly<Ref<StarterAccessRole>>
  readonly setRole: (role: StarterAccessRole) => Promise<AuthSnapshot<StarterIdentity>>
}

function createSnapshot(role: StarterAccessRole): AuthSnapshot<StarterIdentity> {
  return {
    authenticated: true,
    identity: {
      id: 'starter-operator',
      name: 'Starter operator',
      role,
    },
    accessToken: issueStarterAccessToken(role),
  }
}

export function createStarterAccessRuntime(
  initialRole: StarterAccessRole = 'administrator',
): StarterAccessRuntime {
  const role = shallowRef<StarterAccessRole>(initialRole)
  const auth: AuthAdapter<StarterIdentity> = {
    getSnapshot: () => createSnapshot(role.value),
    refresh: () => Promise.resolve(createSnapshot(role.value)),
  }
  const permission: PermissionAdapter = {
    can: (capability) => starterRoleCan(role.value, capability),
    canAny: (capabilities) =>
      capabilities.some((capability) => starterRoleCan(role.value, capability)),
    canAll: (capabilities) =>
      capabilities.every((capability) => starterRoleCan(role.value, capability)),
  }
  const access = createVelaAccess({
    auth,
    permission,
    initialSnapshot: createSnapshot(role.value),
    permissionFallback: 'deny',
  })

  return {
    access,
    auth,
    permission,
    role: readonly(role),
    async setRole(nextRole) {
      role.value = nextRole
      return access.refresh()
    },
  }
}

const starterRuntime = createStarterAccessRuntime()

export const starterAccess = starterRuntime.access
export const starterAuthAdapter = starterRuntime.auth
export const starterPermissionAdapter = starterRuntime.permission
export const starterAccessRole = starterRuntime.role
export const setStarterAccessRole = starterRuntime.setRole

export interface StarterCapabilityState {
  readonly checking: Readonly<Ref<boolean>>
  readonly can: (capability: StarterCapability) => boolean
}

export function useStarterCapabilities(
  capabilities: readonly StarterCapability[],
): StarterCapabilityState {
  const access = useVelaAccess<StarterIdentity>()
  const checking = ref(true)
  const allowed = shallowRef<ReadonlySet<StarterCapability>>(new Set())

  watch(
    () => access.revision.value,
    (_revision, _previous, onCleanup) => {
      let active = true
      onCleanup(() => {
        active = false
      })

      checking.value = true
      void Promise.all(
        capabilities.map(async (capability) => ({
          capability,
          allowed: await access.can(capability),
        })),
      )
        .then((results) => {
          if (!active) return
          allowed.value = new Set(
            results.filter((result) => result.allowed).map((result) => result.capability),
          )
        })
        .catch(() => {
          if (active) allowed.value = new Set()
        })
        .finally(() => {
          if (active) checking.value = false
        })
    },
    { immediate: true },
  )

  return {
    checking: readonly(checking),
    can: (capability) => allowed.value.has(capability),
  }
}
