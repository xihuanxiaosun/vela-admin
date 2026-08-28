<script setup lang="ts">
import { computed } from 'vue'
import { VOverlay, VProgressCircular } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

const props = withDefaults(
  defineProps<{
    active: boolean
    label?: string | undefined
    contained?: boolean
    persistent?: boolean
  }>(),
  {
    label: undefined,
    contained: true,
    persistent: true,
  },
)

const locale = useVelaLocale()
const resolvedLabel = computed(() => props.label ?? locale.t('ui.loading.label'))
</script>

<template>
  <div class="va-loading-overlay" :aria-busy="active || undefined">
    <slot />
    <VOverlay
      :contained="contained"
      class="va-loading-overlay__layer"
      :model-value="active"
      :persistent="persistent"
    >
      <div aria-live="polite" class="va-loading-overlay__status" role="status">
        <VProgressCircular
          :aria-label="resolvedLabel"
          color="primary"
          indeterminate
          size="32"
          width="3"
        />
        <span>{{ resolvedLabel }}</span>
      </div>
    </VOverlay>
  </div>
</template>

<style>
.va-loading-overlay {
  position: relative;
  min-inline-size: 0;
}

.va-loading-overlay__layer {
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(var(--v-space-1));
}

.va-loading-overlay__status {
  display: inline-flex;
  gap: var(--v-space-3);
  align-items: center;
  padding: var(--v-space-3) var(--v-space-4);
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: var(--v-font-size-sm);
  font-weight: var(--v-font-weight-medium);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-floating);
}
</style>
