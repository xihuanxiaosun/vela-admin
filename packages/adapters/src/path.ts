export type ObjectPath = string | readonly (string | number)[]
export type ValueSelector<TSource, TValue> = ObjectPath | ((source: TSource) => TValue)

function normalizePath(path: ObjectPath): readonly (string | number)[] {
  if (typeof path !== 'string') return path
  return path
    .replaceAll('[', '.')
    .replaceAll(']', '')
    .split('.')
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment))
}

export function readPath(source: unknown, path: ObjectPath): unknown {
  let current = source

  for (const segment of normalizePath(path)) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string | number, unknown>)[segment]
  }

  return current
}

export function selectValue<TSource, TValue>(
  source: TSource,
  selector: ValueSelector<TSource, TValue>,
): TValue {
  return (typeof selector === 'function' ? selector(source) : readPath(source, selector)) as TValue
}
