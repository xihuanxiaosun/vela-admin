<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useDisplay } from 'vuetify'
import { VCard, VCardActions, VCardText, VCardTitle, VDialog, VIconBtn } from 'vuetify/components'
import type { Awaitable } from '@vela-admin/contracts'
import { useVelaLocale } from '@vela-admin/locale'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string | undefined
    width?: string | number
    persistent?: boolean | undefined
    closeLabel?: string | undefined
    fullscreenOnMobile?: boolean
    busy?: boolean
    beforeClose?: (() => Awaitable<boolean>) | undefined
  }>(),
  {
    description: undefined,
    width: 640,
    persistent: false,
    closeLabel: undefined,
    fullscreenOnMobile: false,
    busy: false,
    beforeClose: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  'close-error': [error: unknown]
}>()

const { smAndDown } = useDisplay()
const locale = useVelaLocale()
const closing = ref(false)
const titleId = useId()
const fullscreen = computed(() => props.fullscreenOnMobile && smAndDown.value)
const effectivePersistent = computed(() => props.persistent || props.busy || closing.value)
const resolvedCloseLabel = computed(() => props.closeLabel ?? locale.t('ui.modal.close'))

async function requestClose(): Promise<void> {
  if (props.busy || closing.value) return
  closing.value = true
  try {
    if (props.beforeClose && !(await props.beforeClose())) return
    emit('update:modelValue', false)
    emit('close')
  } catch (error) {
    emit('close-error', error)
  } finally {
    closing.value = false
  }
}

function updateModel(value: boolean): void {
  if (value) emit('update:modelValue', true)
  else void requestClose()
}
</script>

<template>
  <VDialog
    :fullscreen="fullscreen"
    :aria-labelledby="titleId"
    :max-width="width"
    :model-value="modelValue"
    :persistent="effectivePersistent"
    scrollable
    @update:model-value="updateModel"
  >
    <VCard class="va-modal">
      <div class="va-modal__header">
        <div class="va-modal__heading">
          <VCardTitle :id="titleId" class="va-modal__title">{{ title }}</VCardTitle>
          <p v-if="description" class="va-modal__description">{{ description }}</p>
        </div>
        <VIconBtn
          :aria-label="resolvedCloseLabel"
          :disabled="busy || closing"
          icon="$close"
          variant="text"
          @click="requestClose"
        />
      </div>
      <VCardText class="va-modal__body">
        <slot />
      </VCardText>
      <VCardActions v-if="$slots.footer" class="va-modal__footer">
        <slot name="footer" :busy="busy || closing" :close="requestClose" />
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style>
.va-modal {
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-modal__header {
  display: flex;
  gap: var(--v-space-4);
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--v-space-5) var(--v-space-6);
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-modal__heading {
  min-inline-size: 0;
}

.va-modal__title {
  padding: 0;
  font-size: var(--v-font-size-xl);
  font-weight: var(--v-font-weight-semibold);
  line-height: var(--v-line-height-tight);
}

.va-modal__description {
  margin: var(--v-space-2) 0 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: var(--v-font-size-sm);
}

.va-modal__body {
  padding: var(--v-space-6);
  font-size: var(--v-font-size-md);
}

.va-modal__footer {
  gap: var(--v-space-3);
  justify-content: flex-end;
  padding: var(--v-space-4) var(--v-space-6);
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 599px) {
  .va-modal__header,
  .va-modal__body,
  .va-modal__footer {
    padding-inline: var(--v-space-4);
  }
}
</style>
