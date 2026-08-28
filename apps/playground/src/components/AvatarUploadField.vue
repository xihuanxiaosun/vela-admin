<script setup lang="ts">
import { useVelaLocale } from '@vela-admin/locale'
import { VaAvatarUpload } from '@vela-admin/upload'

import { createDemoImageUploadQueue, type DemoImageValue } from '../demo/image-upload'

withDefaults(
  defineProps<{
    modelValue?: DemoImageValue | null
    name?: string
    disabled?: boolean
    errorMessages?: readonly string[]
  }>(),
  {
    modelValue: null,
    name: '',
    disabled: false,
    errorMessages: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: DemoImageValue | null]
}>()

const locale = useVelaLocale()
const queue = createDemoImageUploadQueue(locale.t)

function resolveImage(value: DemoImageValue): string {
  return value.url
}
</script>

<template>
  <div class="playground-avatar-upload">
    <VaAvatarUpload
      :disabled="disabled"
      :model-value="modelValue?.url"
      :name="name"
      :queue="queue"
      :resolve-url="resolveImage"
      @update:model-value="emit('update:modelValue', $event ? { url: $event } : null)"
    />
    <ul v-if="errorMessages.length" class="playground-avatar-upload__errors">
      <li v-for="message in errorMessages" :key="message">{{ message }}</li>
    </ul>
  </div>
</template>

<style>
.playground-avatar-upload {
  display: grid;
  gap: var(--v-space-3);
}

.playground-avatar-upload__errors {
  padding-inline-start: var(--v-space-5);
  margin: 0;
  color: rgb(var(--v-theme-error));
  font-size: var(--v-font-size-xs);
}
</style>
