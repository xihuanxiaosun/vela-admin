import type { DataTableHeader } from 'vuetify'
import { velaTableMetrics, velaTableSemanticMetrics } from '@vela-admin/theme'

import type {
  ColumnAlignment,
  ColumnDataType,
  ColumnOverflow,
  ColumnPresentation,
  ColumnRole,
  ColumnSizing,
  DataColumn,
  TableLayoutContext,
  TableLayoutOptions,
} from './types'

export const DEFAULT_TABLE_LAYOUT = Object.freeze({
  ...velaTableMetrics,
  autoPinActions: true,
})

export const DEFAULT_SEMANTIC_COLUMN_SIZING = velaTableSemanticMetrics

const startAlignedTypes = new Set<ColumnDataType>(['text', 'date', 'datetime', 'media', 'progress'])
const endAlignedTypes = new Set<ColumnDataType>(['number', 'currency', 'trend'])

function presentationDataType(presentation: ColumnPresentation | undefined): ColumnDataType {
  if (!presentation || presentation.kind === 'identity') return 'text'
  return presentation.kind
}

function resolvedColumnRole<TItem>(column: DataColumn<TItem>): ColumnRole {
  if (column.role) return column.role
  if (column.presentation?.kind === 'identity') return 'identity'
  if (column.presentation?.kind === 'status' || column.presentation?.kind === 'boolean') {
    return 'status'
  }
  return 'data'
}

function resolvedColumnDataType<TItem>(column: DataColumn<TItem>): ColumnDataType {
  return column.dataType ?? presentationDataType(column.presentation)
}

export function inferColumnAlignment(
  role: ColumnRole = 'data',
  dataType: ColumnDataType = 'text',
): ColumnAlignment {
  if (role === 'selection' || role === 'actions' || role === 'status') return 'center'
  if (endAlignedTypes.has(dataType)) return 'end'
  if (startAlignedTypes.has(dataType)) return 'start'
  return 'center'
}

export function isMeaningfulOverflow(
  scrollWidth: number,
  clientWidth: number,
  tolerance: number = DEFAULT_TABLE_LAYOUT.overflowTolerance,
): boolean {
  return scrollWidth - clientWidth > tolerance
}

export function chooseFillColumn<TItem>(columns: readonly DataColumn<TItem>[]): string | undefined {
  const visible = columns.filter((column) => column.visible !== false)
  const declared = visible.find((column) => column.sizing?.mode === 'fill')
  if (declared) return declared.key

  const candidates = visible.filter(
    (column) =>
      (resolvedColumnRole(column) === 'identity' || resolvedColumnRole(column) === 'data') &&
      resolvedColumnDataType(column) === 'text' &&
      column.sizing?.mode !== 'fixed',
  )

  return (
    candidates.find((column) => resolvedColumnRole(column) === 'identity')?.key ??
    candidates[0]?.key
  )
}

export function resolveFillColumn<TItem>(
  columns: readonly DataColumn<TItem>[],
  mode: TableLayoutOptions['mode'] = 'adaptive',
): string | undefined {
  const declared = columns.find(
    (column) => column.visible !== false && column.sizing?.mode === 'fill',
  )?.key
  return declared ?? (mode === 'adaptive' ? chooseFillColumn(columns) : undefined)
}

function classesFor(
  column: DataColumn,
  overflow: ColumnOverflow,
  role: ColumnRole,
  dataType: ColumnDataType,
): string[] {
  return [
    'va-data-table__cell',
    `va-data-table__cell--${overflow}`,
    `va-data-table__cell--${role}`,
    ...(dataType === 'number' || dataType === 'currency' || dataType === 'trend'
      ? ['va-data-table__cell--tabular']
      : []),
  ]
}

function resolveSizing<TItem>(
  column: DataColumn<TItem>,
  isFillColumn: boolean,
  options: Required<TableLayoutOptions>,
): ColumnSizing {
  const overriddenWidth = options.columnWidths[column.key]
  if (overriddenWidth !== undefined && Number.isFinite(overriddenWidth)) {
    const bounds = resolveColumnResizeBounds(column, options)
    return {
      mode: 'fixed',
      size: Math.min(bounds.max, Math.max(bounds.min, overriddenWidth)),
    }
  }
  if (column.sizing?.mode === 'fill' && !isFillColumn) {
    return {
      mode: 'content',
      ...(column.sizing.min === undefined ? {} : { min: column.sizing.min }),
      ...(column.sizing.max === undefined ? {} : { max: column.sizing.max }),
    }
  }
  if (column.sizing) return column.sizing
  const role = resolvedColumnRole(column)
  const dataType = resolvedColumnDataType(column)
  if (role === 'selection') return { mode: 'fixed', size: 56 }
  if (role === 'actions') return { mode: 'fixed', size: options.actionWidth }

  const semanticSizing =
    role === 'identity'
      ? DEFAULT_SEMANTIC_COLUMN_SIZING.identity
      : role === 'status'
        ? DEFAULT_SEMANTIC_COLUMN_SIZING.status
        : dataType !== 'text'
          ? DEFAULT_SEMANTIC_COLUMN_SIZING[dataType]
          : undefined
  const min = semanticSizing?.min ?? options.defaultMinWidth
  const max = semanticSizing?.max ?? options.defaultMaxWidth
  return isFillColumn ? { mode: 'fill', min, max } : { mode: 'content', min, max }
}

