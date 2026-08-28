import { onScopeDispose, shallowRef, type Ref } from 'vue'
import type { Awaitable, NormalizedError } from '@vela-admin/contracts'

import { useForm, type UseFormReturn } from './use-form'
import type { FormValidationAdapter } from './validation'

export type FormWorkflowMode = 'create' | 'edit'

export interface FormWorkflowLoadContext<TKey> {
  readonly key: TKey
  readonly signal: AbortSignal
}

export interface FormWorkflowSubmitContext<TKey> {
  readonly mode: FormWorkflowMode
  readonly key: TKey | undefined
  readonly signal: AbortSignal
}

export interface FormWorkflowAdapter<TValues, TRecord, TPayload, TResult, TKey> {
  readonly load?: (context: FormWorkflowLoadContext<TKey>) => Awaitable<TRecord>
  readonly toValues: (record: Readonly<TRecord>) => TValues
  readonly toPayload: (
    values: Readonly<TValues>,
    context: Omit<FormWorkflowSubmitContext<TKey>, 'signal'>,
  ) => TPayload
  readonly submit: (
    payload: Readonly<TPayload>,
    context: FormWorkflowSubmitContext<TKey>,
  ) => Awaitable<TResult>
  readonly toCommittedValues?: (
    result: Readonly<TResult>,
    submittedValues: Readonly<TValues>,
  ) => TValues
}

export interface UseFormWorkflowOptions<TValues, TRecord, TPayload, TResult, TKey> {
  readonly initialValues: TValues
  readonly adapter: FormWorkflowAdapter<TValues, TRecord, TPayload, TResult, TKey>
  readonly validation?: FormValidationAdapter<TValues>
  readonly clone?: (values: TValues) => TValues
  readonly normalizeError?: (error: unknown) => NormalizedError
}

export interface FormWorkflowController<TValues, TResult, TKey> {
  readonly form: UseFormReturn<TValues>
  readonly mode: Ref<FormWorkflowMode>
  readonly key: Ref<TKey | undefined>
  readonly loading: Readonly<Ref<boolean>>
  readonly loadError: Readonly<Ref<NormalizedError | undefined>>
  readonly submitError: Readonly<Ref<NormalizedError | undefined>>
  readonly beginCreate: (values?: TValues) => void
  readonly beginEdit: (key: TKey) => Promise<boolean>
  readonly retryLoad: () => Promise<boolean>
  readonly submit: () => Promise<TResult | undefined>
  readonly cancel: () => void
}

function defaultNormalizeError(error: unknown): NormalizedError {
  const candidate = error as Partial<NormalizedError> & {
    readonly normalized?: Partial<NormalizedError>
  }
  const normalized = candidate.normalized ?? candidate
  if (
    typeof normalized.kind === 'string' &&
    typeof normalized.message === 'string' &&
    typeof normalized.retryable === 'boolean'
  ) {
    return normalized as NormalizedError
  }
  return {
    kind: 'unknown',
    message: error instanceof Error ? error.message : 'The request could not be completed.',
    retryable: true,
    cause: error,
  }
}

/** Coordinates create/edit loading, record mapping, validation, cancellation and submission. */
export function useFormWorkflow<TValues, TRecord, TPayload, TResult, TKey = string | number>(
  options: UseFormWorkflowOptions<TValues, TRecord, TPayload, TResult, TKey>,
): FormWorkflowController<TValues, TResult, TKey> {
  const clone: (values: TValues) => TValues = options.clone ?? structuredClone
  const normalizeError = options.normalizeError ?? defaultNormalizeError
  const form = useForm<TValues>({
    initialValues: options.initialValues,
    ...(options.validation ? { validation: options.validation } : {}),
    clone,
  })
  const mode = shallowRef<FormWorkflowMode>('create')
  const key = shallowRef<TKey>()
  const loading = shallowRef(false)
  const loadError = shallowRef<NormalizedError>()
  const submitError = shallowRef<NormalizedError>()
  let loadController: AbortController | undefined
  let loadRevision = 0

  function cancelLoad(): void {
    loadRevision += 1
    loadController?.abort()
    loadController = undefined
    loading.value = false
  }

  function beginCreate(values = options.initialValues): void {
    cancelLoad()
    form.cancel()
    mode.value = 'create'
    key.value = undefined
    loadError.value = undefined
    submitError.value = undefined
    form.reset(clone(values))
  }

  async function loadRecord(nextKey: TKey): Promise<boolean> {
    cancelLoad()
    form.cancel()
    const revision = ++loadRevision
    const controller = new AbortController()
    loadController = controller
    mode.value = 'edit'
    key.value = nextKey
    loadError.value = undefined
    submitError.value = undefined
    loading.value = true
    try {
      if (!options.adapter.load)
        throw new Error('This form workflow does not provide an edit loader')
      const record = await options.adapter.load({ key: nextKey, signal: controller.signal })
      if (controller.signal.aborted || revision !== loadRevision) return false
      form.reset(options.adapter.toValues(record))
      return true
    } catch (error) {
      if (controller.signal.aborted || revision !== loadRevision) return false
      loadError.value = normalizeError(error)
      return false
    } finally {
      if (revision === loadRevision) {
        loading.value = false
        loadController = undefined
      }
    }
  }

  async function submit(): Promise<TResult | undefined> {
    submitError.value = undefined
    try {
      const result = await form.submit(async ({ values, signal }) => {
        const context = { mode: mode.value, key: key.value }
        const payload = options.adapter.toPayload(values, context)
        return options.adapter.submit(payload, { ...context, signal })
      })
      if (result === undefined) return undefined
      const committedValues = options.adapter.toCommittedValues?.(result, form.values.value)
      form.commit(committedValues ?? form.values.value)
      return result
    } catch (error) {
      submitError.value = normalizeError(error)
      return undefined
    }
  }

  function cancel(): void {
    cancelLoad()
    form.cancel()
  }

  onScopeDispose(cancel)

  return {
    form,
    mode,
    key,
    loading,
    loadError,
    submitError,
    beginCreate,
    beginEdit: loadRecord,
    retryLoad: () => (key.value === undefined ? Promise.resolve(false) : loadRecord(key.value)),
    submit,
    cancel,
  }
}
