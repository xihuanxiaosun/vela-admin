import { computed, shallowRef, type ComputedRef } from 'vue'

import type { SemanticIntent } from '../types'

export interface ConfirmOptions {
  readonly title: string
  readonly message: string
  readonly confirmText?: string
  readonly cancelText?: string
  readonly intent?: Extract<SemanticIntent, 'primary' | 'danger' | 'warning'>
  readonly persistent?: boolean
}

interface PendingConfirmation {
  readonly options: ConfirmOptions
  readonly resolve: (confirmed: boolean) => void
}

export interface ConfirmController {
  readonly current: ComputedRef<ConfirmOptions | undefined>
  readonly confirm: (options: ConfirmOptions) => Promise<boolean>
  readonly accept: () => void
  readonly cancel: () => void
}

export function createConfirmController(): ConfirmController {
  const active = shallowRef<PendingConfirmation>()
  const queue: PendingConfirmation[] = []

  const advance = () => {
    active.value = queue.shift()
  }

  const resolveActive = (confirmed: boolean) => {
    const pending = active.value
    if (!pending) return
    active.value = undefined
    pending.resolve(confirmed)
    advance()
  }

  return {
    current: computed(() => active.value?.options),
    confirm: (options) =>
      new Promise<boolean>((resolve) => {
        queue.push({ options, resolve })
        if (!active.value) advance()
      }),
    accept: () => resolveActive(true),
    cancel: () => resolveActive(false),
  }
}
