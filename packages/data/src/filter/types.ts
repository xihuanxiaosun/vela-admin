export type FilterOptionValue = string | number | boolean

export interface FilterOption {
  readonly title: string
  readonly value: FilterOptionValue
}

interface BaseFilterField {
  readonly key: string
  readonly label: string
  readonly placeholder?: string
  readonly pinned?: boolean
  readonly disabled?: boolean
  readonly format?: (value: FilterValues[string]) => string
}

export interface TextFilterField extends BaseFilterField {
  readonly kind: 'text'
}

export interface NumberFilterField extends BaseFilterField {
  readonly kind: 'number'
  readonly min?: number
  readonly max?: number
}

export interface SelectFilterField extends BaseFilterField {
  readonly kind: 'select'
  readonly options: readonly FilterOption[]
  readonly multiple?: boolean
}

export interface BooleanFilterField extends BaseFilterField {
  readonly kind: 'boolean'
  readonly trueLabel?: string
  readonly falseLabel?: string
}

export interface DateFilterField extends BaseFilterField {
  readonly kind: 'date'
}

export type FilterField =
  TextFilterField | NumberFilterField | SelectFilterField | BooleanFilterField | DateFilterField

export type FilterValues = Readonly<
  Record<string, string | number | boolean | readonly FilterOptionValue[] | null | undefined>
>
