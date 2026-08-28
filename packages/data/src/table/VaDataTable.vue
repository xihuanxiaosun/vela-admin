<script setup lang="ts" generic="TItem extends Record<string, unknown>">
import { computed, onBeforeUnmount, ref, useAttrs, useSlots, watch } from 'vue'
import { VDataTableServer, VIcon } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaOverflowText } from '@vela-admin/ui'

import {
  isColumnResizable,
  resolveColumnResizeBounds,
  resolveFillColumn,
  resolveTableHeaders,
} from './layout'
import type { ColumnResizeEvent, DataColumn, TableLayoutOptions } from './types'
import VaTableCell from './VaTableCell.vue'
import { useTableOverflow } from './use-table-overflow'

const props = withDefaults(
  defineProps<{
    columns: readonly DataColumn<TItem>[]
    items: readonly TItem[]
    total?: number
    loading?: boolean | string
    height?: string | number
    rowKey?: string | ((item: TItem) => unknown)
    layout?: TableLayoutOptions
    fixedHeader?: boolean
    hover?: boolean
    density?: 'compact' | 'comfortable' | 'default' | undefined
  }>(),
  {
    loading: false,
    rowKey: 'id',
    layout: () => ({}),
    fixedHeader: true,
    hover: true,
    density: undefined,
  },
)

const emit = defineEmits<{
  'update:options': [value: unknown]
  'update:column-widths': [value: Readonly<Record<string, number>>]
  'column-resize': [value: ColumnResizeEvent]
  'column-resize-reset': [key: string]
}>()

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const slots = useSlots()
const locale = useVelaLocale()
const root = ref<HTMLElement | null>(null)
const tableBindings = computed<Record<string, unknown>>(() =>
  props.density === undefined ? attrs : { ...attrs, density: props.density },
)
const localWidths = ref<Record<string, number>>({ ...props.layout.columnWidths })
const resizingColumn = ref<string>()
let stopActiveResize: (() => void) | undefined
const effectiveColumnWidths = computed(() => {
  return localWidths.value
})
const effectiveLayout = computed<TableLayoutOptions>(() => ({
  ...props.layout,
  columnWidths: effectiveColumnWidths.value,
}))
const { hasOverflow, canScrollStart, canScrollEnd } = useTableOverflow(root, {
  ...(props.layout.overflowTolerance === undefined
    ? {}
    : { tolerance: props.layout.overflowTolerance }),
  watch: [() => props.columns, () => props.items, () => props.height],
})
const headers = computed(() =>
  resolveTableHeaders(
    props.columns,
    { hasHorizontalOverflow: hasOverflow.value, presentation: 'table' },
    effectiveLayout.value,
  ),
)
const fillColumn = computed(() => resolveFillColumn(props.columns, effectiveLayout.value.mode))
const visibleColumns = computed(() => props.columns.filter((column) => column.visible !== false))
const forwardedSlotNames = computed(() =>
  Object.keys(slots).filter(
    (slotName) => !visibleColumns.value.some((column) => slotName === `header.${column.key}`),
  ),
)
const automaticOverflowColumns = computed(() =>
  props.columns.filter(
    (column) =>
      column.visible !== false &&
      !column.presentation &&
      (column.overflow ?? (column.key === fillColumn.value ? 'ellipsis' : 'clip')) === 'ellipsis' &&
      !slots[`item.${column.key}`],
  ),
)
const presentedColumns = computed(() =>
  visibleColumns.value.filter((column) => column.presentation && !slots[`item.${column.key}`]),
)

function canResize(column: DataColumn<TItem>): boolean {
  return isColumnResizable(column, effectiveLayout.value)
}

function resizeBounds(column: DataColumn<TItem>): { readonly min: number; readonly max: number } {
  return resolveColumnResizeBounds(column, effectiveLayout.value)
}

function resizeValue(column: DataColumn<TItem>): number {
  const explicitWidth = effectiveColumnWidths.value[column.key]
  if (explicitWidth !== undefined) return normalizeWidth(column, explicitWidth)

  const header = headers.value.find((candidate) => candidate.key === column.key)
  const resolvedWidth =
    typeof header?.width === 'number'
      ? header.width
      : typeof header?.minWidth === 'number'
        ? header.minWidth
        : resizeBounds(column).min
  return normalizeWidth(column, resolvedWidth)
}

function normalizeWidth(column: DataColumn<TItem>, width: number): number {
  const bounds = resizeBounds(column)
  return Math.round(Math.min(bounds.max, Math.max(bounds.min, width)))
}

