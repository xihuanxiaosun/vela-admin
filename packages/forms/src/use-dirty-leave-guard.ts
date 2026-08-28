import { computed, onScopeDispose, shallowRef, type ComputedRef, type Ref } from 'vue'
import type { Awaitable } from '@vela-admin/contracts'

export interface BeforeUnloadTarget {
  addEventListener(type: 'beforeunload', listener: (event: BeforeUnloadEvent) => void): void
  removeEventListener(type: 'beforeunload', listener: (event: BeforeUnloadEvent) => void): void
}

export interface DirtyLeaveContext {
  readonly reason: 'navigation' | 'programmatic'
}

export interface UseDirtyLeaveGuardOptions {
  readonly dirty: Readonly<Ref<boolean>>
  readonly confirm: (context: DirtyLeaveContext) => Awaitable<boolean>
  readonly beforeUnloadTarget?: BeforeUnloadTarget | null
}

export interface DirtyLeaveGuard {
  readonly confirming: Readonly<Ref<boolean>>
  readonly blocked: ComputedRef<boolean>
  readonly canLeave: (reason?: DirtyLeaveContext['reason']) => Promise<boolean>
  readonly dispose: () => void
}

function defaultBeforeUnloadTarget(): BeforeUnloadTarget | null {
  return typeof window === 'undefined' ? null : window
}

/**
 * Coordinates browser-close protection and router-agnostic async confirmation.
 * Pass `canLeave()` to the navigation guard API supplied by the host router.
 */
export function useDirtyLeaveGuard(options: UseDirtyLeaveGuardOptions): DirtyLeaveGuard {
  const target =
    options.beforeUnloadTarget === undefined
      ? defaultBeforeUnloadTarget()
      : options.beforeUnloadTarget
  const confirming = shallowRef(false)
  let pendingConfirmation: Promise<boolean> | undefined
  const disposed = shallowRef(false)

  const onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!options.dirty.value || disposed.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  target?.addEventListener('beforeunload', onBeforeUnload)

  const dispose = (): void => {
    if (disposed.value) return
    disposed.value = true
    target?.removeEventListener('beforeunload', onBeforeUnload)
  }

  const canLeave = async (reason: DirtyLeaveContext['reason'] = 'navigation'): Promise<boolean> => {
    if (disposed.value || !options.dirty.value) return true
    if (pendingConfirmation) return pendingConfirmation

    confirming.value = true
    pendingConfirmation = Promise.resolve(options.confirm({ reason }))
      .then((accepted) => Boolean(accepted))
      .finally(() => {
        confirming.value = false
        pendingConfirmation = undefined
      })
    return pendingConfirmation
  }

  onScopeDispose(dispose)

  return {
    confirming,
    blocked: computed(() => options.dirty.value && !disposed.value),
    canLeave,
    dispose,
  }
}
