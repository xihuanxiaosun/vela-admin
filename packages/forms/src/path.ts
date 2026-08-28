export type FormPath = string | readonly (string | number)[]

function pathSegments(path: FormPath): readonly (string | number)[] {
  if (typeof path !== 'string') return path
  return path
    .replaceAll('[', '.')
    .replaceAll(']', '')
    .split('.')
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment))
}

export function getFormValue(source: unknown, path: FormPath): unknown {
  let current = source
  for (const segment of pathSegments(path)) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string | number, unknown>)[segment]
  }
  return current
}

export function setFormValue<TValue>(source: TValue, path: FormPath, value: unknown): TValue {
  const segments = pathSegments(path)
  if (segments.length === 0) return value as TValue
  const root = structuredClone(source)
  let current = root as Record<string | number, unknown>

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value
      return
    }
    const next = current[segment]
    if (next === null || typeof next !== 'object') {
      current[segment] = typeof segments[index + 1] === 'number' ? [] : {}
    }
    current = current[segment] as Record<string | number, unknown>
  })

  return root
}

export function isFormValueEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime()
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => isFormValueEqual(value, right[index]))
    )
  }
  if (
    left !== null &&
    right !== null &&
    typeof left === 'object' &&
    typeof right === 'object' &&
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const leftKeys = Object.keys(leftRecord)
    const rightKeys = Object.keys(rightRecord)
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.hasOwn(rightRecord, key) && isFormValueEqual(leftRecord[key], rightRecord[key]),
      )
    )
  }
  return false
}
