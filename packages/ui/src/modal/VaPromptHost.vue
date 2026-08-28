<script setup lang="ts">
import { ref, watch } from 'vue'
import { VTextField } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import VaButton from '../button/VaButton.vue'
import type { PromptController } from './prompt'
import VaModal from './VaModal.vue'

const props = defineProps<{
  controller: PromptController
}>()

const value = ref('')
const locale = useVelaLocale()
const error = ref<string>()
const validating = ref(false)
let validationRevision = 0

watch(
  () => props.controller.current.value,
  (current) => {
    validationRevision += 1
    value.value = current?.initialValue ?? ''
    error.value = undefined
    validating.value = false
  },
  { immediate: true },
)

async function accept(): Promise<void> {
  const current = props.controller.current.value
  if (!current || validating.value) return
  const revision = ++validationRevision
  validating.value = true
  error.value = undefined
  try {
    const message = await current.validate?.(value.value)
    if (revision !== validationRevision) return
    if (message) {
      error.value = message
      return
    }
    props.controller.accept(value.value)
  } finally {
    if (revision === validationRevision) validating.value = false
  }
}
</script>

<template>
  <VaModal
    :model-value="Boolean(controller.current.value)"
    :persistent="controller.current.value?.persistent"
    :title="controller.current.value?.title ?? ''"
    width="480"
    @update:model-value="!$event && controller.cancel()"
  >
    <div class="va-prompt-host__content">
      <p v-if="controller.current.value?.message" class="va-prompt-host__message">
        {{ controller.current.value.message }}
      </p>
      <VTextField
        v-model="value"
        autofocus
        :error-messages="error ? [error] : []"
        :label="controller.current.value?.label"
        :placeholder="controller.current.value?.placeholder"
        @keydown.enter.prevent="accept"
      />
    </div>
    <template #footer>
      <VaButton appearance="text" intent="neutral" @click="controller.cancel">
        {{ controller.current.value?.cancelText ?? locale.t('common.cancel') }}
      </VaButton>
      <VaButton
        :intent="controller.current.value?.intent ?? 'primary'"
        :loading="validating"
        @click="accept"
      >
        {{ controller.current.value?.confirmText ?? locale.t('common.continue') }}
      </VaButton>
    </template>
  </VaModal>
</template>

<style>
.va-prompt-host__content {
  display: grid;
  gap: var(--v-space-4);
}

.va-prompt-host__message {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-sm);
  line-height: var(--v-line-height-body);
}
</style>
