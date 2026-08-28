<script setup lang="ts">
import { computed } from 'vue'
import { VIcon, VImg } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { colorForTone, type SemanticTone, VaAvatar, VaTag } from '@vela-admin/ui'

import type { ColumnPresentation } from './types'
import {
  displayTableValue,
  formatNumberTableValue,
  formatRelativeTemporalValue,
  formatTemporalTableValue,
  resolveBooleanTableValue,
  resolveCurrencyTableValue,
  resolveIdentityTableValue,
  resolveMediaTableValue,
  resolveProgressTableValue,
  resolveStatusTableValue,
  resolveTrendTableValue,
} from './presentation'

const props = defineProps<{
  value: unknown
  presentation: ColumnPresentation
}>()

const locale = useVelaLocale()

const identityPresentation = computed(() =>
  props.presentation.kind === 'identity' ? props.presentation : undefined,
)
const numberPresentation = computed(() =>
  props.presentation.kind === 'number' ? props.presentation : undefined,
)
const currencyPresentation = computed(() =>
  props.presentation.kind === 'currency' ? props.presentation : undefined,
)
const mediaPresentation = computed(() =>
  props.presentation.kind === 'media' ? props.presentation : undefined,
)
const booleanPresentation = computed(() =>
  props.presentation.kind === 'boolean' ? props.presentation : undefined,
)
const progressPresentation = computed(() =>
  props.presentation.kind === 'progress' ? props.presentation : undefined,
)
const trendPresentation = computed(() =>
  props.presentation.kind === 'trend' ? props.presentation : undefined,
)
const identityValue = computed(() =>
  identityPresentation.value ? resolveIdentityTableValue(props.value) : undefined,
)
const mediaValue = computed(() =>
  mediaPresentation.value ? resolveMediaTableValue(props.value) : undefined,
)
const formattedNumber = computed(() =>
  numberPresentation.value
    ? formatNumberTableValue(props.value, numberPresentation.value)
    : undefined,
)
const temporalPresentation = computed(() =>
  props.presentation.kind === 'date' || props.presentation.kind === 'datetime'
    ? props.presentation
    : undefined,
)
const statusPresentation = computed(() =>
  props.presentation.kind === 'status' ? props.presentation : undefined,
)
const currencyValue = computed(() =>
  currencyPresentation.value
    ? resolveCurrencyTableValue(props.value, currencyPresentation.value)
    : undefined,
)
const formattedTemporal = computed(() =>
  temporalPresentation.value
    ? formatTemporalTableValue(props.value, temporalPresentation.value)
    : undefined,
)
const relativeTemporal = computed(() =>
  temporalPresentation.value
    ? formatRelativeTemporalValue(props.value, temporalPresentation.value)
    : undefined,
)
const statusValue = computed(() =>
  statusPresentation.value
    ? resolveStatusTableValue(props.value, statusPresentation.value)
    : undefined,
)
const booleanValue = computed(() =>
  booleanPresentation.value
    ? resolveBooleanTableValue(props.value, booleanPresentation.value)
    : undefined,
)
const progressValue = computed(() =>
  progressPresentation.value
    ? resolveProgressTableValue(props.value, progressPresentation.value)
    : undefined,
)
const trendValue = computed(() =>
  trendPresentation.value
    ? resolveTrendTableValue(props.value, trendPresentation.value)
    : undefined,
)
const booleanLabel = computed(() => {
  if (!booleanValue.value) return undefined
  if (booleanValue.value.label) return booleanValue.value.label
  if (booleanValue.value.state === 'true') return locale.t('common.yes')
  if (booleanValue.value.state === 'false') return locale.t('common.no')
  return locale.t('data.boolean.unknown')
})
const booleanIcon = computed(() => {
  if (!booleanValue.value) return undefined
  if (booleanValue.value.icon) return booleanValue.value.icon
  if (booleanValue.value.state === 'true') return '$checkCircle'
  if (booleanValue.value.state === 'false') return '$closeCircle'
  return '$helpCircle'
})
const currencyTone = computed<SemanticTone>(() => {
  if (currencyPresentation.value?.tone) return currencyPresentation.value.tone
  if (!currencyPresentation.value?.toneBySign || currencyValue.value?.numeric === undefined) {
    return 'primary'
  }
  if (currencyValue.value.numeric > 0) return 'success'
  if (currencyValue.value.numeric < 0) return 'danger'
  return 'neutral'
})
const mediaStyle = computed<Record<string, string>>(() => ({
  '--va-table-media-width': cssSize(mediaPresentation.value?.width, 'var(--v-table-media-width)'),
  '--va-table-media-height': cssSize(
    mediaPresentation.value?.height,
    'var(--v-table-media-height)',
  ),
}))
const progressBarStyle = computed<Record<string, string>>(() => ({
  inlineSize: `${progressValue.value?.percentage ?? 0}%`,
}))
const progressAriaLabel = computed(() => {
  if (!progressValue.value) return undefined
  const primary = progressValue.value.label ?? `${Math.round(progressValue.value.percentage)}%`
  return progressValue.value.secondary
    ? `${primary}, ${progressValue.value.secondary}`
    : `${primary}`
})

