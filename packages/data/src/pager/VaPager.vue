<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { VPagination, VSelect, VTextField } from 'vuetify/components'
import type { PaginationMeta, PaginationRequest } from '@vela-admin/contracts'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton } from '@vela-admin/ui'

import {
  changePage,
  changePaginationPageSize,
  nextPagination,
  normalizePaginationJump,
  previousPagination,
  resolvePaginationDisplay,
  type PaginationDisplay,
} from './pagination'

const props = withDefaults(
  defineProps<{
    pagination: PaginationMeta
    itemCount: number
    pageSizes?: readonly number[]
    disabled?: boolean
    pageSizeLabel?: string | undefined
    previousText?: string | undefined
    nextText?: string | undefined
    rangeLabel?: ((display: PaginationDisplay) => string) | undefined
    showPageSizeLabel?: boolean
    visiblePages?: number
    jumpThreshold?: number
  }>(),
  {
    pageSizes: () => [15, 25, 50, 100],
    disabled: false,
    pageSizeLabel: undefined,
    previousText: undefined,
    nextText: undefined,
    rangeLabel: undefined,
    showPageSizeLabel: false,
    visiblePages: 7,
    jumpThreshold: 10,
  },
)

const emit = defineEmits<{
  change: [value: PaginationRequest]
}>()

const { smAndDown } = useDisplay()
const locale = useVelaLocale()
const display = computed(() => resolvePaginationDisplay(props.pagination, props.itemCount))
const resolvedPageSizeLabel = computed(
  () => props.pageSizeLabel ?? locale.t('data.pager.rowsPerPage'),
)
const resolvedPreviousText = computed(() => props.previousText ?? locale.t('data.pager.previous'))
const resolvedNextText = computed(() => props.nextText ?? locale.t('data.pager.next'))
const resolvedRangeLabel = computed(() => {
  if (props.rangeLabel) return props.rangeLabel(display.value)
  if (display.value.mode === 'cursor') {
    return locale.t(display.value.itemCount === 1 ? 'data.pager.row' : 'data.pager.rows', {
      count: display.value.itemCount,
    })
  }
  const parameters = {
    start: display.value.start ?? 0,
    end: display.value.end ?? 0,
    total: display.value.total ?? 0,
  }
  return locale.t(
    display.value.total === undefined ? 'data.pager.rangeWithoutTotal' : 'data.pager.range',
    parameters,
  )
})
const currentPage = computed(() => (props.pagination.mode === 'page' ? props.pagination.page : 1))
const pageCount = computed(() =>
  props.pagination.mode === 'page' ? Math.max(1, props.pagination.pageCount) : 1,
)
const pageSizeItems = computed(() =>
  [...new Set([...props.pageSizes, display.value.pageSize])].sort((left, right) => left - right),
)
const jumpValue = ref('')
const showJump = computed(
  () => display.value.mode === 'page' && pageCount.value >= Math.max(2, props.jumpThreshold),
)

watch(currentPage, () => {
  jumpValue.value = ''
})

function updatePage(page: number): void {
  emit('change', changePage(props.pagination, page))
}

function updatePageSize(value: number | null): void {
  if (value === null || value === display.value.pageSize) return
  emit('change', changePaginationPageSize(props.pagination, value))
}

function goPrevious(): void {
  const request = previousPagination(props.pagination)
  if (request) emit('change', request)
}

function goNext(): void {
  const request = nextPagination(props.pagination)
  if (request) emit('change', request)
}

function jumpToPage(): void {
  const page = normalizePaginationJump(jumpValue.value, pageCount.value)
  if (page === undefined) return
  jumpValue.value = ''
  if (page !== currentPage.value) updatePage(page)
}
</script>