function previewWidth(column: DataColumn<TItem>, width: number): number {
  const normalized = normalizeWidth(column, width)
  localWidths.value = { ...localWidths.value, [column.key]: normalized }
  return normalized
}

function commitWidth(column: DataColumn<TItem>, width: number): void {
  const normalized = previewWidth(column, width)
  emit('update:column-widths', effectiveColumnWidths.value)
  emit('column-resize', { key: column.key, width: normalized })
}

function resetWidth(column: DataColumn<TItem>): void {
  const widths = { ...localWidths.value }
  delete widths[column.key]
  localWidths.value = widths
  emit('update:column-widths', effectiveColumnWidths.value)
  emit('column-resize-reset', column.key)
}

function startResize(event: PointerEvent, column: DataColumn<TItem>): void {
  if (event.button !== 0 || !canResize(column)) return
  event.preventDefault()
  event.stopPropagation()
  stopActiveResize?.()

  const handle = event.currentTarget as HTMLElement
  const header = handle.closest<HTMLElement>('th')
  if (!header) return
  const startX = event.clientX
  const startWidth = header.getBoundingClientRect().width
  const rtl = getComputedStyle(header).direction === 'rtl'
  const documentTarget = handle.ownerDocument
  const previousCursor = root.value?.style.cursor
  const previousSelection = root.value?.style.userSelect
  resizingColumn.value = column.key
  if (root.value) {
    root.value.style.cursor = 'col-resize'
    root.value.style.userSelect = 'none'
  }

  const onMove = (moveEvent: PointerEvent): void => {
    const physicalDelta = moveEvent.clientX - startX
    previewWidth(column, startWidth + (rtl ? -physicalDelta : physicalDelta))
  }
  const cleanup = (): void => {
    documentTarget.removeEventListener('pointermove', onMove)
    documentTarget.removeEventListener('pointerup', onUp)
    documentTarget.removeEventListener('pointercancel', onCancel)
    if (root.value) {
      root.value.style.cursor = previousCursor ?? ''
      root.value.style.userSelect = previousSelection ?? ''
    }
    resizingColumn.value = undefined
    stopActiveResize = undefined
  }
  const onUp = (): void => {
    const width = effectiveColumnWidths.value[column.key] ?? startWidth
    cleanup()
    commitWidth(column, width)
  }
  const onCancel = (): void => cleanup()
  documentTarget.addEventListener('pointermove', onMove)
  documentTarget.addEventListener('pointerup', onUp, { once: true })
  documentTarget.addEventListener('pointercancel', onCancel, { once: true })
  stopActiveResize = cleanup
}

function resizeWithKeyboard(
  event: KeyboardEvent,
  column: DataColumn<TItem>,
  currentTarget: EventTarget | null,
): void {
  if (!canResize(column)) return
  const bounds = resizeBounds(column)
  const header = (currentTarget as HTMLElement | null)?.closest<HTMLElement>('th')
  const current =
    effectiveColumnWidths.value[column.key] ??
    (column.sizing?.mode === 'fixed'
      ? column.sizing.size
      : (header?.getBoundingClientRect().width ?? bounds.min))
  const step = Math.max(1, effectiveLayout.value.resizeStep ?? 16)
  const rtl = header ? getComputedStyle(header).direction === 'rtl' : false
  let next: number | undefined

  if (event.key === 'Home') next = bounds.min
  if (event.key === 'End') next = bounds.max
  if (event.key === 'ArrowLeft') next = current + (rtl ? step : -step)
  if (event.key === 'ArrowRight') next = current + (rtl ? -step : step)
  if (next === undefined) return
  event.preventDefault()
  event.stopPropagation()
  commitWidth(column, next)
}

onBeforeUnmount(() => stopActiveResize?.())

watch(
  () => props.layout.columnWidths,
  (widths) => {
    localWidths.value = { ...widths }
  },
)

function displayValue(value: unknown): string | number {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean' || typeof value === 'bigint') return `${value}`
  if (value instanceof Date) return value.toISOString()
  return ''
}
</script>

