import type { DataColumn } from '../table/types'

export type CsvFormulaPolicy = 'escape' | 'allow'

export interface CsvExportOptions<TItem extends Record<string, unknown>> {
  readonly columns: readonly DataColumn<TItem>[]
  readonly rows: readonly TItem[]
  readonly delimiter?: string
  readonly lineEnding?: '\n' | '\r\n'
  readonly includeHeader?: boolean
  readonly includeBom?: boolean
  /** Escapes spreadsheet formulas by default to protect exported operator data. */
  readonly formulaPolicy?: CsvFormulaPolicy
  readonly formatValue?: (value: unknown, item: TItem, column: DataColumn<TItem>) => unknown
}

function resolvePath(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (value === null || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[segment]
  }, source)
}

function resolveColumnValue<TItem extends Record<string, unknown>>(
  column: DataColumn<TItem>,
  item: TItem,
  index: number,
): unknown {
  if (column.export && column.export.value) return column.export.value(item, index)
  if (typeof column.value === 'function') return column.value(item)
  return resolvePath(item, column.value ?? column.key)
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

function protectFormula(value: string, policy: CsvFormulaPolicy): string {
  if (policy === 'allow') return value
  return /^[\t\r ]*[=+\-@]/u.test(value) ? `'${value}` : value
}

function encodeCell(value: unknown, delimiter: string, formulaPolicy: CsvFormulaPolicy): string {
  const text = protectFormula(stringifyValue(value), formulaPolicy)
  return text.includes(delimiter) || /["\r\n]/u.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text
}

/** Builds a browser- and backend-neutral CSV document; the host decides how it is downloaded. */
export function createCsvDocument<TItem extends Record<string, unknown>>(
  options: CsvExportOptions<TItem>,
): string {
  const delimiter = options.delimiter ?? ','
  if (!delimiter || /["\r\n]/u.test(delimiter)) {
    throw new TypeError('CSV delimiter must be a non-empty single-line string without quotes')
  }
  const lineEnding = options.lineEnding ?? '\r\n'
  const formulaPolicy = options.formulaPolicy ?? 'escape'
  const columns = options.columns.filter(
    (column) =>
      column.visible !== false &&
      column.export !== false &&
      column.role !== 'actions' &&
      column.role !== 'selection',
  )
  const lines: string[] = []

  if (options.includeHeader !== false) {
    lines.push(
      columns
        .map((column) => {
          const exportOptions = column.export === false ? undefined : column.export
          return encodeCell(exportOptions?.header ?? column.title, delimiter, 'allow')
        })
        .join(delimiter),
    )
  }

  for (const [index, item] of options.rows.entries()) {
    lines.push(
      columns
        .map((column) => {
          const exportOptions = column.export === false ? undefined : column.export
          const raw = resolveColumnValue(column, item, index)
          const value = exportOptions?.format
            ? exportOptions.format(raw, item, index)
            : options.formatValue
              ? options.formatValue(raw, item, column)
              : raw
          return encodeCell(value, delimiter, formulaPolicy)
        })
        .join(delimiter),
    )
  }

  return `${options.includeBom === false ? '' : '\uFEFF'}${lines.join(lineEnding)}`
}
