<script setup lang="ts">
import { computed } from 'vue'
import { VList, VListItem, VMenu } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaIconButton } from '@vela-admin/ui'

import type { RowAction } from './types'

const props = withDefaults(
  defineProps<{
    actions: readonly RowAction[]
    maxVisible?: number
    display?: 'labels' | 'mixed' | 'icons'
    /** @deprecated Use `display="icons"`; retained for source compatibility. */
    compact?: boolean
    moreLabel?: string | undefined
    moreIcon?: string
  }>(),
  {
    maxVisible: 1,
    display: 'mixed',
    compact: false,
    moreLabel: undefined,
    moreIcon: '$menu',
  },
)

const emit = defineEmits<{
  action: [action: RowAction]
}>()

const locale = useVelaLocale()
const resolvedMoreLabel = computed(() => props.moreLabel ?? locale.t('data.actions.more'))
const resolvedDisplay = computed(() => (props.compact ? 'icons' : props.display))
const orderedActions = computed(() =>
  props.actions
    .filter((action) => !action.hidden)
    .toSorted((left, right) => (left.priority ?? 0) - (right.priority ?? 0)),
)
const visibleActions = computed(() => orderedActions.value.slice(0, Math.max(0, props.maxVisible)))
const overflowActions = computed(() => orderedActions.value.slice(visibleActions.value.length))

function listItemProps(action: RowAction): Record<string, unknown> {
  return {
    class: [
      'va-row-actions__menu-item',
      `va-row-actions__menu-item--${action.intent ?? 'neutral'}`,
    ],
    color: action.intent === 'danger' ? 'error' : undefined,
    disabled: (action.disabled ?? false) || (action.loading ?? false),
    title: action.label,
    ...(action.icon === undefined ? {} : { prependIcon: action.icon }),
  }
}

function iconOnly(action: RowAction, index: number): boolean {
  if (!action.icon) return false
  return resolvedDisplay.value === 'icons' || (resolvedDisplay.value === 'mixed' && index > 0)
}
</script>

<template>
  <div class="va-row-actions">
    <template v-for="(action, index) in visibleActions" :key="action.key">
      <VaIconButton
        v-if="iconOnly(action, index)"
        :disabled="action.disabled ?? false"
        :icon="action.icon ?? moreIcon"
        :intent="action.intent ?? 'neutral'"
        :label="action.label"
        :loading="action.loading ?? false"
        @click="emit('action', action)"
      />
      <VaButton
        v-else
        appearance="text"
        :disabled="action.disabled ?? false"
        :intent="action.intent ?? 'neutral'"
        :loading="action.loading ?? false"
        :loading-text="action.label"
        :prepend-icon="action.icon"
        size="small"
        @click="emit('action', action)"
      >
        {{ action.label }}
      </VaButton>
    </template>

    <VMenu v-if="overflowActions.length" location="bottom end">
      <template #activator="{ props: activatorProps }">
        <VaIconButton v-bind="activatorProps" :icon="moreIcon" :label="resolvedMoreLabel" />
      </template>
      <VList class="va-row-actions__menu" :min-width="'var(--v-row-actions-menu-width)'">
        <VListItem
          v-for="action in overflowActions"
          :key="action.key"
          v-bind="listItemProps(action)"
          @click="emit('action', action)"
        />
      </VList>
    </VMenu>
  </div>
</template>

<style>
.va-row-actions {
  display: inline-flex;
  gap: var(--v-space-1);
  align-items: center;
  justify-content: flex-start;
  white-space: nowrap;
}

.va-row-actions__menu {
  padding: var(--v-space-1);
}

.va-row-actions__menu-item {
  min-block-size: var(--v-control-height-md);
  font-size: var(--v-font-size-sm);
  border-radius: var(--v-radius-md);
}

.va-row-actions__menu-item--danger {
  color: rgb(var(--v-theme-error));
}
</style>