function cssSize(value: string | number | undefined, fallback: string): string {
  if (typeof value === 'number') return `${value}px`
  return value ?? fallback
}

function currencyPartClass(type: Intl.NumberFormatPartTypes): string {
  return `va-table-cell__money-part va-table-cell__money-part--${type}`
}

function toneStyle(tone: Parameters<typeof colorForTone>[0] = 'neutral'): Record<string, string> {
  const color = colorForTone(tone) ?? 'on-surface-variant'
  return { '--va-table-cell-tone': `var(--v-theme-${color})` }
}
</script>

<template>
  <span v-if="identityPresentation && identityValue" class="va-table-cell va-table-cell--identity">
    <VaAvatar
      decorative
      :icon="identityValue.icon"
      :image="identityValue.image"
      :name="identityValue.primary"
      :size="identityPresentation.avatarSize ?? 'var(--v-table-identity-avatar-size)'"
    />
    <span class="va-table-cell__content">
      <strong>{{ identityValue.primary }}</strong>
      <small v-if="identityValue.secondary">{{ identityValue.secondary }}</small>
    </span>
  </span>

  <span
    v-else-if="mediaPresentation && mediaValue"
    class="va-table-cell va-table-cell--media"
    :style="mediaStyle"
  >
    <VImg
      v-if="mediaValue.image"
      class="va-table-cell__media"
      :alt="mediaValue.alt"
      :cover="mediaPresentation.fit !== 'contain'"
      :src="mediaValue.image"
    />
    <span v-else class="va-table-cell__media va-table-cell__media--fallback" aria-hidden="true">
      <VIcon :icon="mediaValue.icon ?? mediaPresentation.fallbackIcon ?? '$image'" />
    </span>
    <span class="va-table-cell__content">
      <strong>{{ mediaValue.primary }}</strong>
      <small v-if="mediaValue.secondary">{{ mediaValue.secondary }}</small>
    </span>
  </span>

  <span
    v-else-if="numberPresentation"
    class="va-table-cell va-table-cell--metric"
    :style="toneStyle(numberPresentation.tone)"
  >
    <span v-if="numberPresentation.icon" class="va-table-cell__visual">
      <VIcon :icon="numberPresentation.icon" />
    </span>
    <span class="va-table-cell__content">
      <strong>{{ formattedNumber }}</strong>
    </span>
  </span>

  <span
    v-else-if="currencyPresentation"
    class="va-table-cell va-table-cell--money"
    :style="toneStyle(currencyTone)"
  >
    <span v-if="currencyPresentation.icon" class="va-table-cell__visual">
      <VIcon :icon="currencyPresentation.icon" />
    </span>
    <span class="va-table-cell__content">
      <strong class="va-table-cell__money-value">
        <span
          v-for="(part, index) in currencyValue?.parts"
          :key="`${part.type}-${index}`"
          :class="currencyPartClass(part.type)"
          >{{ part.value }}</span
        >
      </strong>
      <small v-if="currencyPresentation.showCurrencyCode">
        {{ currencyPresentation.currency }}
      </small>
    </span>
  </span>

  <span v-else-if="temporalPresentation" class="va-table-cell va-table-cell--time">
    <VIcon
      v-if="temporalPresentation.icon"
      class="va-table-cell__time-icon"
      :icon="temporalPresentation.icon"
    />
    <span class="va-table-cell__content">
      <strong>{{ formattedTemporal }}</strong>
      <small v-if="relativeTemporal">{{ relativeTemporal }}</small>
    </span>
  </span>

  <VaTag
    v-else-if="statusPresentation && statusValue"
    class="va-table-cell--status"
    :dot="Boolean(statusPresentation.dot)"
    :icon="statusValue.icon"
    :tone="statusValue.tone"
  >
    {{ statusValue.label }}
  </VaTag>

  <VaTag
    v-else-if="booleanPresentation && booleanValue"
    class="va-table-cell--boolean"
    :dot="Boolean(booleanPresentation.dot)"
    :icon="booleanIcon"
    :tone="booleanValue.tone"
  >
    {{ booleanLabel }}
  </VaTag>

  <span
    v-else-if="progressPresentation && progressValue"
    class="va-table-cell va-table-cell--progress"
    :style="toneStyle(progressValue.tone ?? progressPresentation.tone ?? 'primary')"
  >
    <span class="va-table-cell__progress-content">
      <span v-if="progressValue.label" class="va-table-cell__progress-label">
        {{ progressValue.label }}
      </span>
      <span
        class="va-table-cell__progress-track"
        role="progressbar"
        :aria-label="progressAriaLabel"
        :aria-valuemax="progressValue.max"
        :aria-valuemin="progressPresentation.min ?? 0"
        :aria-valuenow="progressValue.value"
      >
        <span class="va-table-cell__progress-bar" :style="progressBarStyle" />
      </span>
      <small v-if="progressValue.secondary">{{ progressValue.secondary }}</small>
    </span>
  </span>

  <span
    v-else-if="trendPresentation && trendValue"
    class="va-table-cell va-table-cell--trend"
    :style="toneStyle(trendValue.tone)"
  >
    <span class="va-table-cell__content">
      <strong>{{ trendValue.value }}</strong>
      <small v-if="trendValue.secondary">{{ trendValue.secondary }}</small>
    </span>
    <span v-if="trendValue.delta" class="va-table-cell__trend-delta">
      <VIcon
        v-if="trendValue.direction !== 'flat'"
        :icon="trendValue.direction === 'up' ? '$arrowUp' : '$arrowDown'"
      />
      {{ trendValue.delta }}
    </span>
  </span>

  <span v-else>{{ displayTableValue(value) }}</span>