function normalizeOptions(options: TableLayoutOptions): Required<TableLayoutOptions> {
  return {
    mode: options.mode ?? 'adaptive',
    defaultMinWidth: options.defaultMinWidth ?? DEFAULT_TABLE_LAYOUT.defaultMinWidth,
    defaultMaxWidth: options.defaultMaxWidth ?? DEFAULT_TABLE_LAYOUT.defaultMaxWidth,
    actionWidth: options.actionWidth ?? DEFAULT_TABLE_LAYOUT.actionWidth,
    overflowTolerance: options.overflowTolerance ?? DEFAULT_TABLE_LAYOUT.overflowTolerance,
    autoPinActions: options.autoPinActions ?? DEFAULT_TABLE_LAYOUT.autoPinActions,
    resizable: options.resizable ?? true,
    resizeMinWidth: options.resizeMinWidth ?? DEFAULT_TABLE_LAYOUT.resizeMinWidth,
    resizeMaxWidth: options.resizeMaxWidth ?? DEFAULT_TABLE_LAYOUT.resizeMaxWidth,
    resizeStep: options.resizeStep ?? DEFAULT_TABLE_LAYOUT.resizeStep,
    columnWidths: options.columnWidths ?? {},
  }
}

export function resolveColumnResizeBounds<TItem>(
  column: DataColumn<TItem>,
  layoutOptions: TableLayoutOptions = {},
): { readonly min: number; readonly max: number } {
  const minimum = Math.max(
    1,
    column.resize?.min ?? layoutOptions.resizeMinWidth ?? DEFAULT_TABLE_LAYOUT.resizeMinWidth,
  )
  const maximum = Math.max(
    minimum,
    column.resize?.max ?? layoutOptions.resizeMaxWidth ?? DEFAULT_TABLE_LAYOUT.resizeMaxWidth,
  )
  return { min: minimum, max: maximum }
}

export function isColumnResizable<TItem>(
  column: DataColumn<TItem>,
  layoutOptions: TableLayoutOptions = {},
): boolean {
  if (column.resizable !== undefined) return column.resizable
  if (layoutOptions.resizable === false) return false
  return column.role !== 'selection' && column.role !== 'actions'
}

function resolveFixed<TItem>(
  column: DataColumn<TItem>,
  sizing: ColumnSizing,
  context: TableLayoutContext,
  options: Required<TableLayoutOptions>,
): boolean | 'start' | 'end' | undefined {
  const pin = column.pin ?? (column.role === 'actions' ? 'auto-end' : 'none')
  if (context.presentation !== 'table' || pin === 'none') return undefined
  if (pin === 'start' || pin === 'end') return pin

  const boundedWidth = sizing.mode === 'fixed' || column.role === 'actions'
  // Keep Vuetify's header/body column model stable across resize observations. Dynamically adding
  // `fixed` after mount can pin the header before body cells have reconciled. A bounded end column
  // is harmless when the table fits; overflow-only separators and shadows remain CSS-driven.
  return options.autoPinActions && boundedWidth ? 'end' : undefined
}

export function resolveTableHeaders<TItem>(
  columns: readonly DataColumn<TItem>[],
  context: TableLayoutContext,
  layoutOptions: TableLayoutOptions = {},
): DataTableHeader<TItem>[] {
  const options = normalizeOptions(layoutOptions)
  const fillColumn = resolveFillColumn(columns, options.mode)

  return columns
    .filter((column) => column.visible !== false)
    .map((column): DataTableHeader<TItem> => {
      const sizing = resolveSizing(column, column.key === fillColumn, options)
      const overflow = column.overflow ?? (sizing.mode === 'fill' ? 'ellipsis' : 'clip')
      const role = resolvedColumnRole(column)
      const dataType = resolvedColumnDataType(column)
      const align = column.align ?? inferColumnAlignment(role, dataType)
      const cellClasses = classesFor(column as DataColumn, overflow, role, dataType)
      const fixed = resolveFixed(column, sizing, context, options)
      const base: DataTableHeader<TItem> = {
        key: column.key,
        title: column.title,
        value: (column.value ?? column.key) as DataTableHeader<TItem>['value'],
        align,
        sortable: column.sortable ?? false,
        ...(fixed === undefined ? {} : { fixed }),
        nowrap: column.nowrap ?? overflow !== 'wrap',
        headerProps: {
          class: [
            'va-data-table__header',
            `va-data-table__header--${sizing.mode}`,
            ...(column.headerAlign ? [`text-${column.headerAlign}`] : []),
          ],
        },
        cellProps: { class: cellClasses },
      }

      if (sizing.mode === 'fixed') {
        return { ...base, width: sizing.size, minWidth: sizing.size, maxWidth: sizing.size }
      }

      return {
        ...base,
        ...(sizing.mode === 'fill' ? { width: sizing.max ?? options.defaultMaxWidth } : {}),
        minWidth: sizing.min ?? options.defaultMinWidth,
        maxWidth: sizing.max ?? options.defaultMaxWidth,
      }
    })
}
