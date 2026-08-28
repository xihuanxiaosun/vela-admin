import { computed, onScopeDispose, shallowRef, type Ref } from 'vue'
import type { FieldErrors, NormalizedError } from '@vela-admin/contracts'

import { getFormValue, isFormValueEqual, setFormValue } from './path'
import type { FormValidationAdapter } from './validation'

export interface UseFormOptions<TValues> {
  readonly initialValues: TValues
  readonly validation?: FormValidationAdapter<TValues>
  readonly clone?: (values: TValues) => TValues
}

export interface SubmitContext<TValues> {
  readonly values: TValues
  readonly signal: AbortSignal
  readonly setFieldErrors: (errors: FieldErrors) => void
}

export interface UseFormReturn<TValues> {
  readonly values: Ref<TValues>
  readonly initialValues: Readonly<Ref<TValues>>
  readonly errors: Readonly<Ref<FieldErrors>>
  readonly submitting: Readonly<Ref<boolean>>
  readonly validating: Readonly<Ref<boolean>>
  readonly dirty: Readonly<Ref<boolean>>
  readonly valid: Readonly<Ref<boolean>>
  readonly getValue: (path: string) => unknown
  readonly setValue: (path: string, value: unknown) => void
  readonly setValues: (values: TValues) => void
  readonly setFieldErrors: (errors: FieldErrors) => void
  readonly clearErrors: () => void
  readonly commit: (values?: TValues) => void
  readonly reset: (values?: TValues) => void
  readonly validate: () => Promise<boolean>
  readonly submit: <TResult>(
    handler: (context: SubmitContext<TValues>) => Promise<TResult>,
  ) => Promise<TResult | undefined>
  readonly cancel: () => void
}

export function useForm<TValues>(options: UseFormOptions<TValues>): UseFormReturn<TValues> {
  const clone: (values: TValues) => TValues = options.clone ?? structuredClone
  const initialValues: Ref<TValues> = shallowRef<TValues>(clone(options.initialValues))
  const values: Ref<TValues> = shallowRef<TValues>(clone(options.initialValues))
  const errors = shallowRef<FieldErrors>({})
  const submitting = shallowRef(false)
  const validating = shallowRef(false)
  let validationController: AbortController | undefined
  let submitController: AbortController | undefined
  let validationRevision = 0
  let submitRevision = 0

  const setFieldErrors = (nextErrors: FieldErrors) => {
    errors.value = { ...nextErrors }
  }

  const clearErrors = () => setFieldErrors({})

  const validate = async () => {
    validationController?.abort()
    const currentRevision = ++validationRevision
    if (!options.validation) {
      clearErrors()
      return true
    }
    const currentController = new AbortController()
    validationController = currentController
    validating.value = true
    try {
      const result = await options.validation.validate(values.value, currentController.signal)
      if (currentRevision !== validationRevision) return false
      setFieldErrors(result.fieldErrors)
      return result.valid
    } catch (error) {
      if (currentController.signal.aborted) return false
      throw error
    } finally {
      if (currentRevision === validationRevision) {
        validating.value = false
        validationController = undefined
      }
    }
  }

  const cancel = () => {
    validationRevision += 1
    submitRevision += 1
    validationController?.abort()
    submitController?.abort()
    validationController = undefined
    submitController = undefined
    validating.value = false
    submitting.value = false
  }

  const submit = async <TResult>(
    handler: (context: SubmitContext<TValues>) => Promise<TResult>,
  ): Promise<TResult | undefined> => {
    if (!(await validate())) return undefined
    submitController?.abort()
    const currentRevision = ++submitRevision
    const currentController = new AbortController()
    submitController = currentController
    submitting.value = true
    try {
      const result = await handler({
        values: clone(values.value),
        signal: currentController.signal,
        setFieldErrors: (nextErrors) => {
          if (currentRevision === submitRevision && !currentController.signal.aborted) {
            setFieldErrors(nextErrors)
          }
        },
      })
      if (currentRevision !== submitRevision || currentController.signal.aborted) return undefined
      return result
    } catch (error) {
      if (currentRevision !== submitRevision || currentController.signal.aborted) return undefined
      const candidate = error as Partial<NormalizedError> & {
        normalized?: Partial<NormalizedError>
      }
      const normalized = candidate.normalized ?? candidate
      if (normalized.fieldErrors) setFieldErrors(normalized.fieldErrors)
      throw error
    } finally {
      if (currentRevision === submitRevision) {
        submitting.value = false
        submitController = undefined
      }
    }
  }

  onScopeDispose(cancel)

  const commit = (nextValues = values.value) => {
    initialValues.value = clone(nextValues)
    values.value = clone(nextValues)
    clearErrors()
  }

  return {
    values,
    initialValues,
    errors,
    submitting,
    validating,
    dirty: computed(() => !isFormValueEqual(values.value, initialValues.value)),
    valid: computed(() => Object.keys(errors.value).length === 0),
    getValue: (path) => getFormValue(values.value, path),
    setValue: (path, value) => {
      values.value = setFormValue(values.value, path, value)
      if (errors.value[path]) {
        const next = { ...errors.value }
        delete next[path]
        errors.value = next
      }
    },
    setValues: (nextValues) => {
      values.value = clone(nextValues)
    },
    setFieldErrors,
    clearErrors,
    commit,
    reset: (nextValues = initialValues.value) => {
      values.value = clone(nextValues)
      if (nextValues !== initialValues.value) initialValues.value = clone(nextValues)
      clearErrors()
      cancel()
    },
    validate,
    submit,
    cancel,
  }
}
