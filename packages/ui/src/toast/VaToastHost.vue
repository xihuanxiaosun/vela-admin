<script setup lang="ts">
import { VBtn, VSnackbarQueue } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import type { ToastController } from './toast'

defineProps<{
  controller: ToastController
}>()

const locale = useVelaLocale()
</script>

<template>
  <VSnackbarQueue
    class="va-toast-host"
    closable
    display-strategy="overflow"
    location="top end"
    :model-value="controller.messages.value"
    :total-visible="4"
    @update:model-value="controller.replace"
  >
    <template #actions="{ props: actionProps }">
      <VBtn
        v-bind="actionProps"
        :aria-label="locale.t('common.close')"
        icon="$close"
        size="small"
        variant="text"
      />
    </template>
  </VSnackbarQueue>
</template>

<style>
.va-toast-host {
  margin: max(var(--v-space-3), env(safe-area-inset-top))
    max(var(--v-space-3), env(safe-area-inset-right))
    max(var(--v-space-3), env(safe-area-inset-bottom))
    max(var(--v-space-3), env(safe-area-inset-left));
}

.va-toast-host .v-snackbar__wrapper {
  position: relative;
  max-inline-size: min(var(--v-feedback-toast-max-width), calc(100vw - (2 * var(--v-space-3))));
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  background: rgba(var(--v-theme-surface), var(--v-surface-opacity-strong)) !important;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-floating);
  backdrop-filter: blur(var(--v-space-3));
}

.va-toast-message {
  --va-toast-tone: var(--v-theme-primary);
}

.va-toast-message--success {
  --va-toast-tone: var(--v-theme-success);
}

.va-toast-message--danger {
  --va-toast-tone: var(--v-theme-error);
}

.va-toast-message--warning {
  --va-toast-tone: var(--v-theme-warning);
}

.va-toast-message--info {
  --va-toast-tone: var(--v-theme-info);
}

.va-toast-host .v-snackbar__wrapper::before {
  position: absolute;
  inline-size: var(--v-feedback-toast-accent-width);
  pointer-events: none;
  content: '';
  background: rgb(var(--va-toast-tone));
  inset-block: 0;
  inset-inline-start: 0;
}

.va-toast-host .v-snackbar__content {
  padding: var(--v-space-3) var(--v-space-4);
  font-size: var(--v-font-size-sm);
  line-height: var(--v-line-height-body);
}

.va-toast-host .v-snackbar__actions {
  margin-inline-end: var(--v-space-1);
}

.va-toast-host .v-snackbar__actions .v-btn {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.va-toast-host .v-snackbar__actions .v-btn:hover {
  color: rgb(var(--va-toast-tone));
}

.va-toast-host .v-snackbar__prepend .v-icon {
  color: rgb(var(--va-toast-tone));
  font-size: var(--v-shell-nav-icon-size);
}
</style>
