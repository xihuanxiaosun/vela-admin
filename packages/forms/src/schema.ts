import type { Awaitable } from '@vela-admin/contracts'

import type { FormPath } from './path'

export type FormFieldKind =
  | 'text'
  | 'password'
  | 'email'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'number'
  | 'select'
  | 'autocomplete'
  | 'combobox'
  | 'checkbox'
  | 'switch'
  | 'radio'
  | 'slider'
  | 'date'
  | 'datetime'
  | 'custom'

export interface FormOption {
  readonly title: string
  readonly value: string | number | boolean | null
  readonly disabled?: boolean
  readonly subtitle?: string
  readonly icon?: string
}

export interface FormOptionLoadContext<TValues = Record<string, unknown>> {
  readonly values: Readonly<TValues>
  readonly query: string
  readonly signal: AbortSignal
}

export interface FormOptionSource<TValues = Record<string, unknown>> {
  readonly load: (context: FormOptionLoadContext<TValues>) => Awaitable<readonly FormOption[]>
  readonly dependsOn?: readonly FormPath[]
  readonly debounceMs?: number
  readonly minQueryLength?: number
  readonly cache?: boolean
  readonly cacheKey?: (context: Omit<FormOptionLoadContext<TValues>, 'signal'>) => string
  readonly errorMessage?: string
}

export interface FormValueTransform<TValues = Record<string, unknown>> {
  readonly toInput?: (value: unknown, values: Readonly<TValues>) => unknown
  readonly fromInput?: (value: unknown, values: Readonly<TValues>) => unknown
}

export interface FormFieldLayout {
  readonly cols?: number
  readonly sm?: number
  readonly md?: number
  readonly lg?: number
  readonly xl?: number
}

export interface FormFieldSchema<TValues = Record<string, unknown>> {
  readonly key: string
  readonly kind: FormFieldKind
  readonly renderer?: string
  readonly label: string
  readonly hint?: string
  readonly placeholder?: string
  readonly options?: readonly FormOption[]
  readonly optionSource?: FormOptionSource<TValues>
  readonly multiple?: boolean
  readonly clearable?: boolean
  readonly required?: boolean
  readonly readonly?: boolean | ((values: TValues) => boolean)
  readonly disabled?: boolean | ((values: TValues) => boolean)
  readonly visible?: (values: TValues) => boolean
  readonly transform?: FormValueTransform<TValues>
  readonly layout?: FormFieldLayout
  readonly props?: Readonly<Record<string, unknown>>
}

export interface FormSectionSchema<TValues = Record<string, unknown>> {
  readonly key: string
  readonly title?: string
  readonly description?: string
  readonly fields: readonly FormFieldSchema<TValues>[]
}

export interface FormSchema<TValues = Record<string, unknown>> {
  readonly sections: readonly FormSectionSchema<TValues>[]
}
