<script setup lang="ts">
import { computed } from 'vue'
import { VNumberInput, VSelect, VTextField } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import type { FilterField, FilterValues } from './types'

const props = withDefaults(
  defineProps<{
    field: FilterField
    modelValue: FilterValues[string]
    hideDetails?: boolean
  }>(),
  {
    hideDetails: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: FilterValues[string]]
  submit: []
}>()

const locale = useVelaLocale()
const booleanOptions = computed(() => {
  if (props.field.kind !== 'boolean') return []
  return [
    { title: locale.t('data.filter.any'), value: null },
    { title: props.field.trueLabel ?? locale.t('common.yes'), value: true },
    { title: props.field.falseLabel ?? locale.t('common.no'), value: false },
  ]
})
</script>

<template>
  <VTextField
    v-if="field.kind === 'text' || field.kind === 'date'"
    :clearable="field.kind === 'text'"
    :disabled="field.disabled ?? false"
    :hide-details="hideDetails"
    :label="field.label"
    :model-value="modelValue as string | undefined"
    :placeholder="field.placeholder ?? ''"
    :type="field.kind === 'date' ? 'date' : 'text'"
    @keydown.enter="emit('submit')"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <VNumberInput
    v-else-if="field.kind === 'number'"
    :disabled="field.disabled ?? false"
    :hide-details="hideDetails"
    :label="field.label"
    v-bind="{
      ...(field.min === undefined ? {} : { min: field.min }),
      ...(field.max === undefined ? {} : { max: field.max }),
    }"
    :model-value="(modelValue as number | null | undefined) ?? null"
    @keydown.enter="emit('submit')"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <VSelect
    v-else-if="field.kind === 'select'"
    clearable
    :disabled="field.disabled ?? false"
    :hide-details="hideDetails"
    :items="field.options"
    :label="field.label"
    :model-value="modelValue"
    :multiple="field.multiple ?? false"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <VSelect
    v-else
    :clearable="false"
    :disabled="field.disabled ?? false"
    :hide-details="hideDetails"
    :items="booleanOptions"
    :label="field.label"
    :model-value="modelValue ?? null"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
