import { describe, expect, it } from 'vitest'
import { createVuetify } from 'vuetify'
import type { StorageAdapter } from '@vela-admin/contracts'

import {
  createVelaAppearanceController,
  createVelaDefaults,
  createVelaPreset,
  createVelaTheme,
  VELA_DARK_THEME,
  VELA_LIGHT_THEME,
} from './index'

function createMemoryStorage(initial?: unknown): StorageAdapter {
  const values = new Map<string, unknown>(
    initial === undefined ? [] : [['vela.appearance', initial]],
  )
  return {
    get: <TValue>(key: string) => values.get(key) as TValue | undefined,
    set: <TValue>(key: string, value: TValue) => {
      values.set(key, value)
    },
    remove: (key: string) => {
      values.delete(key)
    },
  }
}

describe('Vela theme preset', () => {
  it('ships light and dark themes with system mode by default', () => {
    const theme = createVelaTheme()

    expect(theme.defaultTheme).toBe('system')
    expect(theme.themes).toHaveProperty(VELA_LIGHT_THEME)
    expect(theme.themes).toHaveProperty(VELA_DARK_THEME)
  })

  it('supports semantic color and defaults overrides', () => {
    const preset = createVelaPreset({
      theme: { lightColors: { primary: '#123456' } },
      defaults: {
        density: 'compact',
        overrides: { VBtn: { rounded: 'pill' } },
      },
    })

    const themes = preset.theme === false ? undefined : preset.theme?.themes
    expect(themes?.[VELA_LIGHT_THEME]?.colors?.primary).toBe('#123456')
    expect(preset.defaults?.global?.density).toBe('compact')
    expect(preset.defaults?.VBtn?.rounded).toBe('pill')
  })

  it('ships English and Simplified Chinese Vuetify catalogs while allowing overrides', () => {
    const preset = createVelaPreset()
    const overridden = createVelaPreset({
      vuetify: { locale: { locale: 'zh-CN', messages: { custom: { badge: 'Custom' } } } },
    })

    expect(preset.locale?.messages).toHaveProperty('en')
    expect(preset.locale?.messages).toHaveProperty('zh-CN')
    expect(overridden.locale?.locale).toBe('zh-CN')
    expect(overridden.locale?.messages).toHaveProperty('custom')
  })

  it('does not mutate overrides passed to defaults', () => {
    const overrides = { VBtn: { rounded: 'pill' } }
    createVelaDefaults({ overrides })
    expect(overrides).toEqual({ VBtn: { rounded: 'pill' } })
  })

  it('keeps native form controls visually coherent through Vuetify defaults', () => {
    const defaults = createVelaDefaults({ rounded: 'xl' })

    expect(defaults.global?.density).toBe('comfortable')
    expect(defaults.VTextField).toMatchObject({
      color: 'primary',
      hideDetails: 'auto',
      rounded: 'xl',
      variant: 'outlined',
    })
    expect(defaults.VSelect).toMatchObject({
      clearable: true,
      color: 'primary',
      rounded: 'xl',
      variant: 'outlined',
    })
    expect(defaults.VSwitch).toMatchObject({ color: 'primary', hideDetails: 'auto' })
  })

  it('hydrates, validates, and applies runtime appearance preferences', async () => {
    const vuetify = createVuetify(createVelaPreset())
    const root = document.createElement('div')
    const storage = createMemoryStorage({
      version: 1,
      preferences: {
        mode: 'dark',
        primary: '#10b981',
        density: 'compact',
        surfaceOpacity: 0.2,
      },
    })
    const appearance = createVelaAppearanceController(vuetify.theme, { storage, root })

    await appearance.hydrate()

    expect(appearance.preferences.value).toMatchObject({
      mode: 'dark',
      primary: '#10B981',
      skin: 'default',
      density: 'compact',
      surfaceOpacity: 0.72,
      fontScale: 'default',
      contrast: 'standard',
    })
    expect(vuetify.theme.name.value).toBe('dark')
    expect(vuetify.theme.themes.value.light?.colors.primary).toBe('#10B981')
    expect(root.dataset.velaDensity).toBe('compact')
    expect(root.dataset.velaSkin).toBe('default')
    expect(root.dataset.velaFontScale).toBe('default')
    expect(root.dataset.velaContrast).toBe('standard')
    expect(root.style.getPropertyValue('--v-runtime-surface-opacity')).toBe('0.72')
    expect(appearance.vuetifyDefaults.value.global).toEqual({ density: 'compact' })
  })

  it('normalizes and persists accessibility preferences in the current schema', async () => {
    const writes: unknown[] = []
    const vuetify = createVuetify(createVelaPreset())
    const root = document.createElement('div')
    const storage: StorageAdapter = {
      get: <TValue>() =>
        ({
          version: 3,
          preferences: { fontScale: 'invalid', contrast: 'high', motion: 'reduced' },
        }) as TValue,
      set: (_key, value) => {
        writes.push(value)
      },
      remove: () => undefined,
    }
    const appearance = createVelaAppearanceController(vuetify.theme, { storage, root })

    await appearance.hydrate()
    expect(appearance.preferences.value.fontScale).toBe('default')
    expect(appearance.preferences.value.contrast).toBe('high')
    expect(root.dataset.velaContrast).toBe('high')

    await appearance.set({ fontScale: 'large', contrast: 'standard' })
    expect(root.dataset.velaFontScale).toBe('large')
    expect(writes.at(-1)).toMatchObject({
      version: 3,
      preferences: { fontScale: 'large', contrast: 'standard' },
    })
  })
})
