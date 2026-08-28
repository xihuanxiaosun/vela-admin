import type {
  QueryFilters,
  QueryPrimitive,
  QueryValue,
  SortDescriptor,
} from '@vela-admin/contracts'

import type { EncodedQuery, EncodedQueryValue } from './pagination'

export interface QuerySerializerOptions {
  readonly omitNull?: boolean
  readonly omitEmptyString?: boolean
  readonly array?: 'repeat' | 'comma'
  readonly boolean?: 'boolean' | 'number' | 'string'
  readonly sortKey?: string
  readonly sortSeparator?: string
  readonly keyMap?: Readonly<Record<string, string>>
  readonly transform?: Readonly<
    Record<string, (value: QueryValue) => EncodedQueryValue | undefined>
  >
}

function encodePrimitive(
  value: QueryPrimitive,
  booleanMode: NonNullable<QuerySerializerOptions['boolean']>,
): string | number | boolean {
  if (typeof value !== 'boolean') return value ?? ''
  if (booleanMode === 'number') return value ? 1 : 0
  if (booleanMode === 'string') return value ? 'true' : 'false'
  return value
}

function isQueryArray(value: QueryValue): value is readonly QueryPrimitive[] {
  return Array.isArray(value)
}

export function serializeFilters(
  filters: QueryFilters,
  options: QuerySerializerOptions = {},
): EncodedQuery {
  const result: Record<string, EncodedQueryValue | undefined> = {}
  const booleanMode = options.boolean ?? 'boolean'

  for (const [sourceKey, value] of Object.entries(filters)) {
    if (value === undefined || (value === null && options.omitNull)) continue
    if (value === '' && options.omitEmptyString) continue

    const targetKey = options.keyMap?.[sourceKey] ?? sourceKey
    const transform = options.transform?.[sourceKey]
    if (transform) {
      result[targetKey] = transform(value)
      continue
    }

    if (isQueryArray(value)) {
      const encoded = value.map((item) => encodePrimitive(item, booleanMode))
      result[targetKey] = options.array === 'comma' ? encoded.join(',') : encoded
      continue
    }

    result[targetKey] = encodePrimitive(value, booleanMode)
  }

  return result
}

export function serializeSort(
  sort: readonly SortDescriptor[],
  options: Pick<QuerySerializerOptions, 'sortKey' | 'sortSeparator'> = {},
): EncodedQuery {
  if (sort.length === 0) return {}
  const separator = options.sortSeparator ?? ':'
  return {
    [options.sortKey ?? 'sort']: sort.map(({ key, direction }) => `${key}${separator}${direction}`),
  }
}
