<script setup lang="ts">
import { computed, useId } from 'vue'
import { VIcon } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import VaButton from '../button/VaButton.vue'
import type { StateViewKind } from './types'

const props = withDefaults(
  defineProps<{
    kind?: StateViewKind
    title?: string | undefined
    text?: string | undefined
    actionText?: string | undefined
  }>(),
  {
    kind: 'empty',
    title: undefined,
    text: undefined,
    actionText: undefined,
  },
)

const emit = defineEmits<{
  action: []
}>()

const locale = useVelaLocale()
const titleId = useId()
const defaults = computed(() => {
  switch (props.kind) {
    case 'empty':
      return {
        icon: '$empty',
        title: locale.t('ui.state.empty.title'),
        text: locale.t('ui.state.empty.text'),
      }
    case 'error':
      return {
        icon: '$error',
        title: locale.t('ui.state.error.title'),
        text: locale.t('ui.state.error.text'),
      }
    case 'forbidden':
      return {
        icon: '$warning',
        title: locale.t('ui.state.forbidden.title'),
        text: locale.t('ui.state.forbidden.text'),
      }
    case 'not-found':
      return {
        icon: '$info',
        title: locale.t('ui.state.notFound.title'),
        text: locale.t('ui.state.notFound.text'),
      }
    case 'offline':
      return {
        icon: '$offline',
        title: locale.t('ui.state.offline.title'),
        text: locale.t('ui.state.offline.text'),
      }
  }
})
const resolvedTitle = computed(() => props.title ?? defaults.value.title)
const resolvedText = computed(() => props.text ?? defaults.value.text)
const liveRole = computed(() => (props.kind === 'error' ? 'alert' : 'status'))
</script>

<template>
  <section
    :aria-labelledby="titleId"
    class="va-state-view"
    :class="`va-state-view--${kind}`"
    :role="liveRole"
  >
    <div class="va-state-view__inner">
      <div class="va-state-view__visual" aria-hidden="true">
        <span class="va-state-view__orbit va-state-view__orbit--outer" />
        <span class="va-state-view__orbit va-state-view__orbit--inner" />
        <span class="va-state-view__dot va-state-view__dot--start" />
        <span class="va-state-view__dot va-state-view__dot--end" />
        <span class="va-state-view__icon">
          <VIcon :icon="defaults.icon" :size="'var(--v-state-view-icon-size)'" />
        </span>
      </div>

      <div class="va-state-view__copy">
        <h2 :id="titleId" class="va-state-view__title">{{ resolvedTitle }}</h2>
        <p class="va-state-view__text">{{ resolvedText }}</p>
      </div>

      <div v-if="$slots.default || actionText" class="va-state-view__actions">
        <slot />
        <VaButton v-if="actionText" appearance="tonal" @click="emit('action')">
          {{ actionText }}
        </VaButton>
      </div>
    </div>
  </section>
</template>

<style>
.va-state-view {
  --va-state-tone: var(--v-theme-primary);
  --va-state-on-tone: var(--v-theme-on-primary);

  position: relative;
  display: grid;
  min-block-size: var(--v-state-view-min-height);
  padding: var(--v-space-8) var(--v-space-6);
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  background:
    linear-gradient(
      135deg,
      rgba(var(--va-state-tone), var(--v-state-view-tint-opacity)),
      rgba(var(--v-theme-surface), var(--v-runtime-surface-opacity)) 48%
    ),
    rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--va-state-tone), var(--v-state-view-ring-opacity));
  border-radius: var(--v-radius-xl);
  isolation: isolate;
}

.va-state-view::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  content: '';
  background-image:
    linear-gradient(
      rgba(var(--va-state-tone), var(--v-state-view-pattern-opacity)) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(var(--va-state-tone), var(--v-state-view-pattern-opacity)) 1px,
      transparent 1px
    );
  background-size: var(--v-state-view-pattern-size) var(--v-state-view-pattern-size);
  mask-image: radial-gradient(circle at center, black, transparent 72%);
}

.va-state-view--error {
  --va-state-tone: var(--v-theme-error);
  --va-state-on-tone: var(--v-theme-on-error);
}

.va-state-view--forbidden {
  --va-state-tone: var(--v-theme-warning);
  --va-state-on-tone: var(--v-theme-on-warning);
}

.va-state-view--not-found,
.va-state-view--offline {
  --va-state-tone: var(--v-theme-info);
  --va-state-on-tone: var(--v-theme-on-info);
}

.va-state-view__inner {
  display: grid;
  gap: var(--v-space-4);
  place-items: center;
  align-self: center;
  inline-size: min(100%, var(--v-state-view-max-width));
  margin-inline: auto;
  text-align: center;
}

.va-state-view__visual {
  position: relative;
  display: grid;
  inline-size: var(--v-state-view-decoration-size);
  block-size: var(--v-state-view-decoration-size);
  place-items: center;
}

.va-state-view__icon {
  position: relative;
  z-index: 2;
  display: grid;
  inline-size: var(--v-state-view-visual-size);
  block-size: var(--v-state-view-visual-size);
  color: rgb(var(--va-state-on-tone));
  background: rgb(var(--va-state-tone));
  border-radius: var(--v-radius-xl);
  box-shadow: var(--v-state-view-glow);
  place-items: center;
  transform: rotate(-6deg);
}

.va-state-view__icon .v-icon {
  transform: rotate(6deg);
}

.va-state-view__orbit {
  position: absolute;
  border: 1px solid rgba(var(--va-state-tone), var(--v-state-view-ring-opacity));
  border-radius: var(--v-radius-pill);
}

.va-state-view__orbit--outer {
  inset: 0;
}

.va-state-view__orbit--inner {
  inset: var(--v-space-5);
  border-style: dashed;
}

.va-state-view__dot {
  position: absolute;
  inline-size: var(--v-space-3);
  block-size: var(--v-space-3);
  background: rgb(var(--va-state-tone));
  border: var(--v-space-1) solid rgb(var(--v-theme-surface));
  border-radius: var(--v-radius-pill);
  box-shadow: var(--v-shadow-card);
}

.va-state-view__dot--start {
  inset-block-start: var(--v-space-4);
  inset-inline-end: var(--v-space-5);
}

.va-state-view__dot--end {
  inset-block-end: var(--v-space-4);
  inset-inline-start: var(--v-space-5);
}

.va-state-view__copy {
  display: grid;
  gap: var(--v-space-2);
}

.va-state-view__title,
.va-state-view__text {
  margin: 0;
}

.va-state-view__title {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: var(--v-font-size-xl);
  font-weight: var(--v-font-weight-semibold);
  line-height: var(--v-line-height-tight);
  letter-spacing: -0.015em;
}

.va-state-view__text {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: var(--v-font-size-md);
}

.va-state-view__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--v-space-2);
  justify-content: center;
}

@media (max-width: 599px) {
  .va-state-view {
    min-block-size: calc(var(--v-state-view-min-height) - var(--v-space-8));
    padding: var(--v-space-6) var(--v-space-4);
  }
}
</style>
