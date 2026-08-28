import type { FilterField, FilterValues } from './types'

export function emptyFilterValues(fields: readonly FilterField[]): FilterValues {
  return Object.fromEntries(fields.map((field) => [field.key, undefined]))
}

export function compactFilterValues(values: FilterValues): FilterValues {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false
      return !Array.isArray(value) || value.length > 0
    }),
  )
}

export function countActiveFilters(values: FilterValues): number {
  return Object.keys(compactFilterValues(values)).length
}
