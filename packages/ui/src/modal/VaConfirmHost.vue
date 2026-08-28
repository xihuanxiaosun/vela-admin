<script setup lang="ts">
import { useVelaLocale } from '@vela-admin/locale'

import VaButton from '../button/VaButton.vue'
import type { ConfirmController } from './confirm'
import VaModal from './VaModal.vue'

defineProps<{
  controller: ConfirmController
}>()

const locale = useVelaLocale()
</script>

<template>
  <VaModal
    :model-value="Boolean(controller.current.value)"
    :persistent="controller.current.value?.persistent"
    :title="controller.current.value?.title ?? ''"
    width="480"
    @update:model-value="!$event && controller.cancel()"
  >
    <p class="va-confirm-host__message">{{ controller.current.value?.message }}</p>
    <template #footer>
      <VaButton appearance="text" intent="neutral" @click="controller.cancel">
        {{ controller.current.value?.cancelText ?? locale.t('common.cancel') }}
      </VaButton>
      <VaButton :intent="controller.current.value?.intent ?? 'primary'" @click="controller.accept">
        {{ controller.current.value?.confirmText ?? locale.t('common.confirm') }}
      </VaButton>
    </template>
  </VaModal>
</template>

<style>
.va-confirm-host__message {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  line-height: var(--v-line-height-body);
}
</style>
