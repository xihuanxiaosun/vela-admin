import type { SemanticTone } from '@vela-admin/ui'

export type ColumnRole = 'identity' | 'data' | 'status' | 'selection' | 'actions'
export type ColumnDataType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'status'
  | 'media'
  | 'progress'
  | 'trend'
export type ColumnAlignment = 'start' | 'center' | 'end'
export type ColumnPinning = 'none' | 'start' | 'end' | 'auto-end'
export type ColumnOverflow = 'ellipsis' | 'wrap' | 'clip'

/** A backend-neutral identity value assembled by a host-side column accessor. */
export interface IdentityCellValue {
  readonly primary: unknown
  readonly secondary?: unknown
  readonly image?: string
  readonly icon?: string
}

export interface IdentityColumnPresentation {
  readonly kind: 'identity'
  readonly avatarSize?: string | number
}

/** A backend-neutral image/title pair assembled by a host-side column accessor. */
export interface MediaCellValue {
  readonly primary: unknown
  readonly secondary?: unknown
  readonly image?: string
  readonly alt?: string
  readonly icon?: string
}

export interface MediaColumnPresentation {
  readonly kind: 'media'
  readonly fit?: 'cover' | 'contain'
  readonly width?: string | number
  readonly height?: string | number
  readonly fallbackIcon?: string
}

export interface NumberColumnPresentation {
  readonly kind: 'number'
  readonly locale?: string | readonly string[]
  readonly notation?: 'standard' | 'compact'
  readonly minimumFractionDigits?: number
  readonly maximumFractionDigits?: number
  readonly prefix?: string
  readonly suffix?: string
  readonly icon?: string
  readonly tone?: SemanticTone
}

export interface CurrencyColumnPresentation {
  readonly kind: 'currency'
  readonly currency: string
  readonly locale?: string | readonly string[]
  readonly currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  readonly notation?: 'standard' | 'compact'
  readonly minimumFractionDigits?: number
  readonly maximumFractionDigits?: number
  readonly icon?: string
  readonly tone?: SemanticTone
  readonly showCurrencyCode?: boolean
  readonly showSign?: boolean
  readonly toneBySign?: boolean
}

export interface TemporalColumnPresentation {
  readonly kind: 'date' | 'datetime'
  readonly locale?: string | readonly string[]
  readonly timeZone?: string
  readonly dateStyle?: 'full' | 'long' | 'medium' | 'short'
  readonly timeStyle?: 'full' | 'long' | 'medium' | 'short'
  readonly relative?: boolean
  readonly relativeTo?: string | number | Date
  readonly icon?: string
}

export interface StatusValuePresentation {
  readonly label?: string
  readonly tone?: SemanticTone
  readonly icon?: string
}

export interface StatusColumnPresentation {
  readonly kind: 'status'
  readonly values?: Readonly<Record<string, StatusValuePresentation>>
  readonly fallback?: StatusValuePresentation
  readonly dot?: boolean
}

export interface BooleanColumnPresentation {
  readonly kind: 'boolean'
  readonly trueValues?: readonly unknown[]
  readonly falseValues?: readonly unknown[]
  readonly trueState?: StatusValuePresentation
  readonly falseState?: StatusValuePresentation
  readonly fallback?: StatusValuePresentation
  readonly dot?: boolean
}

export interface ProgressCellValue {
  readonly value: number
  readonly max?: number
  readonly label?: unknown
  readonly secondary?: unknown
  readonly tone?: SemanticTone
}

export interface ProgressColumnPresentation {
  readonly kind: 'progress'
  readonly locale?: string | readonly string[]
  readonly min?: number
  readonly max?: number
  readonly tone?: SemanticTone
  readonly showValue?: boolean
  readonly maximumFractionDigits?: number
}

export interface TrendCellValue {
  readonly value: number
  readonly delta?: number
  readonly secondary?: unknown
}

export interface TrendColumnPresentation {
  readonly kind: 'trend'
  readonly locale?: string | readonly string[]
  readonly notation?: 'standard' | 'compact'
  readonly minimumFractionDigits?: number
  readonly maximumFractionDigits?: number
  /** When provided, the headline value uses `Intl.NumberFormat` currency semantics. */
  readonly currency?: string
  readonly currencyDisplay?: CurrencyColumnPresentation['currencyDisplay']
  readonly prefix?: string
  readonly suffix?: string
  /** Delta is interpreted as percentage points when this is `percent`. */
  readonly deltaStyle?: 'number' | 'percent'
  readonly higherIsBetter?: boolean
}

/** Explicit presentation wins over built-in plain text; a named cell slot still wins over both. */
export type ColumnPresentation =
  | IdentityColumnPresentation
  | MediaColumnPresentation
  | NumberColumnPresentation
  | CurrencyColumnPresentation
  | TemporalColumnPresentation
  | StatusColumnPresentation
  | BooleanColumnPresentation
  | ProgressColumnPresentation
  | TrendColumnPresentation

export interface ColumnResizeOptions {
  readonly min?: number
  readonly max?: number
}

export interface ColumnExportOptions<TItem = Record<string, unknown>> {
  /** Defaults to the visible column title. */
  readonly header?: string
  /** Overrides the rendered value without coupling export to a table slot. */
  readonly value?: (item: TItem, index: number) => unknown
  readonly format?: (value: unknown, item: TItem, index: number) => unknown
}

export type ColumnSizing =
  | { readonly mode: 'content'; readonly min?: number; readonly max?: number }
  | { readonly mode: 'fill'; readonly min?: number; readonly max?: number }
  | { readonly mode: 'fixed'; readonly size: number }

export interface DataColumn<TItem = Record<string, unknown>> {
  readonly key: string
  readonly title: string
  readonly value?: (keyof TItem & string) | ((item: TItem) => unknown)
  readonly role?: ColumnRole
  readonly dataType?: ColumnDataType
  readonly presentation?: ColumnPresentation
  readonly sizing?: ColumnSizing
  readonly pin?: ColumnPinning
  readonly overflow?: ColumnOverflow
  readonly align?: ColumnAlignment
  readonly headerAlign?: ColumnAlignment
  readonly priority?: number
  readonly visible?: boolean
  readonly sortable?: boolean
  readonly nowrap?: boolean
  readonly resizable?: boolean
  readonly resize?: ColumnResizeOptions
  /** False excludes the column. Structural action and selection columns are excluded by default. */
  readonly export?: false | ColumnExportOptions<TItem>
  /** Set to false for structural columns that users must not hide or reorder. */
  readonly configurable?: boolean
}

export type TableLayoutMode = 'adaptive' | 'content'
export type MobileTableStrategy = 'scroll'

export interface TableLayoutOptions {
  readonly mode?: TableLayoutMode
  readonly defaultMinWidth?: number
  readonly defaultMaxWidth?: number
  readonly actionWidth?: number
  readonly overflowTolerance?: number
  readonly autoPinActions?: boolean
  readonly resizable?: boolean
  readonly resizeMinWidth?: number
  readonly resizeMaxWidth?: number
  readonly resizeStep?: number
  readonly columnWidths?: Readonly<Record<string, number>>
}

export interface ColumnResizeEvent {
  readonly key: string
  readonly width: number
}

export interface TableLayoutContext {
  readonly hasHorizontalOverflow: boolean
  readonly presentation: 'table' | 'cards'
}
