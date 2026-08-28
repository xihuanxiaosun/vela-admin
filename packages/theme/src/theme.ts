import type { ThemeDefinition, VuetifyOptions } from 'vuetify'

import { velaPalette, velaThemeVariables } from './tokens'

// Vuetify resolves the special `system` mode to the literal `light` or `dark`
// theme names. Keep those names canonical so system mode uses the Vela themes
// instead of Vuetify's fallback palette.
export const VELA_LIGHT_THEME = 'light'
export const VELA_DARK_THEME = 'dark'

type VuetifyThemeOptions = Exclude<VuetifyOptions['theme'], false | undefined>

export interface VelaSemanticColors {
  readonly primary: string
  readonly secondary: string
  readonly success: string
  readonly warning: string
  readonly error: string
  readonly info: string
}

export interface VelaSurfaceColors {
  readonly background: string
  readonly surface: string
  readonly 'surface-bright': string
  readonly 'surface-light': string
  readonly 'surface-variant': string
  readonly 'on-background': string
  readonly 'on-surface': string
  readonly 'on-surface-variant': string
  readonly outline: string
  readonly 'outline-variant': string
  readonly navigation: string
  readonly 'on-navigation': string
  readonly 'navigation-dark': string
  readonly 'on-navigation-dark': string
}

export type VelaThemeColors = VelaSemanticColors & VelaSurfaceColors

export interface VelaThemeOptions {
  readonly defaultTheme?: typeof VELA_LIGHT_THEME | typeof VELA_DARK_THEME | 'system'
  readonly lightColors?: Partial<VelaThemeColors>
  readonly darkColors?: Partial<VelaThemeColors>
  readonly variables?: Readonly<Record<string, string | number>>
  readonly additionalThemes?: Readonly<Record<string, ThemeDefinition>>
  readonly transition?: VuetifyThemeOptions['transition']
}

const semanticColors: VelaSemanticColors = {
  primary: velaPalette.indigo[600],
  secondary: velaPalette.slate[600],
  success: velaPalette.emerald[600],
  warning: velaPalette.amber[600],
  error: velaPalette.rose[600],
  info: velaPalette.blue[600],
}

function createLightTheme(
  colors: Partial<VelaThemeColors> = {},
  variables: Readonly<Record<string, string | number>> = {},
): ThemeDefinition {
  return {
    dark: false,
    colors: {
      background: '#F4F5FA',
      surface: velaPalette.slate[0],
      'surface-bright': velaPalette.slate[0],
      'surface-light': '#FAF9FC',
      'surface-variant': '#F0EDF5',
      'on-background': '#302C3F',
      'on-surface': '#302C3F',
      'on-surface-variant': '#6E687A',
      outline: '#CFCAD7',
      'outline-variant': '#E6E3EC',
      navigation: velaPalette.slate[0],
      'on-navigation': '#504A5D',
      'navigation-dark': '#2B273B',
      'on-navigation-dark': '#E9E6F0',
      ...semanticColors,
      ...colors,
      'on-primary': velaPalette.slate[0],
      'on-secondary': velaPalette.slate[0],
      'on-success': velaPalette.slate[0],
      'on-warning': velaPalette.slate[0],
      'on-error': velaPalette.slate[0],
      'on-info': velaPalette.slate[0],
    },
    variables: {
      ...velaThemeVariables,
      'border-color': '#302C3F',
      'border-opacity': 0.12,
      'high-emphasis-opacity': 0.92,
      'medium-emphasis-opacity': 0.74,
      'disabled-opacity': 0.38,
      'idle-opacity': 0.08,
      'hover-opacity': 0.08,
      'focus-opacity': 0.12,
      'selected-opacity': 0.1,
      'activated-opacity': 0.12,
      'pressed-opacity': 0.16,
      'dragged-opacity': 0.12,
      'theme-kbd': velaPalette.slate[800],
      'theme-on-kbd': velaPalette.slate[0],
      'theme-code': velaPalette.slate[50],
      'theme-on-code': velaPalette.slate[800],
      'shadow-color': '47, 43, 61',
      ...variables,
    },
  }
}

function createDarkTheme(
  colors: Partial<VelaThemeColors> = {},
  variables: Readonly<Record<string, string | number>> = {},
): ThemeDefinition {
  return {
    dark: true,
    colors: {
      background: '#28243D',
      surface: '#312D4B',
      'surface-bright': '#3B3654',
      'surface-light': '#37324D',
      'surface-variant': '#3D3759',
      'on-background': '#E7E3FC',
      'on-surface': '#E7E3FC',
      'on-surface-variant': '#B8B2C8',
      outline: '#625B7A',
      'outline-variant': '#47415C',
      navigation: '#312D4B',
      'on-navigation': '#E7E3FC',
      'navigation-dark': '#28243D',
      'on-navigation-dark': '#E7E3FC',
      ...semanticColors,
      primary: velaPalette.indigo[400],
      success: velaPalette.emerald[500],
      warning: velaPalette.amber[500],
      error: velaPalette.rose[500],
      info: velaPalette.blue[500],
      ...colors,
      'on-primary': velaPalette.slate[950],
      'on-secondary': velaPalette.slate[0],
      'on-success': velaPalette.slate[950],
      'on-warning': velaPalette.slate[950],
      'on-error': velaPalette.slate[950],
      'on-info': velaPalette.slate[950],
    },
    variables: {
      ...velaThemeVariables,
      'border-color': '#E7E3FC',
      'border-opacity': 0.12,
      'high-emphasis-opacity': 0.92,
      'medium-emphasis-opacity': 0.74,
      'disabled-opacity': 0.42,
      'idle-opacity': 0.1,
      'hover-opacity': 0.1,
      'focus-opacity': 0.14,
      'selected-opacity': 0.12,
      'activated-opacity': 0.14,
      'pressed-opacity': 0.18,
      'dragged-opacity': 0.16,
      'theme-kbd': velaPalette.slate[200],
      'theme-on-kbd': velaPalette.slate[900],
      'theme-code': velaPalette.slate[800],
      'theme-on-code': velaPalette.slate[100],
      'shadow-color': '11, 9, 18',
      ...variables,
    },
  }
}

export function createVelaTheme(options: VelaThemeOptions = {}): VuetifyThemeOptions {
  return {
    defaultTheme: options.defaultTheme ?? 'system',
    themes: {
      [VELA_LIGHT_THEME]: createLightTheme(options.lightColors, options.variables),
      [VELA_DARK_THEME]: createDarkTheme(options.darkColors, options.variables),
      ...options.additionalThemes,
    },
    transition: options.transition ?? {
      duration: 'var(--v-motion-duration-standard)',
    },
    variations: {
      colors: ['primary', 'secondary'],
      lighten: 2,
      darken: 2,
    },
  }
}
