<script setup lang="ts">
import { VImg } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaModal } from '@vela-admin/ui'

withDefaults(
  defineProps<{
    modelValue: boolean
    src?: string | undefined
    alt?: string | undefined
    title?: string | undefined
  }>(),
  {
    src: undefined,
    alt: undefined,
    title: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const locale = useVelaLocale()
</script>

<template>
  <VaModal
    :model-value="modelValue"
    :title="title ?? locale.t('upload.preview.title')"
    width="min(64rem, calc(100vw - 2rem))"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="va-image-preview">
      <VImg v-if="src" :alt="alt ?? title ?? ''" contain :src="src" />
    </div>
  </VaModal>
</template>

<style>
.va-image-preview {
  display: grid;
  place-items: center;
  min-block-size: var(--v-upload-preview-min-height);
  max-block-size: var(--v-upload-preview-max-height);
  overflow: hidden;
  background:
    linear-gradient(
      45deg,
      rgba(var(--v-theme-on-surface), var(--v-upload-checker-opacity)) 25%,
      transparent 25%,
      transparent 75%,
      rgba(var(--v-theme-on-surface), var(--v-upload-checker-opacity)) 75%
    ),
    linear-gradient(
      45deg,
      rgba(var(--v-theme-on-surface), var(--v-upload-checker-opacity)) 25%,
      transparent 25%,
      transparent 75%,
      rgba(var(--v-theme-on-surface), var(--v-upload-checker-opacity)) 75%
    ),
    rgb(var(--v-theme-surface-light));
  background-position:
    0 0,
    var(--v-upload-checker-size) var(--v-upload-checker-size);
  background-size: calc(var(--v-upload-checker-size) * 2) calc(var(--v-upload-checker-size) * 2);
  border-radius: var(--v-radius-lg);
}

.va-image-preview .v-img {
  inline-size: 100%;
  max-block-size: var(--v-upload-preview-max-height);
}
</style>
