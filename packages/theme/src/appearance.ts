import { computed, readonly, shallowRef, type ComputedRef, type Ref } from 'vue'
import { useTheme, type ThemeInstance, type VuetifyOptions } from 'vuetify'
import type { StorageAdapter } from '@vela-admin/contracts'

import { VELA_DARK_THEME, VELA_LIGHT_THEME } from './theme'
import { velaPalette } from './tokens'

export type VelaThemeMode = 'system' | 'light' | 'dark'
export type VelaMotionPreference = 'system' | 'full' | 'reduced'
export type VelaRadiusPreference = 'compact' | 'balanced' | 'soft'
export type VelaAppearanceDensity = 'compact' | 'comfortable' | 'default'
export type VelaSkinPreference = 'default' | 'bordered' | 'semi-dark'
export type VelaFontScalePreference = 'small' | 'default' | 'large'
export type VelaContrastPreference = 'standard' | 'high'

export interface VelaAppearancePreferences {
  readonly mode: VelaThemeMode
  readonly primary: string
  readonly skin: VelaSkinPreference
  readonly density: VelaAppearanceDensity
  readonly radius: VelaRadiusPreference
  readonly surfaceOpacity: number
  readonly motion: VelaMotionPreference
  readonly fontScale: VelaFontScalePreference
  readonly contrast: VelaContrastPreference
}

export interface VelaAppearanceOptions {
  readonly storage?: StorageAdapter
  readonly storageKey?: string
  readonly defaults?: Partial<VelaAppearancePreferences>
  readonly root?: HTMLElement
}

export interface VelaAppearanceController {
  readonly preferences: Readonly<Ref<VelaAppearancePreferences>>
  readonly vuetifyDefaults: ComputedRef<NonNullable<VuetifyOptions['defaults']>>
  readonly ready: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<unknown>>
  readonly set: (patch: Partial<VelaAppearancePreferences>) => Promise<void>
  readonly reset: () => Promise<void>
  readonly hydrate: () => Promise<void>
  readonly setTransitionOrigin: (event: PointerEvent | Element | null) => void
}

interface StoredAppearanceV1 {
  readonly version: 1
  readonly preferences: Partial<Omit<VelaAppearancePreferences, 'skin' | 'fontScale' | 'contrast'>>
}

interface StoredAppearanceV2 {
  readonly version: 2
  readonly preferences: Partial<Omit<VelaAppearancePreferences, 'fontScale' | 'contrast'>>
}

interface StoredAppearanceV3 {
  readonly version: 3
  readonly preferences: Partial<VelaAppearancePreferences>
}

type StoredAppearance = StoredAppearanceV1 | StoredAppearanceV2 | StoredAppearanceV3

