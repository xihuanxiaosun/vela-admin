import type { VuetifyOptions } from 'vuetify'

type VuetifyDefaultsOptions = NonNullable<VuetifyOptions['defaults']>

export type VelaDensity = 'compact' | 'comfortable' | 'default'

export interface VelaDefaultsOptions {
  readonly density?: VelaDensity
  readonly rounded?: string | number | boolean
  readonly overrides?: VuetifyDefaultsOptions
}

function mergeRecords(
  base: Readonly<Record<string, unknown>>,
  override: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(override)) {
    const current = result[key]
    result[key] =
      current !== null &&
      value !== null &&
      typeof current === 'object' &&
      typeof value === 'object' &&
      !Array.isArray(current) &&
      !Array.isArray(value)
        ? mergeRecords(current as Record<string, unknown>, value as Record<string, unknown>)
        : value
  }

  return result
}

export function createVelaDefaults(options: VelaDefaultsOptions = {}): VuetifyDefaultsOptions {
  const density = options.density ?? 'comfortable'
  const rounded = options.rounded ?? 'lg'
  const fieldDefaults = {
    color: 'primary',
    rounded,
    variant: 'outlined',
  } as const
  const defaults: VuetifyDefaultsOptions = {
    global: {
      density,
      ripple: true,
    },
    VAlert: {
      border: 'start',
      rounded,
      variant: 'tonal',
    },
    VAvatar: {
      color: 'surface-variant',
      size: 36,
    },
    VBtn: {
      elevation: 0,
      height: 'var(--v-control-height-md)',
      rounded,
      variant: 'flat',
    },
    VCard: {
      elevation: 0,
      rounded: 'xl',
      variant: 'flat',
    },
    VChip: {
      rounded: 'lg',
      size: 'small',
      variant: 'tonal',
    },
    VDialog: {
      maxWidth: 640,
      scrollable: true,
    },
    VFileInput: {
      ...fieldDefaults,
      clearable: true,
    },
    VList: {
      density,
      rounded,
    },
    VMenu: {
      closeOnContentClick: true,
      transition: 'fade-transition',
    },
    VSelect: {
      ...fieldDefaults,
      clearable: true,
      hideDetails: 'auto',
    },
    VAutocomplete: {
      ...fieldDefaults,
      clearable: true,
      hideDetails: 'auto',
    },
    VCombobox: {
      ...fieldDefaults,
      clearable: true,
      hideDetails: 'auto',
    },
    VNumberInput: {
      ...fieldDefaults,
      hideDetails: 'auto',
    },
    VTextField: {
      ...fieldDefaults,
      clearable: false,
      hideDetails: 'auto',
    },
    VTextarea: {
      ...fieldDefaults,
      autoGrow: true,
      hideDetails: 'auto',
    },
    VCheckbox: {
      color: 'primary',
      hideDetails: 'auto',
    },
    VRadioGroup: {
      color: 'primary',
      hideDetails: 'auto',
    },
    VSwitch: {
      color: 'primary',
      hideDetails: 'auto',
    },
    VTooltip: {
      location: 'top',
      openDelay: 400,
    },
  }

  return mergeRecords(defaults, options.overrides ?? {}) as VuetifyDefaultsOptions
}
