<script setup lang="ts">
import { VIcon, VTab, VTabs } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import type { WorkspaceTab } from './types'

const props = defineProps<{
  items: readonly WorkspaceTab[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  close: [tab: WorkspaceTab]
  navigate: [tab: WorkspaceTab]
}>()

const locale = useVelaLocale()

function select(id: unknown): void {
  if (typeof id !== 'string') return
  const tab = props.items.find((item) => item.id === id)
  if (!tab) return
  emit('update:modelValue', id)
  emit('navigate', tab)
}
</script>

<template>
  <VTabs
    class="va-workspace-tabs"
    :model-value="modelValue ?? ''"
    show-arrows
    @update:model-value="select"
  >
    <VTab
      v-for="tab in items"
      :key="tab.id"
      :aria-keyshortcuts="tab.closable && !tab.pinned ? 'Delete' : undefined"
      :value="tab.id"
      @keydown.delete.prevent.stop="emit('close', tab)"
    >
      <VIcon v-if="tab.icon" :icon="tab.icon" size="16" start />
      <span class="va-workspace-tabs__label">{{ tab.label }}</span>
      <span
        v-if="tab.dirty"
        :aria-label="locale.t('shell.tabs.unsaved')"
        class="va-workspace-tabs__dirty"
      />
      <span
        v-if="tab.closable && !tab.pinned"
        aria-hidden="true"
        class="va-workspace-tabs__close"
        :title="locale.t('shell.tabs.close')"
        @click.stop="emit('close', tab)"
      >
        <VIcon icon="$close" size="14" />
      </span>
    </VTab>
  </VTabs>
</template>

<style>
.va-workspace-tabs {
  min-block-size: var(--v-control-height-lg);
  padding-inline: var(--v-space-1);
  overflow: hidden;
  background: rgba(var(--v-theme-surface), var(--v-runtime-surface-opacity));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-card);
}

.va-workspace-tabs .v-tab {
  min-inline-size: 0;
  max-inline-size: 15rem;
  padding-inline: var(--v-space-3);
  font-size: var(--v-font-size-sm);
  text-transform: none;
}

.va-workspace-tabs__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-workspace-tabs__dirty {
  inline-size: 0.375rem;
  block-size: 0.375rem;
  margin-inline-start: var(--v-space-2);
  background: rgb(var(--v-theme-warning));
  border-radius: var(--v-radius-pill);
}

.va-workspace-tabs__close {
  display: inline-grid;
  inline-size: var(--v-control-height-sm);
  block-size: var(--v-control-height-sm);
  margin-inline-start: var(--v-space-1);
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
  border-radius: var(--v-radius-pill);
  place-items: center;
  transition:
    color var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    background-color var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-workspace-tabs__close:hover {
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}
</style>