const STORAGE_KEY = 'vela.appearance'
const HEX_COLOR = /^#[\da-f]{6}$/i
const themeModes = new Set<VelaThemeMode>(['system', 'light', 'dark'])
const skins = new Set<VelaSkinPreference>(['default', 'bordered', 'semi-dark'])
const densities = new Set<VelaAppearanceDensity>(['compact', 'comfortable', 'default'])
const radii = new Set<VelaRadiusPreference>(['compact', 'balanced', 'soft'])
const motions = new Set<VelaMotionPreference>(['system', 'full', 'reduced'])
const fontScales = new Set<VelaFontScalePreference>(['small', 'default', 'large'])
const contrasts = new Set<VelaContrastPreference>(['standard', 'high'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toUpperCase() : fallback
}

function normalizePreferences(
  value: unknown,
  fallback: VelaAppearancePreferences,
): VelaAppearancePreferences {
  const source = isRecord(value) ? value : {}
  return Object.freeze({
    mode: themeModes.has(source.mode as VelaThemeMode)
      ? (source.mode as VelaThemeMode)
      : fallback.mode,
    primary: normalizeColor(source.primary, fallback.primary),
    skin: skins.has(source.skin as VelaSkinPreference)
      ? (source.skin as VelaSkinPreference)
      : fallback.skin,
    density: densities.has(source.density as VelaAppearanceDensity)
      ? (source.density as VelaAppearanceDensity)
      : fallback.density,
    radius: radii.has(source.radius as VelaRadiusPreference)
      ? (source.radius as VelaRadiusPreference)
      : fallback.radius,
    surfaceOpacity:
      typeof source.surfaceOpacity === 'number' && Number.isFinite(source.surfaceOpacity)
        ? Math.min(1, Math.max(0.72, source.surfaceOpacity))
        : fallback.surfaceOpacity,
    motion: motions.has(source.motion as VelaMotionPreference)
      ? (source.motion as VelaMotionPreference)
      : fallback.motion,
    fontScale: fontScales.has(source.fontScale as VelaFontScalePreference)
      ? (source.fontScale as VelaFontScalePreference)
      : fallback.fontScale,
    contrast: contrasts.has(source.contrast as VelaContrastPreference)
      ? (source.contrast as VelaContrastPreference)
      : fallback.contrast,
  })
}

function toRgb(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

function toHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase()
}

function mixWithWhite(color: string, amount: number): string {
  const [red, green, blue] = toRgb(color)
  return toHex(
    red + (255 - red) * amount,
    green + (255 - green) * amount,
    blue + (255 - blue) * amount,
  )
}

function relativeLuminance(color: string): number {
  const channels = toRgb(color).map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
}

function foregroundFor(color: string): string {
  return relativeLuminance(color) > 0.42 ? '#0F172A' : '#FFFFFF'
}

function updatePrimary(theme: ThemeInstance, primary: string): void {
  const themes = theme.themes.value
  const light = themes[VELA_LIGHT_THEME]
  const dark = themes[VELA_DARK_THEME]
  if (!light || !dark) return

  const darkPrimary = mixWithWhite(primary, 0.18)
  theme.themes.value = {
    ...themes,
    [VELA_LIGHT_THEME]: {
      ...light,
      colors: { ...light.colors, primary, 'on-primary': foregroundFor(primary) },
    },
    [VELA_DARK_THEME]: {
      ...dark,
      colors: { ...dark.colors, primary: darkPrimary, 'on-primary': foregroundFor(darkPrimary) },
    },
  }
}

function radiusFor(preference: VelaRadiusPreference): string {
  if (preference === 'compact') return 'sm'
  if (preference === 'soft') return 'xl'
  return 'lg'
}

function rootElement(explicitRoot?: HTMLElement): HTMLElement | undefined {
  if (explicitRoot) return explicitRoot
  return typeof document === 'undefined' ? undefined : document.documentElement
}

function applyRootPreferences(
  root: HTMLElement | undefined,
  value: VelaAppearancePreferences,
): void {
  if (!root) return
  root.dataset.velaDensity = value.density
  root.dataset.velaRadius = value.radius
  root.dataset.velaMotion = value.motion
  root.dataset.velaSkin = value.skin
  root.dataset.velaFontScale = value.fontScale
  root.dataset.velaContrast = value.contrast
  root.style.setProperty('--v-runtime-surface-opacity', String(value.surfaceOpacity))
}

function initialPrimary(theme: ThemeInstance): string {
  const value = theme.themes.value[VELA_LIGHT_THEME]?.colors.primary
  return normalizeColor(value, velaPalette.indigo[600])
}

export function createVelaAppearanceController(
  theme: ThemeInstance,
  options: VelaAppearanceOptions = {},
): VelaAppearanceController {
  const defaults = normalizePreferences(options.defaults, {
    mode: 'system',
    primary: initialPrimary(theme),
    skin: 'default',
    density: 'comfortable',
    radius: 'balanced',
    surfaceOpacity: 1,
    motion: 'system',
    fontScale: 'default',
    contrast: 'standard',
  })
  const preferences = shallowRef<VelaAppearancePreferences>(defaults)
  const ready = shallowRef(false)
  const error = shallowRef<unknown>()
  const root = rootElement(options.root)
  let revision = 0

  const vuetifyDefaults = computed<NonNullable<VuetifyOptions['defaults']>>(() => ({
    global: { density: preferences.value.density },
    VAlert: { rounded: radiusFor(preferences.value.radius) },
    VBtn: { rounded: radiusFor(preferences.value.radius) },
    VCard: {
      rounded: preferences.value.radius === 'soft' ? 'xl' : radiusFor(preferences.value.radius),
    },
    VChip: { rounded: radiusFor(preferences.value.radius) },
    VList: { rounded: radiusFor(preferences.value.radius) },
  }))

  const apply = async (value: VelaAppearancePreferences): Promise<void> => {
    updatePrimary(theme, value.primary)
    applyRootPreferences(root, value)
    await theme.change(value.mode, value.motion === 'reduced' ? false : true)
  }

  const commit = async (next: VelaAppearancePreferences, persist: boolean): Promise<void> => {
    const currentRevision = ++revision
    preferences.value = next
    error.value = undefined
    try {
      await apply(next)
      if (persist && currentRevision === revision) {
        await options.storage?.set<StoredAppearance>(options.storageKey ?? STORAGE_KEY, {
          version: 3,
          preferences: next,
        })
      }
    } catch (cause) {
      error.value = cause
      throw cause
    }
  }

  const hydrate = async (): Promise<void> => {
    const currentRevision = revision
    error.value = undefined
    try {
      const stored = await options.storage?.get<StoredAppearance>(options.storageKey ?? STORAGE_KEY)
      if (currentRevision !== revision) return
      const storedPreferences =
        stored?.version === 1 || stored?.version === 2 || stored?.version === 3
          ? stored.preferences
          : undefined
      await commit(normalizePreferences(storedPreferences, defaults), false)
    } catch (cause) {
      error.value = cause
      await apply(preferences.value)
    } finally {
      ready.value = true
    }
  }

  const controller: VelaAppearanceController = {
    preferences: readonly(preferences),
    vuetifyDefaults,
    ready: readonly(ready),
    error: readonly(error),
    set: (patch) =>
      commit(normalizePreferences({ ...preferences.value, ...patch }, defaults), true),
    reset: () => commit(defaults, true),
    hydrate,
    setTransitionOrigin: (event) => theme.setTransitionOrigin(event),
  }

  void hydrate().catch(() => undefined)
  return controller
}

export function useVelaAppearance(options: VelaAppearanceOptions = {}): VelaAppearanceController {
  return createVelaAppearanceController(useTheme(), options)
}
