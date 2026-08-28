import type { Awaitable, FieldErrors, NormalizedError } from '@vela-admin/contracts'
import { useVelaLocale, type VelaLocaleController } from '@vela-admin/locale'

import { getFormValue } from './path'

export interface ValidationContext<TValues> {
  readonly values: TValues
  readonly signal: AbortSignal
}

export type ValidationRule<TValues = unknown> = (
  value: unknown,
  context: ValidationContext<TValues>,
) => Awaitable<string | readonly string[] | undefined>

export interface FormValidationSchema<TValues = Record<string, unknown>> {
  readonly fields?: Readonly<Record<string, readonly ValidationRule<TValues>[]>>
  readonly form?: readonly ((context: ValidationContext<TValues>) => Awaitable<FieldErrors>)[]
}

export interface FormValidationResult {
  readonly valid: boolean
  readonly fieldErrors: FieldErrors
}

export interface FormValidationAdapter<TValues = Record<string, unknown>> {
  validate(values: TValues, signal: AbortSignal): Promise<FormValidationResult>
}

export interface ValidationRuleFactory {
  readonly required: (message?: string) => ValidationRule<unknown>
  readonly minLength: (length: number, message?: string) => ValidationRule<unknown>
  readonly maxLength: (length: number, message?: string) => ValidationRule<unknown>
  readonly minValue: (minimum: number, message?: string) => ValidationRule<unknown>
  readonly maxValue: (maximum: number, message?: string) => ValidationRule<unknown>
  readonly integer: (message?: string) => ValidationRule<unknown>
  readonly matches: (pattern: RegExp, message?: string) => ValidationRule<unknown>
  readonly email: (message?: string) => ValidationRule<unknown>
}

function appendMessages(
  target: Record<string, string[]>,
  path: string,
  messages: readonly string[],
): void {
  if (messages.length === 0) return
  target[path] = [...(target[path] ?? []), ...messages]
}

function normalizeMessages(result: string | readonly string[] | undefined): readonly string[] {
  if (result === undefined || result === '') return []
  return typeof result === 'string' ? [result] : result
}

export function createRuleValidationAdapter<TValues>(
  schema: FormValidationSchema<TValues>,
): FormValidationAdapter<TValues> {
  return {
    async validate(values, signal) {
      const errors: Record<string, string[]> = {}
      const context = { values, signal }

      for (const [path, rules] of Object.entries(schema.fields ?? {})) {
        for (const rule of rules) {
          signal.throwIfAborted()
          const messages = normalizeMessages(await rule(getFormValue(values, path), context))
          signal.throwIfAborted()
          appendMessages(errors, path, messages)
        }
      }

      for (const validator of schema.form ?? []) {
        signal.throwIfAborted()
        const result = await validator(context)
        signal.throwIfAborted()
        for (const [path, messages] of Object.entries(result)) {
          appendMessages(errors, path, messages ?? [])
        }
      }

      return { valid: Object.keys(errors).length === 0, fieldErrors: errors }
    },
  }
}

export function required(message = 'This field is required'): ValidationRule<unknown> {
  return (value) => {
    if (value === null || value === undefined || value === '') return message
    if (Array.isArray(value) && value.length === 0) return message
    return undefined
  }
}

export function minLength(
  length: number,
  message = `Enter at least ${length} characters`,
): ValidationRule<unknown> {
  return (value) => (typeof value === 'string' && value.length < length ? message : undefined)
}

export function maxLength(
  length: number,
  message = `Enter no more than ${length} characters`,
): ValidationRule<unknown> {
  return (value) => (typeof value === 'string' && value.length > length ? message : undefined)
}

export function email(message = 'Enter a valid email address'): ValidationRule<unknown> {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return (value) =>
    typeof value === 'string' && value !== '' && !pattern.test(value) ? message : undefined
}

export function minValue(
  minimum: number,
  message = `Enter a value of at least ${minimum}`,
): ValidationRule<unknown> {
  return (value) => (typeof value === 'number' && value < minimum ? message : undefined)
}

export function maxValue(
  maximum: number,
  message = `Enter a value no greater than ${maximum}`,
): ValidationRule<unknown> {
  return (value) => (typeof value === 'number' && value > maximum ? message : undefined)
}

export function integer(message = 'Enter a whole number'): ValidationRule<unknown> {
  return (value) => (typeof value === 'number' && !Number.isInteger(value) ? message : undefined)
}

export function matches(
  pattern: RegExp,
  message = 'Enter a value in the expected format',
): ValidationRule<unknown> {
  return (value) => {
    pattern.lastIndex = 0
    return typeof value === 'string' && value !== '' && !pattern.test(value) ? message : undefined
  }
}

export function composeValidationAdapters<TValues>(
  adapters: readonly FormValidationAdapter<TValues>[],
): FormValidationAdapter<TValues> {
  return {
    async validate(values, signal) {
      const errors: Record<string, string[]> = {}
      for (const adapter of adapters) {
        signal.throwIfAborted()
        const result = await adapter.validate(values, signal)
        signal.throwIfAborted()
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          appendMessages(errors, path, messages ?? [])
        }
      }
      return { valid: Object.keys(errors).length === 0, fieldErrors: errors }
    },
  }
}

/**
 * Creates validation rules whose fallback messages come from an explicit locale controller.
 * Passing the controller keeps schema factories usable outside Vue component setup and in SSR.
 */
export function createValidationRules(
  locale: Pick<VelaLocaleController, 't'>,
): ValidationRuleFactory {
  return {
    required: (message) => required(message ?? locale.t('forms.validation.required')),
    minLength: (length, message) =>
      minLength(length, message ?? locale.t('forms.validation.minLength', { length })),
    maxLength: (length, message) =>
      maxLength(length, message ?? locale.t('forms.validation.maxLength', { length })),
    minValue: (minimum, message) =>
      minValue(minimum, message ?? locale.t('forms.validation.minValue', { minimum })),
    maxValue: (maximum, message) =>
      maxValue(maximum, message ?? locale.t('forms.validation.maxValue', { maximum })),
    integer: (message) => integer(message ?? locale.t('forms.validation.integer')),
    matches: (pattern, message) =>
      matches(pattern, message ?? locale.t('forms.validation.matches')),
    email: (message) => email(message ?? locale.t('forms.validation.email')),
  }
}

/** Use inside setup when a form should follow the current application locale. */
export function useValidationRules(): ValidationRuleFactory {
  return createValidationRules(useVelaLocale())
}

export function fieldErrorsFromNormalizedError(error: NormalizedError): FieldErrors {
  return error.fieldErrors ?? {}
}
