<script setup lang="ts">
import { computed } from 'vue'
import { VChip, VIcon } from 'vuetify/components'

import type { SemanticTone } from '../types'
import { colorForTone } from '../utils/semantics'

const props = withDefaults(
  defineProps<{
    tone?: SemanticTone
    dot?: boolean
    icon?: string | undefined
  }>(),
  {
    tone: 'neutral',
    dot: false,
    icon: undefined,
  },
)

const color = computed(() => colorForTone(props.tone))
</script>

<template>
  <VChip class="va-tag" :color="color" variant="tonal">
    <VIcon v-if="icon" class="va-tag__icon" :icon="icon" />
    <span v-if="dot" aria-hidden="true" class="va-tag__dot" />
    <slot />
  </VChip>
</template>

<style>
.va-tag {
  min-block-size: var(--v-tag-height);
  font-size: var(--v-font-size-xs);
  font-weight: var(--v-font-weight-semibold);
  letter-spacing: 0.01em;
  border: 1px solid color-mix(in srgb, currentColor var(--v-tag-border-mix), transparent);
  box-shadow: var(--v-tag-shadow);
}

.va-tag__icon {
  inline-size: var(--v-tag-icon-size);
  block-size: var(--v-tag-icon-size);
  margin-inline-end: var(--v-space-1);
}

.va-tag__dot {
  inline-size: 0.375rem;
  block-size: 0.375rem;
  margin-inline-end: var(--v-space-2);
  background: currentColor;
  border-radius: var(--v-radius-pill);
}
</style>