<template>
  <div
    ref="root"
    class="va-data-table"
    :class="{
      'va-data-table--overflowing': hasOverflow,
      'va-data-table--can-scroll-start': canScrollStart,
      'va-data-table--can-scroll-end': canScrollEnd,
      'va-data-table--resizing': resizingColumn,
      'va-data-table--density-compact': density === 'compact',
      'va-data-table--density-comfortable': density === 'comfortable',
      'va-data-table--density-default': density === 'default',
    }"
  >
    <VDataTableServer
      v-bind="tableBindings"
      :fixed-header="fixedHeader"
      :headers="headers"
      :height="height"
      :hover="hover"
      :item-value="rowKey"
      :items="items"
      :items-length="total ?? items.length"
      :loading="loading"
      hide-default-footer
      @update:options="emit('update:options', $event)"
    >
      <template
        v-for="column in visibleColumns"
        :key="`header-${column.key}`"
        #[`header.${column.key}`]="slotProps"
      >
        <div class="va-data-table__header-content">
          <slot :name="`header.${column.key}`" v-bind="slotProps">
            <span>{{ column.title }}</span>
          </slot>
          <VIcon
            v-if="slotProps.column.sortable"
            class="v-data-table-header__sort-icon"
            :icon="slotProps.getSortIcon(slotProps.column)"
          />
          <span
            v-if="canResize(column)"
            :aria-label="locale.t('data.columns.resize', { label: column.title })"
            aria-orientation="vertical"
            :aria-valuemax="resizeBounds(column).max"
            :aria-valuemin="resizeBounds(column).min"
            :aria-valuenow="resizeValue(column)"
            class="va-data-table__resize-handle"
            :class="{ 'va-data-table__resize-handle--active': resizingColumn === column.key }"
            role="separator"
            tabindex="0"
            @dblclick.stop="resetWidth(column)"
            @keydown="resizeWithKeyboard($event, column, $event.currentTarget)"
            @pointerdown="startResize($event, column)"
          />
        </div>
      </template>
      <template
        v-for="column in presentedColumns"
        :key="`presentation-${column.key}`"
        #[`item.${column.key}`]="slotProps"
      >
        <VaTableCell :presentation="column.presentation!" :value="slotProps.value" />
      </template>
      <template
        v-for="column in automaticOverflowColumns"
        :key="column.key"
        #[`item.${column.key}`]="slotProps"
      >
        <VaOverflowText :text="displayValue(slotProps.value)" />
      </template>
      <template v-for="slotName in forwardedSlotNames" :key="slotName" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps ?? {}" />
      </template>
    </VDataTableServer>
  </div>
</template>

<style>
.va-data-table {
  --va-table-row-height: var(--v-table-row-height-comfortable);

  position: relative;
  min-inline-size: 0;
}

html[data-vela-density='compact'] .va-data-table {
  --va-table-row-height: var(--v-table-row-height-compact);
}

html[data-vela-density='default'] .va-data-table {
  --va-table-row-height: var(--v-table-row-height-default);
}

html .va-data-table.va-data-table--density-compact {
  --va-table-row-height: var(--v-table-row-height-compact);
}

html .va-data-table.va-data-table--density-comfortable {
  --va-table-row-height: var(--v-table-row-height-comfortable);
}

html .va-data-table.va-data-table--density-default {
  --va-table-row-height: var(--v-table-row-height-default);
}

.va-data-table .v-table {
  overflow: hidden;
  background: rgba(var(--v-theme-surface), var(--v-runtime-surface-opacity));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-table-shell-shadow);
}

.va-data-table .v-table__wrapper {
  background: rgb(var(--v-theme-surface));
  overscroll-behavior-inline: contain;
  scrollbar-gutter: stable;
}

.va-data-table .va-data-table__header {
  position: relative;
  block-size: var(--v-table-header-height);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-table-header-font-size);
  font-weight: var(--v-font-weight-semibold);
  letter-spacing: 0.01em;
  background:
    linear-gradient(
      rgba(var(--v-theme-primary), var(--v-table-header-tint-opacity)),
      rgba(var(--v-theme-primary), var(--v-table-header-tint-opacity))
    ),
    rgb(var(--v-theme-surface));
  border-block-end-color: rgba(var(--v-theme-primary), var(--v-table-header-border-opacity));
}

.va-data-table__header-content {
  display: inline-flex;
  gap: var(--v-space-2);
  align-items: center;
  min-inline-size: 0;
}

.va-data-table__resize-handle {
  position: absolute;
  z-index: var(--v-table-sticky-layer);
  inset-block: var(--v-space-2);
  inset-inline-end: calc(var(--v-table-resize-handle-width) / -2);
  inline-size: var(--v-table-resize-handle-width);
  cursor: col-resize;
  touch-action: none;
}

