<script setup lang="ts" generic="TValues extends Record<string, unknown>">
import { computed, onBeforeUnmount, reactive, watchEffect } from 'vue'
import { VCol, VRow } from 'vuetify/components'
import type { FieldErrors } from '@vela-admin/contracts'
import { useVelaLocale } from '@vela-admin/locale'

import {
  createFormFieldRegistry,
  isSearchableField,
  resolveFormFieldRenderer,
  type FormFieldRegistry,
  type FormFieldRenderContext,
} from './field-registry'
import { getFormValue, setFormValue } from './path'
import type { FormFieldSchema, FormOption, FormSchema } from './schema'

const props = withDefaults(
  defineProps<{
    schema: FormSchema<TValues>
    modelValue: TValues
    errors?: FieldErrors
    disabled?: boolean
    readonly?: boolean
    registry?: FormFieldRegistry
  }>(),
  {
    errors: () => ({}),
    disabled: false,
    readonly: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: TValues]
  blur: [key: string]
  'option-error': [key: string, error: unknown]
}>()

interface RuntimeOptionState {
  items: readonly FormOption[]
  loading: boolean
  error: unknown
  query: string
  dependencyKey: string | undefined
  requestKey: string | undefined
  revision: number
}

const locale = useVelaLocale()
const fieldRegistry = computed(() => createFormFieldRegistry(props.registry ?? {}))
const allFields = computed(() => props.schema.sections.flatMap((section) => section.fields))
const optionStates = reactive(new Map<string, RuntimeOptionState>())
const optionCache = new Map<string, readonly FormOption[]>()
const optionControllers = new Map<string, AbortController>()
const optionTimers = new Map<string, ReturnType<typeof setTimeout>>()

function stateFor(field: FormFieldSchema<TValues>): RuntimeOptionState {
  const existing = optionStates.get(field.key)
  if (existing) return existing
  const state: RuntimeOptionState = {
    items: field.options ?? [],
    loading: false,
    error: undefined,
    query: '',
    dependencyKey: undefined,
    requestKey: undefined,
    revision: 0,
  }
  optionStates.set(field.key, state)
  return state
}

function dependencyKey(field: FormFieldSchema<TValues>): string {
  const values = (field.optionSource?.dependsOn ?? []).map((path) =>
    getFormValue(props.modelValue, path),
  )
  try {
    return JSON.stringify(values)
  } catch {
    return values.map(String).join('|')
  }
}

function fieldVisible(field: FormFieldSchema<TValues>): boolean {
  return field.visible?.(props.modelValue) ?? true
}

function fieldDisabled(field: FormFieldSchema<TValues>): boolean {
  return (
    props.disabled ||
    (typeof field.disabled === 'function'
      ? field.disabled(props.modelValue)
      : (field.disabled ?? false))
  )
}

function fieldReadonly(field: FormFieldSchema<TValues>): boolean {
  return (
    props.readonly ||
    (typeof field.readonly === 'function'
      ? field.readonly(props.modelValue)
      : (field.readonly ?? false))
  )
}

function updateField(field: FormFieldSchema<TValues>, inputValue: unknown): void {
  const value = field.transform?.fromInput
    ? field.transform.fromInput(inputValue, props.modelValue)
    : inputValue
  emit('update:modelValue', setFormValue(props.modelValue, field.key, value))
}

function valueUpdater(field: FormFieldSchema<TValues>): (value: unknown) => void {
  return (value) => updateField(field, value)
}

function blurHandler(field: FormFieldSchema<TValues>): () => void {
  return () => emit('blur', field.key)
}

function columnProps(field: FormFieldSchema<TValues>): Record<string, string | number> {
  return {
    cols: field.layout?.cols ?? 12,
    ...(field.layout?.sm === undefined ? {} : { sm: field.layout.sm }),
    ...(field.layout?.md === undefined ? {} : { md: field.layout.md }),
    ...(field.layout?.lg === undefined ? {} : { lg: field.layout.lg }),
    ...(field.layout?.xl === undefined ? {} : { xl: field.layout.xl }),
  }
}

function optionsFor(field: FormFieldSchema<TValues>): readonly FormOption[] {
  return field.optionSource ? stateFor(field).items : (field.options ?? [])
}

function createOptionCacheKey(field: FormFieldSchema<TValues>, query: string): string {
  const source = field.optionSource
  if (!source) return field.key
  const context = { values: props.modelValue as Readonly<TValues>, query }
  return (
    source.cacheKey?.(context) ??
    `${field.key}:${stateFor(field).dependencyKey ?? dependencyKey(field)}:${query}`
  )
}

