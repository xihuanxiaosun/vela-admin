<script setup lang="ts" generic="TItem extends Record<string, unknown>">
import { computed, useAttrs, useSlots } from 'vue'
import { VAlert, VProgressLinear } from 'vuetify/components'
import type { NormalizedError, PaginationMeta, PaginationRequest } from '@vela-admin/contracts'
import { useVelaLocale } from '@vela-admin/locale'
import { VaSkeleton, VaStateView } from '@vela-admin/ui'

import VaPager from './pager/VaPager.vue'
import type { ColumnResizeEvent, DataColumn, TableLayoutOptions } from './table/types'
import VaDataTable from './table/VaDataTable.vue'

const props = withDefaults(
  defineProps<{
    columns: readonly DataColumn<TItem>[]
    items: readonly TItem[]
    pagination: PaginationMeta
    pageSizes?: readonly number[]
    loading?: boolean
    refreshing?: boolean
    error?: NormalizedError | undefined
    height?: string | number
    fillHeight?: boolean
    rowKey?: string | ((item: TItem) => unknown)
    layout?: TableLayoutOptions
    emptyTitle?: string | undefined
    emptyText?: string | undefined
    retryText?: string | undefined
  }>(),
  {
    pageSizes: () => [15, 25, 50, 100],
    loading: false,
    refreshing: false,
    error: undefined,
    height: 'var(--v-table-body-height)',
    fillHeight: false,
    rowKey: 'id',
    layout: () => ({}),
    emptyTitle: undefined,
    emptyText: undefined,
    retryText: undefined,
  },
)

const emit = defineEmits<{
  paginate: [value: PaginationRequest]
  retry: []
  'update:column-widths': [value: Readonly<Record<string, number>>]
  'column-resize': [value: ColumnResizeEvent]
  'column-resize-reset': [key: string]
}>()

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const locale = useVelaLocale()
const slots = useSlots()
const resolvedEmptyTitle = computed(() => props.emptyTitle ?? locale.t('data.page.emptyTitle'))
const resolvedEmptyText = computed(() => props.emptyText ?? locale.t('data.page.emptyText'))
const resolvedRetryText = computed(() => props.retryText ?? locale.t('common.retry'))
const hasItems = computed(() => props.items.length > 0)
const hasToolbar = computed(() => Boolean(slots.toolbar))
const isInitialLoading = computed(() => props.loading && !hasItems.value)
const resolvedHeight = computed(() => (props.fillHeight ? '100%' : props.height))
const tableTotal = computed(() => {
  if (props.pagination.mode === 'page') return props.pagination.total
  if (props.pagination.mode === 'offset') return props.pagination.total ?? props.items.length
  return props.items.length
})
const tableSlotNames = computed(() =>
  Object.keys(slots).filter((name) => !['filters', 'toolbar', 'empty', 'error'].includes(name)),
)
</script>

<template>
  <section
    class="va-data-page"
    :class="{
      'va-data-page--fill': fillHeight,
      'va-data-page--has-toolbar': hasToolbar,
    }"
    :aria-busy="loading || refreshing || undefined"
  >
    <div v-if="$slots.filters" class="va-data-page__filters">
      <slot name="filters" />
    </div>

    <div v-if="$slots.toolbar" class="va-data-page__toolbar">
      <slot name="toolbar" />
    </div>

    <VAlert
      v-if="error && hasItems"
      class="va-data-page__notice"
      color="error"
      density="compact"
      :text="error.message"
      type="error"
    />

    <div class="va-data-page__table-region">
      <VProgressLinear
        v-if="refreshing && hasItems"
        :aria-label="locale.t('data.page.refreshing')"
        class="va-data-page__refresh"
        color="primary"
        indeterminate
      />
      <div v-if="isInitialLoading" class="va-data-page__state">
        <VaSkeleton :label="locale.t('data.page.loadingTable')" preset="table" />
      </div>

      <div v-else-if="error && !hasItems" class="va-data-page__state">
        <slot name="error" :error="error" :retry="() => emit('retry')">
          <VaStateView
            :action-text="resolvedRetryText"
            kind="error"
            :text="error.message"
            @action="emit('retry')"
          />
        </slot>
      </div>

      <div v-else-if="!hasItems" class="va-data-page__state">
        <slot name="empty">
          <VaStateView :text="resolvedEmptyText" :title="resolvedEmptyTitle" />
        </slot>
      </div>

      <VaDataTable
        v-else
        v-bind="attrs"
        :columns="columns"
        :height="resolvedHeight"
        :items="items"
        :layout="layout"
        :loading="refreshing"
        :row-key="rowKey"
        :total="tableTotal"
        @column-resize="emit('column-resize', $event)"
        @column-resize-reset="emit('column-resize-reset', $event)"
        @update:column-widths="emit('update:column-widths', $event)"
      >
        <template v-for="slotName in tableSlotNames" :key="slotName" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
      </VaDataTable>
    </div>
    <template v-if="hasItems">
      <VaPager
        :item-count="items.length"
        :pagination="pagination"
        :page-sizes="pageSizes"
        @change="emit('paginate', $event)"
      />
    </template>
  </section>
</template>

<style>
.va-data-page {
  position: relative;
  min-inline-size: 0;
}

.va-data-page__toolbar {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: var(--v-space-2);
  align-items: center;
  justify-content: flex-end;
  min-block-size: var(--v-control-height-md);
  padding: var(--v-space-2) var(--v-space-3);
  background: rgba(var(--v-theme-surface), var(--v-runtime-surface-opacity));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-block-end: 0;
  border-start-start-radius: var(--v-radius-lg);
  border-start-end-radius: var(--v-radius-lg);
}

.va-data-page__filters {
  flex: 0 0 auto;
  min-inline-size: 0;
  margin-block-end: var(--v-space-4);
}

.va-data-page__refresh {
  position: absolute;
  z-index: var(--v-z-sticky);
  inset-block-start: 0;
  inset-inline: 0;
}

.va-data-page__notice {
  margin-block-end: var(--v-space-3);
}

.va-data-page__state {
  min-block-size: var(--v-state-view-min-height);
  padding: 0;
}

.va-data-page__table-region {
  position: relative;
  min-inline-size: 0;
}

.va-data-page--has-toolbar .va-data-page__table-region > .va-data-table .v-table {
  border-start-start-radius: 0;
  border-start-end-radius: 0;
}

.va-data-page__table-region > .va-data-table .v-table {
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}

.va-data-page--fill {
  display: flex;
  flex-direction: column;
  block-size: 100%;
  min-block-size: 0;
  overflow: hidden;
}

.va-data-page--fill .va-data-page__table-region {
  flex: 1 1 auto;
  min-block-size: 0;
  overflow: hidden;
}

.va-data-page--fill .va-data-page__table-region > .va-data-table,
.va-data-page--fill .va-data-page__table-region > .va-data-table > .v-table,
.va-data-page--fill .va-data-page__state {
  block-size: 100%;
  min-block-size: 0;
}

.va-data-page--fill .va-data-page__state {
  display: grid;
  place-items: center;
}

.va-data-page--fill > .va-pager {
  flex: 0 0 auto;
}
</style>
