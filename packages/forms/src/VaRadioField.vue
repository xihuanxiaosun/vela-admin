<script setup lang="ts">
import { VRadio, VRadioGroup } from 'vuetify/components'

import type { FormOption } from './schema'

withDefaults(
  defineProps<{
    modelValue?: unknown
    label?: string
    items?: readonly FormOption[]
    disabled?: boolean
    readonly?: boolean
    errorMessages?: readonly string[]
    hint?: string
  }>(),
  {
    items: () => [],
    disabled: false,
    readonly: false,
    errorMessages: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  blur: []
}>()
</script>

<template>
  <VRadioGroup
    :disabled="disabled"
    :error-messages="errorMessages"
    :hint="hint"
    :label="label"
    :model-value="modelValue"
    :readonly="readonly"
    @blur="emit('blur')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VRadio
      v-for="option in items"
      :key="String(option.value)"
      :disabled="option.disabled ?? false"
      :label="option.title"
      :value="option.value"
    />
  </VRadioGroup>
</template>