async function loadOptions(
  field: FormFieldSchema<TValues>,
  query = stateFor(field).query,
  force = false,
): Promise<void> {
  const source = field.optionSource
  if (!source) return
  const state = stateFor(field)
  state.query = query
  const minQueryLength = Math.max(0, source.minQueryLength ?? 0)
  if (query.trim().length < minQueryLength) {
    optionControllers.get(field.key)?.abort()
    state.items = []
    state.loading = false
    state.error = undefined
    state.requestKey = undefined
    return
  }

  const requestKey = createOptionCacheKey(field, query)
  if (!force && state.requestKey === requestKey && !state.error) return
  if (!force && source.cache !== false && optionCache.has(requestKey)) {
    state.items = optionCache.get(requestKey) ?? []
    state.requestKey = requestKey
    state.error = undefined
    return
  }

  optionControllers.get(field.key)?.abort()
  const controller = new AbortController()
  optionControllers.set(field.key, controller)
  const revision = ++state.revision
  state.loading = true
  state.error = undefined

  try {
    const items = await source.load({
      values: props.modelValue,
      query,
      signal: controller.signal,
    })
    controller.signal.throwIfAborted()
    if (revision !== state.revision) return
    state.items = [...items]
    state.requestKey = requestKey
    if (source.cache !== false) optionCache.set(requestKey, state.items)
  } catch (error) {
    if (controller.signal.aborted || revision !== state.revision) return
    state.error = error
    emit('option-error', field.key, error)
  } finally {
    if (revision === state.revision) {
      state.loading = false
      optionControllers.delete(field.key)
    }
  }
}

function queueOptionLoad(
  field: FormFieldSchema<TValues>,
  query: string,
  delay = field.optionSource?.debounceMs ?? 160,
  force = false,
): void {
  const currentTimer = optionTimers.get(field.key)
  if (currentTimer) clearTimeout(currentTimer)
  const timer = setTimeout(
    () => {
      optionTimers.delete(field.key)
      void loadOptions(field, query, force)
    },
    Math.max(0, delay),
  )
  optionTimers.set(field.key, timer)
}

function updateSearch(field: FormFieldSchema<TValues>, query: unknown): void {
  const normalized = typeof query === 'string' ? query : ''
  stateFor(field).query = normalized
  queueOptionLoad(field, normalized)
}

function retryOptions(field: FormFieldSchema<TValues>): void {
  queueOptionLoad(field, stateFor(field).query, 0, true)
}

function rendererContext(field: FormFieldSchema<TValues>): FormFieldRenderContext {
  const state = stateFor(field)
  const rawValue = getFormValue(props.modelValue, field.key)
  const value = field.transform?.toInput
    ? field.transform.toInput(rawValue, props.modelValue)
    : rawValue
  return {
    field,
    values: props.modelValue,
    value,
    options: optionsFor(field),
    optionsLoading: state.loading,
    optionsError: state.error,
    search: state.query,
  }
}

function rendererFor(field: FormFieldSchema<TValues>) {
  return resolveFormFieldRenderer(field, fieldRegistry.value)
}

function rendererBindings(field: FormFieldSchema<TValues>): Record<string, unknown> {
  const context = rendererContext(field)
  const renderer = rendererFor(field)
  const state = stateFor(field)
  const optionError = state.error
    ? (field.optionSource?.errorMessage ?? locale.t('forms.options.loadError'))
    : undefined
  const errorMessages = [...(props.errors[field.key] ?? []), ...(optionError ? [optionError] : [])]

  return {
    ...renderer.props?.(context),
    ...field.props,
    label: field.label,
    hint: field.hint ?? '',
    persistentHint: Boolean(field.hint),
    placeholder: field.placeholder ?? '',
    disabled: fieldDisabled(field),
    readonly: fieldReadonly(field),
    errorMessages,
    modelValue: renderer.mapValue?.(context.value) ?? context.value,
    'aria-required': field.required,
    'onUpdate:modelValue': valueUpdater(field),
    onBlur: blurHandler(field),
    ...(isSearchableField(field.kind)
      ? { 'onUpdate:search': (query: unknown) => updateSearch(field, query) }
      : {}),
  }
}

watchEffect(() => {
  const activeKeys = new Set<string>()
  for (const field of allFields.value) {
    activeKeys.add(field.key)
    if (!field.optionSource) continue
    const state = stateFor(field)
    const nextDependencyKey = dependencyKey(field)
    if (state.dependencyKey !== nextDependencyKey) {
      state.dependencyKey = nextDependencyKey
      state.requestKey = undefined
      queueOptionLoad(field, state.query, 0)
    }
  }

  for (const key of optionStates.keys()) {
    if (activeKeys.has(key)) continue
    optionControllers.get(key)?.abort()
    const timer = optionTimers.get(key)
    if (timer) clearTimeout(timer)
    optionControllers.delete(key)
    optionTimers.delete(key)
    optionStates.delete(key)
  }
})

