<script setup lang="ts" generic="TItem extends Record<string, unknown>">
import { VCheckbox, VMenu } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaIconButton } from '@vela-admin/ui'

import type { ColumnPreferencesController } from './use-column-preferences'

const props = withDefaults(
  defineProps<{
    controller: ColumnPreferencesController<TItem>
    label?: string | undefined
    title?: string | undefined
  }>(),
  {
    label: undefined,
    title: undefined,
  },
)

const locale = useVelaLocale()
</script>

<template>
  <VMenu :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: activatorProps }">
      <VaButton
        v-bind="activatorProps"
        appearance="text"
        intent="neutral"
        prepend-icon="$columns"
        size="small"
      >
        {{ props.label ?? locale.t('data.columns.label') }}
      </VaButton>
    </template>
    <section class="va-column-manager" :aria-label="locale.t('data.columns.preferences')">
      <header class="va-column-manager__header">
        <div>
          <strong>{{ props.title ?? locale.t('data.columns.title') }}</strong>
          <small>{{ locale.t('data.columns.description') }}</small>
        </div>
        <VaButton appearance="text" intent="neutral" @click="controller.reset">
          {{ locale.t('common.reset') }}
        </VaButton>
      </header>
      <div class="va-column-manager__list">
        <div
          v-for="column in controller.configurableColumns.value"
          :key="column.key"
          class="va-column-manager__item"
        >
          <VCheckbox
            :disabled="controller.isVisible(column.key) && !controller.canHide(column.key)"
            hide-details
            :label="column.title"
            :model-value="controller.isVisible(column.key)"
            @update:model-value="controller.setVisible(column.key, Boolean($event))"
          />
          <span class="va-column-manager__move">
            <VaIconButton
              v-if="controller.hasCustomWidth(column.key)"
              appearance="text"
              icon="$refresh"
              :label="locale.t('data.columns.resetWidth', { label: column.title })"
              @click="controller.resetWidth(column.key)"
            />
            <VaIconButton
              appearance="text"
              :disabled="!controller.canMove(column.key, -1)"
              icon="$arrowUp"
              :label="locale.t('data.columns.moveUp', { label: column.title })"
              @click="controller.move(column.key, -1)"
            />
            <VaIconButton
              appearance="text"
              :disabled="!controller.canMove(column.key, 1)"
              icon="$arrowDown"
              :label="locale.t('data.columns.moveDown', { label: column.title })"
              @click="controller.move(column.key, 1)"
            />
          </span>
        </div>
      </div>
      <footer
        v-if="controller.saving.value || controller.error.value"
        class="va-column-manager__status"
      >
        {{
          controller.error.value
            ? locale.t('data.columns.saveError')
            : locale.t('data.columns.saving')
        }}
      </footer>
    </section>
  </VMenu>
</template>

<style>
.va-column-manager {
  inline-size: min(22rem, calc(100vw - var(--v-space-8)));
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-overlay);
}

.va-column-manager__header,
.va-column-manager__item {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  justify-content: space-between;
}

.va-column-manager__header {
  padding: var(--v-space-4);
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-column-manager__header > div {
  display: grid;
  min-inline-size: 0;
}

.va-column-manager__header strong {
  font-size: var(--v-font-size-sm);
  font-weight: var(--v-font-weight-semibold);
}

.va-column-manager__header small,
.va-column-manager__status {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: var(--v-font-size-xs);
}

.va-column-manager__list {
  max-block-size: min(28rem, 65vh);
  padding: var(--v-space-2);
  overflow-y: auto;
}

.va-column-manager__item {
  min-block-size: var(--v-control-height-lg);
  padding-inline: var(--v-space-2);
  border-radius: var(--v-radius-md);
}

.va-column-manager__item:hover {
  background: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}

.va-column-manager__item .v-checkbox {
  flex: 1 1 auto;
  min-inline-size: 0;
}

.va-column-manager__move {
  display: inline-flex;
  flex: 0 0 auto;
}

.va-column-manager__status {
  padding: var(--v-space-3) var(--v-space-4);
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