</template>

<style>
.va-table-cell {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  inline-size: 100%;
  min-inline-size: 0;
  text-align: start;
}

.va-table-cell__content {
  display: grid;
  min-inline-size: 0;
  line-height: var(--v-line-height-tight);
}

.va-table-cell__content strong {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: var(--v-font-size-md);
  font-variant-numeric: tabular-nums;
  font-weight: var(--v-font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-table-cell__content small {
  margin-block-start: var(--v-space-1);
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
  font-weight: var(--v-font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-table-cell__media {
  flex: 0 0 var(--va-table-media-width);
  inline-size: var(--va-table-media-width);
  block-size: var(--va-table-media-height);
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), var(--v-table-media-background-opacity));
  border: 1px solid rgba(var(--v-theme-on-surface), var(--v-table-media-border-opacity));
  border-radius: var(--v-radius-md);
}

.va-table-cell__media--fallback {
  display: grid;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  place-items: center;
}

.va-table-cell__media--fallback .v-icon {
  font-size: var(--v-table-cell-icon-size);
}

.va-table-cell__visual {
  display: grid;
  flex: 0 0 var(--v-table-cell-visual-size);
  inline-size: var(--v-table-cell-visual-size);
  block-size: var(--v-table-cell-visual-size);
  color: rgb(var(--va-table-cell-tone));
  background: rgba(var(--va-table-cell-tone), var(--v-table-cell-visual-tint-opacity));
  border: 1px solid rgba(var(--va-table-cell-tone), var(--v-table-cell-visual-border-opacity));
  border-radius: var(--v-radius-md);
  place-items: center;
}

.va-table-cell__visual .v-icon {
  font-size: var(--v-table-cell-icon-size);
}

.va-table-cell__time-icon {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-table-cell-icon-size);
}

.va-table-cell--metric,
.va-table-cell--money,
.va-table-cell--trend {
  justify-content: flex-end;
}

.va-table-cell--metric .va-table-cell__content,
.va-table-cell--money .va-table-cell__content,
.va-table-cell--trend .va-table-cell__content {
  justify-items: end;
}

.va-table-cell__money-value {
  color: rgb(var(--va-table-cell-tone));
}

.va-table-cell__money-part--currency,
.va-table-cell__money-part--decimal,
.va-table-cell__money-part--fraction {
  opacity: var(--v-medium-emphasis-opacity);
}

.va-table-cell--progress {
  justify-content: flex-start;
}

.va-table-cell__progress-content {
  display: grid;
  gap: var(--v-space-2);
  inline-size: min(100%, var(--v-table-progress-width));
}

.va-table-cell__progress-label {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: var(--v-font-size-sm);
  font-variant-numeric: tabular-nums;
  font-weight: var(--v-font-weight-semibold);
}

.va-table-cell__progress-content small {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-table-cell__progress-track {
  display: block;
  inline-size: 100%;
  block-size: var(--v-table-progress-height);
  overflow: hidden;
  background: rgba(var(--va-table-cell-tone), var(--v-table-progress-track-opacity));
  border-radius: var(--v-radius-pill);
}

.va-table-cell__progress-bar {
  display: block;
  block-size: 100%;
  background: rgb(var(--va-table-cell-tone));
  border-radius: inherit;
  box-shadow: var(--v-table-progress-glow);
  transition: inline-size var(--v-motion-duration-standard) var(--v-motion-easing-standard);
}

.va-table-cell__trend-delta {
  display: inline-flex;
  gap: var(--v-space-1);
  align-items: center;
  padding: var(--v-space-1) var(--v-space-2);
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: var(--v-font-size-xs);
  font-variant-numeric: tabular-nums;
  font-weight: var(--v-font-weight-semibold);
  background: rgba(var(--va-table-cell-tone), var(--v-table-trend-tint-opacity));
  border: 1px solid rgba(var(--va-table-cell-tone), var(--v-table-trend-border-opacity));
  border-radius: var(--v-radius-pill);
}

.va-table-cell__trend-delta .v-icon {
  color: rgb(var(--va-table-cell-tone));
  font-size: var(--v-table-trend-icon-size);
}
</style>