.va-data-table__resize-handle::after {
  position: absolute;
  inset-block: var(--v-space-2);
  inset-inline-start: 50%;
  inline-size: 1px;
  content: '';
  background: rgba(var(--v-theme-primary), 0);
  transition: background-color var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-data-table__resize-handle:hover::after,
.va-data-table__resize-handle:focus-visible::after,
.va-data-table__resize-handle--active::after {
  background: rgba(var(--v-theme-primary), var(--v-high-emphasis-opacity));
}

.va-data-table__resize-handle:focus-visible {
  outline: var(--v-focus-outline-width) solid rgba(var(--v-theme-primary), var(--v-focus-opacity));
  outline-offset: -2px;
}

.va-data-table .va-data-table__cell {
  min-inline-size: 0;
  block-size: var(--va-table-row-height);
  font-size: var(--v-table-font-size);
  border-block-end-color: rgb(var(--v-theme-outline-variant));
  transition:
    color var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    background-color var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-data-table
  .va-data-table__cell:not(.v-data-table-column--fixed-start):not(.v-data-table-column--fixed-end) {
  position: relative;
}

.va-data-table .va-data-table__cell.v-data-table-column--fixed-start,
.va-data-table .va-data-table__cell.v-data-table-column--fixed-end {
  position: sticky;
  z-index: var(--v-table-sticky-layer);
}

.va-data-table .va-data-table__cell--identity::before {
  position: absolute;
  inset-block: var(--v-space-2);
  inset-inline-start: 0;
  inline-size: var(--v-table-row-accent-width);
  content: '';
  background: rgb(var(--v-theme-primary));
  border-radius: var(--v-radius-pill);
  opacity: 0;
  transform: scaleY(0.55);
  transition:
    opacity var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    transform var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-data-table tbody > tr:hover > .va-data-table__cell--identity::before,
.va-data-table tbody > tr:focus-within > .va-data-table__cell--identity::before,
.va-data-table
  tbody
  > tr:has(input[type='checkbox']:checked)
  > .va-data-table__cell--identity::before {
  opacity: 0.72;
  transform: scaleY(1);
}

.va-data-table tbody > tr:hover > .va-data-table__cell {
  background: rgba(var(--v-theme-primary), var(--v-table-row-hover-opacity));
}

.va-data-table tbody > tr:focus-within > .va-data-table__cell {
  background: rgba(var(--v-theme-primary), var(--v-table-row-focus-opacity));
}

.va-data-table tbody > tr:has(input[type='checkbox']:checked) > .va-data-table__cell {
  background: rgba(var(--v-theme-primary), var(--v-table-row-selected-opacity));
}

.va-data-table tbody > tr:last-child > .va-data-table__cell {
  border-block-end: 0;
}

.va-data-table .va-data-table__cell--ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-data-table .va-data-table__cell--wrap {
  overflow-wrap: anywhere;
  white-space: normal;
}

.va-data-table .va-data-table__cell--clip {
  overflow: hidden;
  white-space: nowrap;
}

.va-data-table .va-data-table__cell--tabular {
  font-variant-numeric: tabular-nums;
}

.va-data-table--overflowing .v-data-table-column--fixed-end {
  background: rgb(var(--v-theme-surface));
  border-inline-start-color: rgba(var(--v-border-color), var(--v-table-pinned-border-opacity));
}

.va-data-table--overflowing tbody > tr:hover > .v-data-table-column--fixed-end {
  background:
    linear-gradient(
      rgba(var(--v-theme-primary), var(--v-table-row-hover-opacity)),
      rgba(var(--v-theme-primary), var(--v-table-row-hover-opacity))
    ),
    rgb(var(--v-theme-surface));
}

.va-data-table--overflowing
  tbody
  > tr:has(input[type='checkbox']:checked)
  > .v-data-table-column--fixed-end {
  background:
    linear-gradient(
      rgba(var(--v-theme-primary), var(--v-table-row-selected-opacity)),
      rgba(var(--v-theme-primary), var(--v-table-row-selected-opacity))
    ),
    rgb(var(--v-theme-surface));
}

.va-data-table--can-scroll-end .v-data-table-column--first-fixed-end::before {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 1px;
  content: '';
  background: rgba(var(--v-border-color), var(--v-table-pinned-border-opacity));
  pointer-events: none;
  box-shadow: var(--v-table-pinned-shadow);
}
</style>