onBeforeUnmount(() => {
  for (const timer of optionTimers.values()) clearTimeout(timer)
  for (const controller of optionControllers.values()) controller.abort()
  optionTimers.clear()
  optionControllers.clear()
})

defineExpose({
  reloadOptions(key: string) {
    const field = allFields.value.find((candidate) => candidate.key === key)
    if (field) retryOptions(field)
  },
})
</script>

<template>
  <div class="va-form-builder">
    <section
      v-for="(section, sectionIndex) in schema.sections"
      :key="section.key"
      class="va-form-builder__section"
    >
      <div v-if="section.title || section.description" class="va-form-builder__section-heading">
        <span class="va-form-builder__section-marker" aria-hidden="true">
          {{ sectionIndex + 1 }}
        </span>
        <div>
          <h3 v-if="section.title" class="va-form-builder__section-title">{{ section.title }}</h3>
          <p v-if="section.description" class="va-form-builder__section-description">
            {{ section.description }}
          </p>
        </div>
      </div>
      <VRow class="va-form-builder__grid">
        <VCol
          v-for="field in section.fields.filter(fieldVisible)"
          :key="field.key"
          class="va-form-builder__field"
          :class="{
            'va-form-builder__field--error': Boolean(errors[field.key]?.length),
          }"
          :data-field="field.key"
          v-bind="columnProps(field)"
        >
          <slot
            :name="`field-${field.key}`"
            :blur="blurHandler(field)"
            :disabled="fieldDisabled(field)"
            :error-messages="errors[field.key] ?? []"
            :field="field"
            :options="optionsFor(field)"
            :options-error="stateFor(field).error"
            :options-loading="stateFor(field).loading"
            :readonly="fieldReadonly(field)"
            :reload-options="() => retryOptions(field)"
            :update="valueUpdater(field)"
            :value="rendererContext(field).value"
          >
            <component :is="rendererFor(field).component" v-bind="rendererBindings(field)" />
          </slot>
        </VCol>
      </VRow>
    </section>
  </div>
</template>

<style>
.va-form-builder {
  display: grid;
  gap: var(--v-space-6);
}

.va-form-builder__section {
  position: relative;
  min-inline-size: 0;
  padding: var(--v-space-5);
  overflow: hidden;
  background:
    linear-gradient(
      135deg,
      rgba(var(--v-theme-primary), var(--v-form-section-tint-opacity)),
      transparent 46%
    ),
    rgb(var(--v-theme-surface-light));
  border: 1px solid rgba(var(--v-border-color), var(--v-form-section-border-opacity));
  border-radius: var(--v-radius-xl);
  box-shadow: var(--v-form-section-shadow);
}

.va-form-builder__section::before {
  position: absolute;
  inset-block: var(--v-space-5);
  inset-inline-start: 0;
  inline-size: var(--v-space-1);
  content: '';
  background: rgb(var(--v-theme-primary));
  border-start-end-radius: var(--v-radius-pill);
  border-end-end-radius: var(--v-radius-pill);
}

.va-form-builder__section-heading {
  display: flex;
  gap: var(--v-space-3);
  align-items: flex-start;
  margin-block-end: var(--v-space-4);
}

.va-form-builder__section-heading > div {
  min-inline-size: 0;
}

.va-form-builder__section-marker {
  display: grid;
  flex: 0 0 var(--v-form-section-marker-size);
  inline-size: var(--v-form-section-marker-size);
  block-size: var(--v-form-section-marker-size);
  color: rgb(var(--v-theme-primary));
  font-size: var(--v-font-size-sm);
  font-variant-numeric: tabular-nums;
  font-weight: var(--v-font-weight-bold);
  background: rgba(var(--v-theme-primary), var(--v-selected-opacity));
  border: 1px solid rgba(var(--v-theme-primary), var(--v-form-section-border-opacity));
  border-radius: var(--v-radius-lg);
  place-items: center;
}

.va-form-builder__section-title {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: var(--v-font-size-md);
  font-weight: var(--v-font-weight-semibold);
  line-height: var(--v-line-height-tight);
}

.va-form-builder__section-description {
  margin: var(--v-space-2) 0 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-sm);
}

.va-form-builder__grid {
  align-items: start;
}

.va-form-builder__field--error .v-field {
  box-shadow: var(--v-control-error-shadow);
}

.va-form-builder__field > .v-checkbox,
.va-form-builder__field > .v-switch,
.va-form-builder__field > .v-radio-group {
  min-block-size: var(--v-control-height-lg);
  padding: var(--v-space-2) var(--v-space-3);
  background: rgba(var(--v-theme-surface), var(--v-control-surface-opacity));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
}

@media (max-width: 599px) {
  .va-form-builder {
    gap: var(--v-space-4);
  }

  .va-form-builder__section {
    padding: var(--v-space-4);
  }
}
</style>
