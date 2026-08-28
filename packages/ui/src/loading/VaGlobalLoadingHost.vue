<script setup lang="ts">
import { VOverlay, VProgressCircular } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { velaFeedbackMetrics } from '@vela-admin/theme'

import type { GlobalLoadingController } from './global-loading'

defineProps<{
  controller: GlobalLoadingController
}>()

const locale = useVelaLocale()
</script>

<template>
  <VOverlay
    class="va-global-loading-host"
    :model-value="controller.active.value"
    persistent
    scrim="surface"
  >
    <div aria-live="polite" aria-atomic="true" class="va-global-loading-host__status" role="status">
      <span class="va-global-loading-host__indicator">
        <VProgressCircular
          :aria-label="controller.current.value?.label ?? locale.t('ui.loading.label')"
          color="primary"
          indeterminate
          :size="velaFeedbackMetrics.loadingSpinnerSize"
          width="3"
        />
      </span>
      <span class="va-global-loading-host__copy">
        <strong>{{ controller.current.value?.label }}</strong>
        <small v-if="controller.count.value > 1">
          {{ locale.t('ui.loading.operations', { count: controller.count.value }) }}
        </small>
      </span>
    </div>
  </VOverlay>
</template>

<style>
.va-global-loading-host {
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(var(--v-space-1)) saturate(112%);
}

.va-global-loading-host .v-overlay__scrim {
  opacity: var(--v-feedback-loading-scrim-opacity) !important;
}

.va-global-loading-host__status {
  position: relative;
  display: flex;
  gap: var(--v-space-4);
  align-items: center;
  inline-size: min(var(--v-feedback-loading-panel-max-width), calc(100vw - (2 * var(--v-space-6))));
  padding: var(--v-space-4) var(--v-space-5);
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  background: rgba(var(--v-theme-surface), var(--v-surface-opacity-strong));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-xl);
  box-shadow: var(--v-shadow-overlay);
}

.va-global-loading-host__status::before {
  position: absolute;
  block-size: var(--v-feedback-toast-accent-width);
  pointer-events: none;
  content: '';
  background: linear-gradient(90deg, transparent, rgb(var(--v-theme-primary)), transparent);
  inset: 0 var(--v-space-5) auto;
}

.va-global-loading-host__indicator {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  inline-size: var(--v-space-12);
  block-size: var(--v-space-12);
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), var(--v-selected-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-feedback-loading-track-shadow);
}

.va-global-loading-host__copy {
  display: grid;
  gap: var(--v-space-1);
  min-inline-size: 0;
}

.va-global-loading-host__copy strong {
  overflow: hidden;
  font-size: var(--v-font-size-md);
  font-weight: var(--v-font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-global-loading-host__copy small {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
}
</style>
