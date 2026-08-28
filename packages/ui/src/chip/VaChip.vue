<script setup lang="ts">
import { computed } from 'vue'
import { VChip } from 'vuetify/components'

import type { SemanticTone } from '../types'
import { colorForTone } from '../utils/semantics'

const props = withDefaults(
  defineProps<{
    tone?: SemanticTone
    selected?: boolean
    closable?: boolean
    disabled?: boolean
    label?: string | undefined
  }>(),
  {
    tone: 'neutral',
    selected: false,
    closable: false,
    disabled: false,
    label: undefined,
  },
)

const emit = defineEmits<{
  click: []
  close: []
  'update:selected': [value: boolean]
}>()

const color = computed(() => colorForTone(props.selected ? props.tone : 'neutral'))

function select(): void {
  if (props.disabled) return
  emit('click')
  emit('update:selected', !props.selected)
}
</script>

<template>
  <VChip
    :aria-label="label"
    :aria-pressed="label ? selected : undefined"
    class="va-chip"
    :closable="closable"
    :color="color"
    :disabled="disabled"
    :variant="selected ? 'tonal' : 'outlined'"
    @click="select"
    @click:close.stop="emit('close')"
  >
    <slot />
  </VChip>
</template>

<style>
.va-chip {
  max-inline-size: 100%;
  font-size: var(--v-font-size-sm);
  font-weight: var(--v-font-weight-medium);
}

.va-chip .v-chip__content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
