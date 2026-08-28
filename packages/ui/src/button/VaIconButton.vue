<script setup lang="ts">
import { computed } from 'vue'
import { VIconBtn, VTooltip } from 'vuetify/components'

import type { ControlAppearance, SemanticIntent } from '../types'
import { colorForIntent, variantForAppearance } from '../utils/semantics'

const props = withDefaults(
  defineProps<{
    label: string
    icon: string
    intent?: SemanticIntent
    appearance?: ControlAppearance
    tooltip?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    intent: 'neutral',
    appearance: 'text',
    tooltip: true,
    loading: false,
    disabled: false,
  },
)

defineOptions({ inheritAttrs: false })

const color = computed(() => colorForIntent(props.intent))
const variant = computed(() => variantForAppearance(props.appearance))
const blocked = computed(() => props.disabled || props.loading)
</script>

<template>
  <VTooltip :disabled="!tooltip" :eager="false" :text="label">
    <template #activator="{ props: activatorProps }">
      <VIconBtn
        v-bind="{ ...activatorProps, ...$attrs }"
        :aria-label="label"
        :aria-busy="loading || undefined"
        :aria-disabled="blocked || undefined"
        :color="color"
        :disabled="blocked"
        :icon="icon"
        :loading="loading"
        :variant="variant"
      />
    </template>
    {{ label }}
  </VTooltip>
</template>
