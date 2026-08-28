<script setup lang="ts">
import { computed } from 'vue'
import { VBadge } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import type { SemanticTone } from '../types'
import { colorForTone } from '../utils/semantics'

const props = withDefaults(
  defineProps<{
    content?: string | number | undefined
    max?: number
    tone?: SemanticTone
    dot?: boolean
    label?: string | undefined
    inline?: boolean
  }>(),
  {
    content: undefined,
    max: 99,
    tone: 'danger',
    dot: false,
    label: undefined,
    inline: false,
  },
)

const color = computed(() => colorForTone(props.tone))
const locale = useVelaLocale()
const displayContent = computed(() => {
  if (typeof props.content !== 'number' || props.content <= props.max) return props.content
  return `${props.max}+`
})
const accessibleLabel = computed(
  () =>
    props.label ??
    (props.dot
      ? locale.t('ui.badge.hasUpdates')
      : locale.t('ui.badge.notifications', { count: props.content ?? 0 })),
)
</script>

<template>
  <VBadge
    :aria-label="accessibleLabel"
    class="va-badge"
    :color="color"
    :content="displayContent"
    :dot="dot"
    :inline="inline"
  >
    <slot />
  </VBadge>
</template>

<style>
.va-badge .v-badge__badge {
  min-inline-size: var(--v-space-5);
  min-block-size: var(--v-space-5);
  padding-inline: var(--v-space-1);
  font-size: var(--v-font-size-xs);
  font-weight: var(--v-font-weight-bold);
  font-variant-numeric: tabular-nums;
}
</style>
