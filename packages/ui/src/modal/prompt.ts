import { computed, shallowRef, type ComputedRef } from 'vue'
import type { Awaitable } from '@vela-admin/contracts'

import type { SemanticIntent } from '../types'

export interface PromptOptions {
  readonly title: string
  readonly message?: string
  readonly label: string
  readonly initialValue?: string
  readonly placeholder?: string
  readonly confirmText?: string
  readonly cancelText?: string
  readonly intent?: Extract<SemanticIntent, 'primary' | 'danger' | 'warning'>
  readonly persistent?: boolean
  readonly validate?: (value: string) => Awaitable<string | undefined>
}

interface PendingPrompt {
  readonly options: PromptOptions
  readonly resolve: (value: string | undefined) => void
}

export interface PromptController {
  readonly current: ComputedRef<PromptOptions | undefined>
  readonly prompt: (options: PromptOptions) => Promise<string | undefined>
  readonly accept: (value: string) => void
  readonly cancel: () => void
}

export function createPromptController(): PromptController {
  const active = shallowRef<PendingPrompt>()
  const queue: PendingPrompt[] = []

  const advance = () => {
    active.value = queue.shift()
  }

  const resolveActive = (value: string | undefined) => {
    const pending = active.value
    if (!pending) return
    active.value = undefined
    pending.resolve(value)
    advance()
  }

  return {
    current: computed(() => active.value?.options),
    prompt: (options) =>
      new Promise<string | undefined>((resolve) => {
        queue.push({ options, resolve })
        if (!active.value) advance()
      }),
    accept: (value) => resolveActive(value),
    cancel: () => resolveActive(undefined),
  }
}
