import { markRaw, type Component } from 'vue'
import {
  VAutocomplete,
  VCheckbox,
  VCombobox,
  VNumberInput,
  VSelect,
  VSlider,
  VSwitch,
  VTextField,
  VTextarea,
} from 'vuetify/components'

import VaRadioField from './VaRadioField.vue'
import type { FormFieldKind, FormFieldSchema, FormOption } from './schema'

export type FormFieldPresentationSchema = Pick<
  FormFieldSchema,
  | 'key'
  | 'kind'
  | 'renderer'
  | 'label'
  | 'hint'
  | 'placeholder'
  | 'options'
  | 'multiple'
  | 'clearable'
  | 'required'
  | 'layout'
  | 'props'
>

export interface FormFieldRenderContext {
  readonly field: FormFieldPresentationSchema
  readonly values: Readonly<Record<string, unknown>>
  readonly value: unknown
  readonly options: readonly FormOption[]
  readonly optionsLoading: boolean
  readonly optionsError: unknown
  readonly search: string
}

export interface FormFieldRenderer {
  readonly component: Component
  readonly mapValue?: (value: unknown) => unknown
  readonly props?: (context: FormFieldRenderContext) => Readonly<Record<string, unknown>>
}

export type FormFieldRegistry = Readonly<Record<string, FormFieldRenderer>>

const textField = markRaw(VTextField)
const optionProps = (context: FormFieldRenderContext) => ({
  items: context.options,
  itemTitle: 'title',
  itemValue: 'value',
  multiple: context.field.multiple ?? false,
  clearable: context.field.clearable ?? true,
})

const defaultRegistry: FormFieldRegistry = Object.freeze({
  text: { component: textField, props: () => ({ type: 'text' }) },
  password: { component: textField, props: () => ({ type: 'password' }) },
  email: { component: textField, props: () => ({ type: 'email' }) },
  tel: { component: textField, props: () => ({ type: 'tel' }) },
  url: { component: textField, props: () => ({ type: 'url' }) },
  date: { component: textField, props: () => ({ type: 'date' }) },
  datetime: { component: textField, props: () => ({ type: 'datetime-local' }) },
  textarea: { component: markRaw(VTextarea) },
  number: {
    component: markRaw(VNumberInput),
    mapValue: (value) => (value === undefined ? null : value),
  },
  select: { component: markRaw(VSelect), props: optionProps },
  autocomplete: {
    component: markRaw(VAutocomplete),
    props: (context) => ({
      ...optionProps(context),
      loading: context.optionsLoading,
      search: context.search,
    }),
  },
  combobox: {
    component: markRaw(VCombobox),
    props: (context) => ({
      ...optionProps(context),
      loading: context.optionsLoading,
      search: context.search,
    }),
  },
  checkbox: { component: markRaw(VCheckbox), mapValue: Boolean },
  switch: { component: markRaw(VSwitch), mapValue: Boolean },
  radio: { component: markRaw(VaRadioField), props: optionProps },
  slider: { component: markRaw(VSlider) },
})

export function createFormFieldRegistry(extensions: FormFieldRegistry = {}): FormFieldRegistry {
  return Object.freeze({ ...defaultRegistry, ...extensions })
}

export function resolveFormFieldRenderer(
  field: Pick<FormFieldSchema, 'kind' | 'renderer' | 'key'>,
  registry: FormFieldRegistry,
): FormFieldRenderer {
  const rendererKey = field.kind === 'custom' ? field.renderer : field.kind
  if (!rendererKey) throw new Error(`${field.key}: custom form fields require a renderer key`)
  const renderer = registry[rendererKey]
  if (!renderer) throw new Error(`${field.key}: unknown form field renderer "${rendererKey}"`)
  return renderer
}

export function isSearchableField(kind: FormFieldKind): boolean {
  return kind === 'autocomplete' || kind === 'combobox'
}
