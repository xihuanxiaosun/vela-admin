<script setup lang="ts" generic="TKey extends string | number">
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton } from '@vela-admin/ui'

import type { CrossPageSelectionController } from './use-cross-page-selection'

const props = withDefaults(
  defineProps<{
    controller: CrossPageSelectionController<TKey>
    total: number
    selectedLabel?: ((count: number) => string) | undefined
    selectAllLabel?: ((total: number) => string) | undefined
    clearText?: string | undefined
  }>(),
  {
    selectedLabel: undefined,
    selectAllLabel: undefined,
    clearText: undefined,
  },
)

const locale = useVelaLocale()

function resolvedSelectedLabel(count: number): string {
  return props.selectedLabel?.(count) ?? locale.t('data.selection.selected', { count })
}

function resolvedSelectAllLabel(total: number): string {
  return props.selectAllLabel?.(total) ?? locale.t('data.selection.selectAll', { count: total })
}
</script>

<template>
  <aside v-if="controller.hasSelection.value" class="va-selection-bar" aria-live="polite">
    <strong>{{ resolvedSelectedLabel(controller.selectedCount.value) }}</strong>
    <span v-if="controller.mode.value === 'all'">{{ locale.t('data.selection.all') }}</span>
    <div class="va-selection-bar__actions">
      <VaButton
        v-if="controller.mode.value === 'explicit' && controller.selectedCount.value < total"
        appearance="text"
        @click="controller.selectAllMatching(total)"
      >
        {{ resolvedSelectAllLabel(total) }}
      </VaButton>
      <VaButton appearance="text" intent="neutral" @click="controller.clear">
        {{ clearText ?? locale.t('common.clearSelection') }}
      </VaButton>
    </div>
  </aside>
</template>

<style>
.va-selection-bar {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  min-block-size: var(--v-control-height-lg);
  padding: var(--v-space-2) var(--v-space-4);
  color: rgb(var(--v-theme-primary-darken-1));
  font-size: var(--v-font-size-sm);
  background: rgba(var(--v-theme-primary), var(--v-selected-opacity));
  border: 1px solid rgba(var(--v-theme-primary), var(--v-focus-opacity));
  border-radius: var(--v-radius-lg);
}

.va-selection-bar > span {
  color: rgb(var(--v-theme-on-surface-variant));
}

.va-selection-bar__actions {
  display: flex;
  gap: var(--v-space-1);
  margin-inline-start: auto;
}

@media (max-width: 599px) {
  .va-selection-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .va-selection-bar__actions {
    justify-content: flex-end;
    inline-size: 100%;
  }
}
</style>
