import {
  computed,
  inject,
  readonly,
  shallowRef,
  type App,
  type ComputedRef,
  type InjectionKey,
  type Plugin,
  type Ref,
} from 'vue'

import { velaEnglishMessages, type VelaMessageKey, type VelaMessages } from './messages'
import { velaSimplifiedChineseMessages } from './messages.zh-CN'

export type VelaTextDirection = 'ltr' | 'rtl'
export type VelaMessageParameter = string | number | boolean | null | undefined
export type VelaMessageParameters = Readonly<Record<string, VelaMessageParameter>>

export interface VelaTranslateContext {
  readonly locale: string
  readonly fallbackLocale: string
  readonly parameters: VelaMessageParameters
}

export type VelaTranslate = (
  key: string,
  context: VelaTranslateContext,
) => string | null | undefined

export interface VelaLocaleOptions {
  readonly locale?: string
  readonly fallbackLocale?: string
  readonly direction?: VelaTextDirection
  readonly messages?: Readonly<Record<string, VelaMessages>>
  readonly translate?: VelaTranslate
  readonly root?: HTMLElement | null
}

export interface VelaLocaleController {
  readonly locale: Readonly<Ref<string>>
  readonly fallbackLocale: string
  readonly direction: ComputedRef<VelaTextDirection>
  readonly t: (key: VelaMessageKey | (string & {}), parameters?: VelaMessageParameters) => string
  readonly setLocale: (locale: string, direction?: VelaTextDirection) => void
  readonly setDirection: (direction?: VelaTextDirection) => void
  readonly registerMessages: (locale: string, messages: VelaMessages) => void
}

export type VelaLocale = VelaLocaleController & Plugin

export const VELA_LOCALE_KEY: InjectionKey<VelaLocaleController> = Symbol.for('vela:locale')

const rtlLanguages = new Set(['ar', 'ckb', 'dv', 'fa', 'he', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi'])

function normalizeLocale(value: string | undefined, fallback: string): string {
  const normalized = value?.trim().replaceAll('_', '-')
  return normalized === undefined || normalized === '' ? fallback : normalized
}

function baseLanguage(locale: string): string {
  const language = locale.split('-')[0]
  return language?.toLowerCase() ?? locale.toLowerCase()
}

function inferDirection(locale: string): VelaTextDirection {
  return rtlLanguages.has(baseLanguage(locale)) ? 'rtl' : 'ltr'
}

function interpolate(message: string, parameters: VelaMessageParameters): string {
  return message.replace(/\{([\w.-]+)\}/g, (token, key: string) => {
    const value = parameters[key]
    return value === undefined || value === null ? token : String(value)
  })
}

function rootElement(explicitRoot?: HTMLElement | null): HTMLElement | undefined {
  if (explicitRoot === null) return undefined
  if (explicitRoot) return explicitRoot
  return typeof document === 'undefined' ? undefined : document.documentElement
}

function createController(options: VelaLocaleOptions = {}): VelaLocaleController {
  const fallbackLocale = normalizeLocale(options.fallbackLocale, 'en')
  const locale = shallowRef(normalizeLocale(options.locale, fallbackLocale))
  const directionOverride = shallowRef<VelaTextDirection | undefined>(options.direction)
  const messages = shallowRef<Record<string, VelaMessages>>({
    en: velaEnglishMessages,
    zh: velaSimplifiedChineseMessages,
    'zh-CN': velaSimplifiedChineseMessages,
    ...options.messages,
  })
  const root = rootElement(options.root)
  const direction = computed(() => directionOverride.value ?? inferDirection(locale.value))

  function applyRoot(): void {
    if (!root) return
    root.lang = locale.value
    root.dir = direction.value
  }

  function messageFor(targetLocale: string, key: string): string | undefined {
    return messages.value[targetLocale]?.[key] ?? messages.value[baseLanguage(targetLocale)]?.[key]
  }

  function translate(key: string, parameters: VelaMessageParameters = {}): string {
    const external = options.translate?.(key, {
      locale: locale.value,
      fallbackLocale,
      parameters,
    })
    if (external !== null && external !== undefined) return interpolate(external, parameters)

    const englishMessages: VelaMessages = velaEnglishMessages
    const message =
      messageFor(locale.value, key) ??
      messageFor(fallbackLocale, key) ??
      englishMessages[key] ??
      key
    return interpolate(message, parameters)
  }

  applyRoot()

  return {
    locale: readonly(locale),
    fallbackLocale,
    direction,
    t: translate,
    setLocale(nextLocale, nextDirection) {
      locale.value = normalizeLocale(nextLocale, fallbackLocale)
      directionOverride.value = nextDirection
      applyRoot()
    },
    setDirection(nextDirection) {
      directionOverride.value = nextDirection
      applyRoot()
    },
    registerMessages(targetLocale, additions) {
      const normalized = normalizeLocale(targetLocale, fallbackLocale)
      messages.value = {
        ...messages.value,
        [normalized]: { ...messages.value[normalized], ...additions },
      }
    },
  }
}

const defaultController = createController({ root: null })

export function createVelaLocale(options: VelaLocaleOptions = {}): VelaLocale {
  const controller = createController(options)
  return Object.assign(controller, {
    install(app: App): void {
      app.provide(VELA_LOCALE_KEY, controller)
    },
  })
}

export function useVelaLocale(): VelaLocaleController {
  return inject(VELA_LOCALE_KEY, defaultController)
}
