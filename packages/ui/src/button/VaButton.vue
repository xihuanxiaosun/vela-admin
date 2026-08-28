<script setup lang="ts">
import { computed } from 'vue'
import { VBtn, VProgressCircular } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import type { ControlAppearance, ControlSize, SemanticIntent } from '../types'
import { colorForIntent, variantForAppearance } from '../utils/semantics'

const props = withDefaults(
  defineProps<{
    intent?: SemanticIntent
    appearance?: ControlAppearance
    loading?: boolean
    loadingText?: string | undefined
    disabled?: boolean
    size?: ControlSize
    prependIcon?: string | undefined
    appendIcon?: string | undefined
  }>(),
  {
    intent: 'primary',
    appearance: 'solid',
    loading: false,
    loadingText: undefined,
    disabled: false,
    size: 'medium',
    prependIcon: undefined,
    appendIcon: undefined,
  },
)

defineOptions({ inheritAttrs: false })

const color = computed(() => colorForIntent(props.intent))
const locale = useVelaLocale()
const resolvedLoadingText = computed(() => props.loadingText ?? locale.t('ui.button.loading'))
const variant = computed(() => variantForAppearance(props.appearance))
const height = computed(
  () =>
    `var(--v-control-height-${props.size === 'small' ? 'sm' : props.size === 'large' ? 'lg' : 'md'})`,
)
</script>

<template>
  <VBtn
    v-bind="$attrs"
    class="va-button"
    :class="[`va-button--${size}`, { 'va-button--loading': loading }]"
    :aria-busy="loading || undefined"
    :color="loading ? undefined : color"
    :disabled="disabled || loading"
    :append-icon="loading ? undefined : appendIcon"
    :height="height"
    :prepend-icon="loading ? undefined : prependIcon"
    :variant="variant"
  >
    <span class="va-button__content-stack">
      <span :aria-hidden="loading || undefined" :class="{ 'va-button__content--hidden': loading }">
        <slot />
      </span>
      <span v-if="loading" class="va-button__loader" role="status">
        <VProgressCircular
          aria-hidden="true"
          indeterminate
          :size="'var(--v-button-spinner-size)'"
          :width="2"
        />
        <span class="va-button__loading-text">{{ resolvedLoadingText }}</span>
      </span>
    </span>
  </VBtn>
</template>

<style>
.va-button {
  padding-inline: var(--v-space-4);
  font-size: var(--v-font-size-md);
  font-weight: var(--v-font-weight-semibold);
  letter-spacing: 0;
  text-transform: none;
}

.va-button--small {
  min-inline-size: var(--v-control-height-sm);
  padding-inline: var(--v-space-3);
  font-size: var(--v-font-size-sm);
}

.va-button--medium {
  min-inline-size: var(--v-control-height-md);
}

.va-button--large {
  min-inline-size: var(--v-control-height-lg);
  padding-inline: var(--v-space-5);
  font-size: var(--v-font-size-lg);
}

.va-button__content-stack {
  display: inline-grid;
  place-items: center;
}

.va-button__content-stack > * {
  grid-area: 1 / 1;
}

.va-button__content--hidden {
  visibility: hidden;
}

.va-button__loader {
  display: inline-flex;
  gap: var(--v-space-2);
  align-items: center;
}

.va-button--loading {
  cursor: wait;
}

.va-button__loading-text {
  font-size: var(--v-font-size-sm);
}
</style>
