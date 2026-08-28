export type ErrorKind =
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'server'
  | 'unknown'

export type FieldErrors<TField extends string = string> = Readonly<
  Partial<Record<TField, readonly string[]>>
>

export interface NormalizedError<TField extends string = string> {
  readonly kind: ErrorKind
  readonly message: string
  readonly retryable: boolean
  readonly code?: string
  readonly status?: number
  readonly details?: unknown
  readonly fieldErrors?: FieldErrors<TField>
  readonly cause?: unknown
}

export function createNormalizedError<TField extends string = string>(
  error: NormalizedError<TField>,
): NormalizedError<TField> {
  return Object.freeze({ ...error })
}

export function isCancelledError(error: NormalizedError): boolean {
  return error.kind === 'cancelled'
}