<template>
  <footer class="va-pager" :aria-label="locale.t('data.pager.label')">
    <span class="va-pager__range" aria-live="polite">
      {{ resolvedRangeLabel }}
    </span>
    <div class="va-pager__controls">
      <label class="va-pager__size-control">
        <span v-if="showPageSizeLabel" class="va-pager__size-label">
          {{ resolvedPageSizeLabel }}
        </span>
        <VSelect
          :aria-label="resolvedPageSizeLabel"
          class="va-pager__size"
          :clearable="false"
          :disabled="disabled"
          density="compact"
          hide-details
          :items="pageSizeItems"
          :model-value="display.pageSize"
          variant="outlined"
          @update:model-value="updatePageSize"
        />
      </label>
      <VPagination
        v-if="display.mode === 'page'"
        :disabled="disabled"
        :length="pageCount"
        :model-value="currentPage"
        :total-visible="smAndDown ? 3 : visiblePages"
        @update:model-value="updatePage"
      />
      <form v-if="showJump" class="va-pager__jump" @submit.prevent="jumpToPage">
        <VTextField
          v-model="jumpValue"
          :aria-label="locale.t('data.pager.jumpTo')"
          append-inner-icon="$next"
          density="compact"
          hide-details
          inputmode="numeric"
          :max="pageCount"
          min="1"
          :placeholder="String(currentPage)"
          type="number"
          variant="outlined"
          @click:append-inner="jumpToPage"
        />
      </form>
      <div v-else class="va-pager__sequential">
        <VaButton
          appearance="text"
          :disabled="disabled || !display.canPrevious"
          prepend-icon="$prev"
          @click="goPrevious"
        >
          {{ resolvedPreviousText }}
        </VaButton>
        <VaButton
          appearance="text"
          :disabled="disabled || !display.canNext"
          append-icon="$next"
          @click="goNext"
        >
          {{ resolvedNextText }}
        </VaButton>
      </div>
    </div>
  </footer>
</template>

<style>
.va-pager {
  display: flex;
  gap: var(--v-space-4);
  align-items: center;
  justify-content: space-between;
  min-block-size: var(--v-data-pager-height);
  padding: var(--v-space-1) var(--v-space-4);
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: var(--v-font-size-sm);
  background:
    linear-gradient(
      rgba(var(--v-theme-primary), var(--v-data-pager-tint-opacity)),
      rgba(var(--v-theme-primary), var(--v-data-pager-tint-opacity))
    ),
    rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-block-start: 0;
  border-radius: 0 0 var(--v-radius-lg) var(--v-radius-lg);
}

.va-pager__controls,
.va-pager__size-control,
.va-pager__sequential {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  min-inline-size: 0;
}

.va-pager__size-label {
  white-space: nowrap;
}

.va-pager__size {
  --v-input-control-height: var(--v-control-height-sm);

  flex: 0 0 var(--v-data-pager-select-width);
  inline-size: var(--v-data-pager-select-width);
}

.va-pager__size .v-field {
  block-size: var(--v-control-height-sm);
  min-block-size: var(--v-control-height-sm);
}

.va-pager__jump {
  --v-input-control-height: var(--v-control-height-sm);

  flex: 0 0 var(--v-data-pager-jump-width);
  inline-size: var(--v-data-pager-jump-width);
}

.va-pager__jump .v-field {
  block-size: var(--v-control-height-sm);
  min-block-size: var(--v-control-height-sm);
}

.va-pager__jump input {
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.va-pager__jump input::-webkit-inner-spin-button,
.va-pager__jump input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.va-pager .v-pagination__list {
  gap: var(--v-space-1);
}

.va-pager .v-pagination__item,
.va-pager .v-pagination__first,
.va-pager .v-pagination__prev,
.va-pager .v-pagination__next,
.va-pager .v-pagination__last {
  margin: 0;
}

.va-pager .v-pagination .v-btn {
  min-inline-size: var(--v-control-height-sm);
  inline-size: var(--v-control-height-sm);
  block-size: var(--v-control-height-sm);
  font-size: var(--v-font-size-sm);
}

.va-pager .v-pagination__item--is-active .v-btn {
  box-shadow: var(--v-shadow-card);
}

.va-pager__sequential {
  gap: var(--v-space-1);
}

@media (max-width: 599px) {
  .va-pager__range,
  .va-pager__size-label,
  .va-pager__jump {
    display: none;
  }

  .va-pager__sequential {
    display: none;
  }

  .va-pager__controls {
    justify-content: space-between;
    inline-size: 100%;
  }

  .va-pager__sequential .va-button {
    padding-inline: var(--v-space-2);
  }
}
</style>
