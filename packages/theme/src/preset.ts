import type { VuetifyOptions } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { en, zhHans } from 'vuetify/locale'

import { createVelaDefaults, type VelaDefaultsOptions } from './defaults'
import { velaIconAliases } from './icons'
import { createVelaTheme, type VelaThemeOptions } from './theme'
import { velaBreakpoints } from './tokens'

export interface VelaPresetOptions {
  readonly theme?: VelaThemeOptions
  readonly defaults?: VelaDefaultsOptions
  readonly vuetify?: Omit<VuetifyOptions, 'theme' | 'defaults' | 'display'>
}

export function createVelaPreset(options: VelaPresetOptions = {}): VuetifyOptions {
  const iconOptions = options.vuetify?.icons
  const localeOptions = options.vuetify?.locale
  return {
    ...options.vuetify,
    defaults: createVelaDefaults(options.defaults),
    display: {
      mobileBreakpoint: 'md',
      thresholds: velaBreakpoints,
    },
    icons: {
      ...iconOptions,
      defaultSet: iconOptions?.defaultSet ?? 'mdi',
      aliases: { ...aliases, ...velaIconAliases, ...iconOptions?.aliases },
      sets: { mdi, ...iconOptions?.sets },
    },
    locale: {
      ...localeOptions,
      fallback: localeOptions?.fallback ?? 'en',
      locale: localeOptions?.locale ?? 'en',
      messages: {
        en,
        'zh-CN': zhHans,
        ...localeOptions?.messages,
      },
    },
    theme: createVelaTheme(options.theme),
  }
}
