<script setup lang="ts">
import { computed } from 'vue'
import { VCard, VIcon, VSkeletonLoader } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import VaTag from '../tag/VaTag.vue'
import type { SemanticTone, StatTrend } from '../types'

const props = withDefaults(
  defineProps<{
    label: string
    value?: string | number | undefined
    caption?: string | undefined
    icon?: string | undefined
    tone?: SemanticTone
    trend?: StatTrend | undefined
    loading?: boolean
  }>(),
  {
    value: undefined,
    caption: undefined,
    icon: undefined,
    tone: 'primary',
    trend: undefined,
    loading: false,
  },
)

const trendTone = computed<SemanticTone>(() => {
  if (!props.trend || props.trend.direction === 'flat') return 'neutral'
  return props.trend.direction === 'up' ? 'success' : 'danger'
})
const locale = useVelaLocale()
</script>

<template>
  <VCard class="va-stat-card" :class="`va-stat-card--${tone}`">
    <VSkeletonLoader
      v-if="loading"
      :aria-label="locale.t('ui.stat.loading')"
      type="heading, text"
    />
    <template v-else>
      <div class="va-stat-card__topline">
        <span class="va-stat-card__label">{{ label }}</span>
        <span v-if="icon" aria-hidden="true" class="va-stat-card__icon">
          <VIcon :icon="icon" size="20" />
        </span>
      </div>
      <div class="va-stat-card__value">{{ value ?? '—' }}</div>
      <div v-if="caption || trend" class="va-stat-card__footer">
        <VaTag v-if="trend" :tone="trendTone">
          {{ trend.value }}<span v-if="trend.label"> · {{ trend.label }}</span>
        </VaTag>
        <span v-if="caption" class="va-stat-card__caption">{{ caption }}</span>
      </div>
    </template>
  </VCard>
</template>

<style>
.va-stat-card {
  --va-stat-tone: var(--v-theme-primary);

  display: grid;
  gap: var(--v-space-3);
  min-inline-size: 0;
  padding: var(--v-space-5);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: var(--v-shadow-card);
}

.va-stat-card--success {
  --va-stat-tone: var(--v-theme-success);
}

.va-stat-card--danger {
  --va-stat-tone: var(--v-theme-error);
}

.va-stat-card--warning {
  --va-stat-tone: var(--v-theme-warning);
}

.va-stat-card--info {
  --va-stat-tone: var(--v-theme-info);
}

.va-stat-card--neutral {
  --va-stat-tone: var(--v-theme-secondary);
}

.va-stat-card__topline,
.va-stat-card__footer {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  justify-content: space-between;
  min-inline-size: 0;
}

.va-stat-card__label,
.va-stat-card__caption {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-stat-card__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  inline-size: var(--v-control-height-sm);
  block-size: var(--v-control-height-sm);
  color: rgb(var(--va-stat-tone));
  background: rgba(var(--va-stat-tone), var(--v-selected-opacity));
  border-radius: var(--v-radius-md);
}

.va-stat-card__value {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: var(--v-font-size-2xl);
  font-weight: var(--v-font-weight-bold);
  font-variant-numeric: tabular-nums;
  line-height: var(--v-line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
