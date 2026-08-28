import { inject, type App, type InjectionKey, type Plugin } from 'vue'

import {
  createGlobalLoadingController,
  type GlobalLoadingController,
  type GlobalLoadingDefaults,
} from '../loading/global-loading'
import {
  createConfirmController,
  type ConfirmController,
  type ConfirmOptions,
} from '../modal/confirm'
import { createPromptController, type PromptController, type PromptOptions } from '../modal/prompt'
import { createToastController, type ToastController } from '../toast/toast'

export interface VelaFeedbackOptions {
  readonly loading?: GlobalLoadingDefaults
}

export interface VelaFeedbackService {
  readonly toast: ToastController
  readonly loading: GlobalLoadingController
  readonly confirm: (options: ConfirmOptions) => Promise<boolean>
  readonly prompt: (options: PromptOptions) => Promise<string | undefined>
  readonly confirmation: ConfirmController
  readonly prompting: PromptController
}

export type VelaFeedback = VelaFeedbackService & Plugin

export const VELA_FEEDBACK_KEY: InjectionKey<VelaFeedbackService> = Symbol('vela-feedback')

export function createFeedbackService(options: VelaFeedbackOptions = {}): VelaFeedbackService {
  const confirmation = createConfirmController()
  const prompting = createPromptController()

  return {
    toast: createToastController(),
    loading: createGlobalLoadingController(options.loading),
    confirm: confirmation.confirm,
    prompt: prompting.prompt,
    confirmation,
    prompting,
  }
}

export function createVelaFeedback(options: VelaFeedbackOptions = {}): VelaFeedback {
  const service = createFeedbackService(options)
  return {
    ...service,
    install(app: App): void {
      app.provide(VELA_FEEDBACK_KEY, service)
    },
  } as VelaFeedback
}

export function useFeedback(): VelaFeedbackService {
  const service = inject(VELA_FEEDBACK_KEY)
  if (!service) {
    throw new Error(
      'Vela feedback is not installed. Call app.use(createVelaFeedback()) before useFeedback().',
    )
  }
  return service
}
