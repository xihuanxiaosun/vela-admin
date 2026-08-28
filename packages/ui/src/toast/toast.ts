import { shallowRef, type Ref } from 'vue'
import type { SnackbarQueueMessage } from 'vuetify'

import type { SemanticTone } from '../types'
import { colorForTone } from '../utils/semantics'

export interface ToastOptions {
  readonly text: string
  readonly title?: string
  readonly tone?: SemanticTone
  readonly timeout?: number
  readonly icon?: string | false
}

export type ToastPresetOptions = Omit<ToastOptions, 'text' | 'tone'>

export interface ToastController {
  readonly messages: Readonly<Ref<readonly SnackbarQueueMessage[]>>
  readonly show: (options: ToastOptions | string) => void
  readonly success: (text: string, options?: ToastPresetOptions) => void
  readonly error: (text: string, options?: ToastPresetOptions) => void
  readonly warning: (text: string, options?: ToastPresetOptions) => void
  readonly info: (text: string, options?: ToastPresetOptions) => void
  readonly clear: () => void
  readonly replace: (messages: readonly SnackbarQueueMessage[]) => void
}

export function createToastController(): ToastController {
  const messages = shallowRef<readonly SnackbarQueueMessage[]>([])
  const show = (input: ToastOptions | string) => {
    const options = typeof input === 'string' ? { text: input } : input
    const tone = options.tone ?? 'neutral'
    const toneColor = colorForTone(tone)
    const defaultIcon = tone === 'danger' ? '$error' : `$${tone === 'neutral' ? 'info' : tone}`
    messages.value = [
      ...messages.value,
      {
        class: `va-toast-host va-toast-message va-toast-message--${tone}`,
        color: 'surface',
        text: options.text,
        timeout: options.timeout ?? 5000,
        timer: true,
        timerColor: toneColor ?? 'primary',
        variant: 'flat',
        ...(options.title ? { title: options.title } : {}),
        ...(options.icon === false ? {} : { prependIcon: options.icon ?? defaultIcon }),
      },
    ]
  }

  return {
    messages,
    show,
    success: (text, options = {}) => show({ ...options, text, tone: 'success' }),
    error: (text, options = {}) =>
      show({ ...options, text, tone: 'danger', timeout: options.timeout ?? 8000 }),
    warning: (text, options = {}) => show({ ...options, text, tone: 'warning' }),
    info: (text, options = {}) => show({ ...options, text, tone: 'info' }),
    clear: () => {
      messages.value = []
    },
    replace: (value) => {
      messages.value = [...value]
    },
  }
}
