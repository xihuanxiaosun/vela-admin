<script setup lang="ts" generic="TState">
import { ref } from 'vue'
import { VDivider, VIcon, VList, VListItem, VMenu } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaIconButton, useFeedback } from '@vela-admin/ui'

import type { SavedDataView, SavedViewsController } from './use-saved-views'

const props = withDefaults(
  defineProps<{
    controller: SavedViewsController<TState>
    state: TState
    disabled?: boolean
    label?: string | undefined
  }>(),
  {
    disabled: false,
    label: undefined,
  },
)

const emit = defineEmits<{
  apply: [state: TState, view: SavedDataView<TState>]
  saved: [view: SavedDataView<TState>]
}>()

const locale = useVelaLocale()
const feedback = useFeedback()
const open = ref(false)

function applyView(view: SavedDataView<TState>): void {
  const state = props.controller.activate(view.id)
  if (state === undefined) return
  emit('apply', state, view)
  open.value = false
}

async function saveAs(): Promise<void> {
  const name = await feedback.prompt({
    title: locale.t('data.views.saveTitle'),
    label: locale.t('data.views.name'),
    confirmText: locale.t('data.views.save'),
    validate: (value) => (value.trim() ? undefined : locale.t('forms.validation.required')),
  })
  if (!name) return
  try {
    const view = props.controller.create(name, props.state)
    emit('saved', view)
    feedback.toast.success(locale.t('data.views.saved'))
  } catch (error) {
    feedback.toast.error(error instanceof Error ? error.message : locale.t('data.views.saveError'))
  }
}

function updateActive(): void {
  const id = props.controller.activeId.value
  if (!id || !props.controller.update(id, props.state)) return
  const view = props.controller.views.value.find((candidate) => candidate.id === id)
  if (view) emit('saved', view)
  feedback.toast.success(locale.t('data.views.updated'))
}

async function rename(view: SavedDataView<TState>): Promise<void> {
  const name = await feedback.prompt({
    title: locale.t('data.views.renameTitle'),
    label: locale.t('data.views.name'),
    initialValue: view.name,
    confirmText: locale.t('data.views.rename'),
  })
  if (!name) return
  try {
    props.controller.rename(view.id, name)
  } catch (error) {
    feedback.toast.error(error instanceof Error ? error.message : locale.t('data.views.saveError'))
  }
}

async function remove(view: SavedDataView<TState>): Promise<void> {
  const accepted = await feedback.confirm({
    title: locale.t('data.views.deleteTitle'),
    message: locale.t('data.views.deleteText', { name: view.name }),
    confirmText: locale.t('data.views.delete'),
    intent: 'danger',
  })
  if (accepted) props.controller.remove(view.id)
}
</script>

<template>
  <VMenu v-model="open" :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: activatorProps }">
      <VaButton
        v-bind="activatorProps"
        appearance="text"
        :disabled="disabled"
        intent="neutral"
        prepend-icon="$bookmarkOutline"
        size="small"
      >
        {{ label ?? controller.activeView.value?.name ?? locale.t('data.views.title') }}
      </VaButton>
    </template>

    <div class="va-saved-views">
      <header class="va-saved-views__header">
        <div>
          <strong>{{ locale.t('data.views.title') }}</strong>
          <span>{{ locale.t('data.views.description') }}</span>
        </div>
        <VaIconButton icon="$add" :label="locale.t('data.views.saveNew')" @click="saveAs" />
      </header>

      <VList v-if="controller.views.value.length" class="va-saved-views__list" lines="two">
        <VListItem
          v-for="view in controller.views.value"
          :key="view.id"
          :active="controller.activeId.value === view.id"
          :subtitle="view.id === controller.defaultId.value && locale.t('data.views.default')"
          :title="view.name"
          @click="applyView(view)"
        >
          <template #prepend>
            <VIcon :icon="view.id === controller.defaultId.value ? '$star' : '$bookmarkOutline'" />
          </template>
          <template #append>
            <div class="va-saved-views__row-actions">
              <VaIconButton
                icon="$star"
                :label="locale.t('data.views.makeDefault')"
                size="small"
                @click.stop="controller.setDefault(view.id)"
              />
              <VaIconButton
                icon="$edit"
                :label="locale.t('data.views.rename')"
                size="small"
                @click.stop="rename(view)"
              />
              <VaIconButton
                icon="$delete"
                intent="danger"
                :label="locale.t('data.views.delete')"
                size="small"
                @click.stop="remove(view)"
              />
            </div>
          </template>
        </VListItem>
      </VList>

      <p v-else class="va-saved-views__empty">{{ locale.t('data.views.empty') }}</p>
      <VDivider />
      <footer class="va-saved-views__footer">
        <VaButton
          v-if="controller.activeId.value"
          appearance="text"
          prepend-icon="$save"
          size="small"
          @click="updateActive"
        >
          {{ locale.t('data.views.update') }}
        </VaButton>
        <VaButton appearance="text" prepend-icon="$add" size="small" @click="saveAs">
          {{ locale.t('data.views.saveNew') }}
        </VaButton>
      </footer>
    </div>
  </VMenu>
</template>

<style>
.va-saved-views {
  inline-size: min(var(--v-data-saved-view-width), calc(100vw - var(--v-space-6)));
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-overlay);
}

.va-saved-views__header,
.va-saved-views__footer {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  justify-content: space-between;
  padding: var(--v-space-3) var(--v-space-4);
}

.va-saved-views__header > div {
  display: grid;
  gap: var(--v-space-1);
}

.va-saved-views__header strong {
  font-size: var(--v-font-size-sm);
}

.va-saved-views__header span,
.va-saved-views__empty {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
}

.va-saved-views__list {
  max-block-size: var(--v-data-saved-view-list-height);
  overflow: auto;
  padding: var(--v-space-2);
}

.va-saved-views__list .v-list-item {
  margin-block: var(--v-space-1);
  border-radius: var(--v-radius-md);
}

.va-saved-views__row-actions {
  display: flex;
  gap: var(--v-space-1);
  opacity: 0;
  transition: opacity var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-saved-views__list .v-list-item:hover .va-saved-views__row-actions,
.va-saved-views__list .v-list-item:focus-within .va-saved-views__row-actions {
  opacity: 1;
}

.va-saved-views__empty {
  padding: var(--v-space-5);
  margin: 0;
  text-align: center;
}

.va-saved-views__footer {
  justify-content: flex-end;
}

@media (hover: none) {
  .va-saved-views__row-actions {
    opacity: 1;
  }
}
</style>
