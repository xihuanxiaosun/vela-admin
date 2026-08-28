import { effectScope, shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createVelaLocale } from '@vela-admin/locale'

import {
  createRuleValidationAdapter,
  composeValidationAdapters,
  createFormFieldRegistry,
  createFormDataMapper,
  createValidationRules,
  email,
  fieldErrorsFromNormalizedError,
  getFormValue,
  isFormValueEqual,
  maxLength,
  maxValue,
  matches,
  minLength,
  minValue,
  integer,
  isSearchableField,
  required,
  resolveFormFieldRenderer,
  setFormValue,
  useDirtyLeaveGuard,
  useForm,
  useFormDraft,
  useFormWorkflow,
  type FormFieldKind,
  type FormFieldRenderContext,
  type FormFieldPresentationSchema,
} from './index'

describe('form paths', () => {
  it('reads and immutably updates nested values', () => {
    const source = { profile: { name: 'A' }, roles: ['viewer'] }
    const result = setFormValue(source, 'profile.name', 'B')
    expect(getFormValue(result, 'profile.name')).toBe('B')
    expect(source.profile.name).toBe('A')
    expect(isFormValueEqual(result, source)).toBe(false)
  })

  it('supports array paths, missing branches, array creation, and root replacement', () => {
    const source = { people: [{ name: 'Ada' }] }
    expect(getFormValue(source, 'people[0].name')).toBe('Ada')
    expect(getFormValue(source, 'people[1].name')).toBeUndefined()
    expect(setFormValue({}, ['people', 0, 'name'], 'Grace')).toEqual({
      people: [{ name: 'Grace' }],
    })
    expect(setFormValue(source, [], { reset: true })).toEqual({ reset: true })
  })

  it('compares dates, arrays, records, and primitives structurally', () => {
    expect(isFormValueEqual(new Date(10), new Date(10))).toBe(true)
    expect(isFormValueEqual(new Date(10), new Date(20))).toBe(false)
    expect(isFormValueEqual([1, { value: true }], [1, { value: true }])).toBe(true)
    expect(isFormValueEqual([1], [1, 2])).toBe(false)
    expect(isFormValueEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(isFormValueEqual({ a: 1 }, { b: 1 })).toBe(false)
    expect(isFormValueEqual(null, {})).toBe(false)
  })
})

describe('form data mapping', () => {
  it('maps nested record and payload paths, preserves null transforms, and omits configured fields', () => {
    interface Values {
      profile: { name: string }
      avatar: { value: { key: string } } | null
      localOnly: string
    }
    interface RecordValue {
      user: { display_name: string; avatar: { key: string } | null }
    }
    interface Payload {
      display_name: string
      avatar_key: string | null
    }

    const mapper = createFormDataMapper<Values, RecordValue, Payload>({
      createValues: () => ({ profile: { name: '' }, avatar: null, localOnly: 'keep' }),
      createPayload: () => ({ display_name: '', avatar_key: null }),
      fields: [
        {
          valuePath: 'profile.name',
          recordPath: 'user.display_name',
          submitPath: 'display_name',
        },
        {
          valuePath: 'avatar',
          recordPath: 'user.avatar',
          submitPath: 'avatar_key',
          deserialize: (value) => (value ? { value } : null),
          serialize: (value) =>
            (value as Values['avatar']) === null
              ? null
              : (value as NonNullable<Values['avatar']>).value.key,
        },
        { valuePath: 'localOnly', recordPath: false, submitPath: false },
      ],
    })

    const values = mapper.fromRecord({ user: { display_name: 'Maya', avatar: null } })
    expect(values).toEqual({ profile: { name: 'Maya' }, avatar: null, localOnly: 'keep' })
    expect(mapper.toPayload(values)).toEqual({ display_name: 'Maya', avatar_key: null })
  })
})

describe('form field registry', () => {
  it('resolves built-in and custom renderers and rejects invalid configuration', () => {
    const custom = { component: { name: 'MoneyField' } }
    const registry = createFormFieldRegistry({ money: custom })

    expect(resolveFormFieldRenderer({ key: 'name', kind: 'text' }, registry).component).toBeTruthy()
    expect(
      resolveFormFieldRenderer({ key: 'price', kind: 'custom', renderer: 'money' }, registry),
    ).toBe(custom)
    expect(() => resolveFormFieldRenderer({ key: 'broken', kind: 'custom' }, registry)).toThrow(
      'require a renderer key',
    )
    expect(() =>
      resolveFormFieldRenderer({ key: 'broken', kind: 'custom', renderer: 'missing' }, registry),
    ).toThrow('unknown form field renderer')
  })

  it('keeps every built-in renderer configurable through one typed registry', () => {
    const registry = createFormFieldRegistry()
    const context = (
      kind: FormFieldKind,
      field: Partial<FormFieldPresentationSchema> = {},
    ): FormFieldRenderContext => ({
      field: {
        ...field,
        key: field.key ?? 'field',
        kind,
        label: field.label ?? 'Field',
      },
      values: {},
      value: undefined,
      options: [{ title: 'Editor', value: 'editor' }],
      optionsLoading: true,
      optionsError: undefined,
      search: 'edit',
    })

    const inputTypes = {
      text: 'text',
      password: 'password',
      email: 'email',
      tel: 'tel',
      url: 'url',
      date: 'date',
      datetime: 'datetime-local',
    } as const
    for (const [kind, type] of Object.entries(inputTypes)) {
      expect(registry[kind]?.props?.(context(kind as FormFieldKind))).toEqual({ type })
    }

    expect(registry.number?.mapValue?.(undefined)).toBeNull()
    expect(registry.number?.mapValue?.(12)).toBe(12)
    expect(registry.checkbox?.mapValue?.(0)).toBe(false)
    expect(registry.switch?.mapValue?.('enabled')).toBe(true)
    expect(registry.select?.props?.(context('select'))).toMatchObject({
      items: [{ title: 'Editor', value: 'editor' }],
      multiple: false,
      clearable: true,
    })
    expect(
      registry.radio?.props?.(context('radio', { multiple: true, clearable: false })),
    ).toMatchObject({ multiple: true, clearable: false })
    expect(registry.autocomplete?.props?.(context('autocomplete'))).toMatchObject({
      loading: true,
      search: 'edit',
    })
    expect(registry.combobox?.props?.(context('combobox'))).toMatchObject({
      loading: true,
      search: 'edit',
    })
    expect(registry.textarea?.component).toBeTruthy()
    expect(registry.slider?.component).toBeTruthy()
    expect(isSearchableField('autocomplete')).toBe(true)
    expect(isSearchableField('combobox')).toBe(true)
    expect(isSearchableField('text')).toBe(false)
  })
})

describe('rule validation', () => {
  it('supports sync rules and field errors', async () => {
    const adapter = createRuleValidationAdapter({
      fields: { email: [required(), email()] },
    })
    const result = await adapter.validate({ email: 'invalid' }, new AbortController().signal)
    expect(result.valid).toBe(false)
    expect(result.fieldErrors.email).toContain('Enter a valid email address')
  })

  it('can resolve fallback messages from an explicit app locale', async () => {
    const locale = createVelaLocale({
      locale: 'test',
      root: null,
      messages: {
        test: {
          'forms.validation.required': 'Required in test locale',
          'forms.validation.minLength': 'Minimum {length}',
        },
      },
    })
    const rules = createValidationRules(locale)
    const adapter = createRuleValidationAdapter({
      fields: { name: [rules.required(), rules.minLength(4)] },
    })

    const empty = await adapter.validate({ name: '' }, new AbortController().signal)
    expect(empty.fieldErrors.name).toContain('Required in test locale')
    expect(empty.fieldErrors.name).toContain('Minimum 4')
  })

  it('normalizes rule arrays, cross-field errors, and empty messages', async () => {
    const adapter = createRuleValidationAdapter<{ password: string; confirmation: string }>({
      fields: {
        password: [() => ['First issue', 'Second issue'], () => '', maxLength(3, 'Too long')],
      },
      form: [
        ({ values }) =>
          values.password === values.confirmation
            ? {}
            : { confirmation: ['Passwords do not match'], ignored: undefined },
      ],
    })
    const result = await adapter.validate(
      { password: 'long', confirmation: 'different' },
      new AbortController().signal,
    )

    expect(result.fieldErrors).toEqual({
      password: ['First issue', 'Second issue', 'Too long'],
      confirmation: ['Passwords do not match'],
    })
    expect(result.valid).toBe(false)
  })

  it('covers required, length, email, and normalized server-error boundaries', async () => {
    const context = { values: {}, signal: new AbortController().signal }
    const requiredRule = required('Required')
    const minimum = minLength(3)
    const maximum = maxLength(3)
    const emailRule = email()
    const minimumValue = minValue(2)
    const maximumValue = maxValue(4)
    const integerRule = integer()
    const format = matches(/^VELA-/)

    expect(await requiredRule(null, context)).toBe('Required')
    expect(await requiredRule([], context)).toBe('Required')
    expect(await requiredRule(false, context)).toBeUndefined()
    expect(await minimum('ab', context)).toContain('at least 3')
    expect(await minimum(12, context)).toBeUndefined()
    expect(await maximum('abcd', context)).toContain('no more than 3')
    expect(await maximum(undefined, context)).toBeUndefined()
    expect(await emailRule('', context)).toBeUndefined()
    expect(await emailRule('ada@example.com', context)).toBeUndefined()
    expect(await minimumValue(1, context)).toContain('at least 2')
    expect(await minimumValue('1', context)).toBeUndefined()
    expect(await maximumValue(5, context)).toContain('no greater than 4')
    expect(await integerRule(1.5, context)).toContain('whole number')
    expect(await format('OTHER', context)).toContain('expected format')
    expect(await format('VELA-7', context)).toBeUndefined()
    expect(
      fieldErrorsFromNormalizedError({
        kind: 'validation',
        message: 'Invalid',
        retryable: false,
        fieldErrors: { email: ['Already used'] },
      }),
    ).toEqual({ email: ['Already used'] })
    expect(
      fieldErrorsFromNormalizedError({ kind: 'server', message: 'Failed', retryable: true }),
    ).toEqual({})
  })

  it('composes independent validation adapters without losing field errors', async () => {
    const first = createRuleValidationAdapter<{ name: string }>({
      fields: { name: [required('Name required')] },
    })
    const second = createRuleValidationAdapter<{ name: string }>({
      fields: { name: [minLength(3, 'Name too short')] },
    })
    const validation = composeValidationAdapters([first, second])

    await expect(validation.validate({ name: '' }, new AbortController().signal)).resolves.toEqual({
      valid: false,
      fieldErrors: { name: ['Name required', 'Name too short'] },
    })
  })
})

describe('useForm', () => {
  it('tracks dirty state, resets, and blocks invalid submission', async () => {
    interface TestFormValues {
      readonly name: string
    }

    const scope = effectScope()
    const form = scope.run(() =>
      useForm<TestFormValues>({
        initialValues: { name: '' },
        validation: createRuleValidationAdapter<TestFormValues>({
          fields: { name: [required()] },
        }),
      }),
    )
    if (!form) throw new Error('Expected form scope')
    form.setValue('name', 'Vela')
    expect(form.dirty.value).toBe(true)
    const submitted = await form.submit<string>(({ values }) => Promise.resolve(values.name))
    expect(submitted).toBe('Vela')
    form.commit()
    expect(form.dirty.value).toBe(false)
    form.setValue('name', 'Changed')
    form.reset({ name: '' })
    expect(form.dirty.value).toBe(false)
    expect(await form.submit(() => Promise.resolve('never'))).toBeUndefined()
    scope.stop()
  })

  it('prevents superseded submissions from mutating current field errors', async () => {
    const scope = effectScope()
    const form = scope.run(() => useForm({ initialValues: { name: 'Vela' } }))
    if (!form) throw new Error('Expected form scope')

    let resolveFirst: ((value: string) => void) | undefined
    let setStaleErrors: ((errors: { readonly name: readonly string[] }) => void) | undefined
    const first = form.submit<string>(
      ({ setFieldErrors }) =>
        new Promise((resolve) => {
          setStaleErrors = setFieldErrors
          resolveFirst = resolve
        }),
    )
    await Promise.resolve()
    const second = form.submit(({ setFieldErrors }) => {
      setFieldErrors({ name: ['Current error'] })
      return Promise.resolve('current')
    })
    await Promise.resolve()
    setStaleErrors?.({ name: ['Stale error'] })
    resolveFirst?.('stale')

    expect(await first).toBeUndefined()
    expect(await second).toBe('current')
    expect(form.errors.value.name).toEqual(['Current error'])
    scope.stop()
  })

  it('maps server field errors, clears edited fields, and cancels active submission', async () => {
    const scope = effectScope()
    const form = scope.run(() => useForm({ initialValues: { email: 'ada@example.com' } }))
    if (!form) throw new Error('Expected form scope')

    const serverError = Object.assign(new Error('Validation failed'), {
      normalized: { fieldErrors: { email: ['Already used'] } },
    })
    await expect(form.submit(() => Promise.reject(serverError))).rejects.toBe(serverError)
    expect(form.valid.value).toBe(false)
    form.setValue('email', 'new@example.com')
    expect(form.errors.value).toEqual({})
    expect(form.getValue('email')).toBe('new@example.com')
    form.setValues({ email: 'other@example.com' })
    form.commit({ email: 'committed@example.com' })
    expect(form.values.value.email).toBe('committed@example.com')

    let finish!: (value: string) => void
    const pending = form.submit(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve
        }),
    )
    await Promise.resolve()
    expect(form.submitting.value).toBe(true)
    form.cancel()
    finish('late')
    await expect(pending).resolves.toBeUndefined()
    expect(form.submitting.value).toBe(false)
    scope.stop()
  })
})

describe('useFormDraft', () => {
  it('discovers, restores, saves, and clears a versioned draft through storage adapters', async () => {
    const values = new Map<string, unknown>([
      [
        'profile.draft',
        { format: 1, schemaVersion: 'profile-v2', savedAt: 40, values: { name: 'Recovered' } },
      ],
    ])
    const storage = {
      get: <TValue>(key: string) => values.get(key) as TValue | undefined,
      set: <TValue>(key: string, value: TValue) => {
        values.set(key, structuredClone(value))
      },
      remove: (key: string) => {
        values.delete(key)
      },
    }
    let timestamp = 100
    const scope = effectScope()
    const state = scope.run(() => {
      const form = useForm({ initialValues: { name: 'Original' } })
      const draft = useFormDraft({
        form,
        storage,
        storageKey: 'profile.draft',
        schemaVersion: 'profile-v2',
        immediate: false,
        debounceMs: 0,
        now: () => ++timestamp,
      })
      return { form, draft }
    })
    if (!state) throw new Error('Expected form draft scope')

    await expect(state.draft.hydrate()).resolves.toMatchObject({ savedAt: 40 })
    expect(state.draft.restorable.value).toBe(true)
    expect(state.form.values.value.name).toBe('Original')
    expect(state.draft.restore()).toBe(true)
    expect(state.draft.restorable.value).toBe(false)
    expect(state.form.values.value.name).toBe('Recovered')
    state.form.setValue('name', 'Updated')
    await state.draft.save()
    expect(values.get('profile.draft')).toMatchObject({
      format: 1,
      schemaVersion: 'profile-v2',
      savedAt: 101,
      values: { name: 'Updated' },
    })

    state.form.commit()
    await Promise.resolve()
    await state.draft.flush()
    expect(values.has('profile.draft')).toBe(false)
    expect(state.draft.hasDraft.value).toBe(false)
    scope.stop()
  })

  it('migrates compatible drafts, supports automatic restoration, and reports storage errors', async () => {
    const migration = vi.fn(() => ({ name: 'Migrated' }))
    const scope = effectScope()
    const state = scope.run(() => {
      const form = useForm({ initialValues: { name: 'Original' } })
      const draft = useFormDraft({
        form,
        storage: {
          get: <TValue>() =>
            ({
              format: 1,
              schemaVersion: 1,
              savedAt: 20,
              values: { legacy: true },
            }) as TValue,
          set: () => Promise.reject(new Error('quota exceeded')),
          remove: () => undefined,
        },
        storageKey: 'migration',
        schemaVersion: 2,
        migrate: migration,
        autoRestore: true,
        immediate: false,
      })
      return { form, draft }
    })
    if (!state) throw new Error('Expected form draft scope')

    await state.draft.hydrate()
    expect(migration).toHaveBeenCalledOnce()
    expect(state.form.values.value.name).toBe('Migrated')
    state.form.setValue('name', 'Unsaved')
    await expect(state.draft.save()).resolves.toBeUndefined()
    expect(state.draft.error.value).toBeInstanceOf(Error)
    scope.stop()
  })

  it('ignores incompatible drafts and keeps discard failures recoverable', async () => {
    let stored: unknown = {
      format: 1,
      schemaVersion: 'legacy',
      savedAt: 10,
      values: { name: 'Legacy' },
    }
    let removeFails = true
    const migrate = vi.fn(() => undefined)
    const scope = effectScope()
    const state = scope.run(() => {
      const form = useForm({ initialValues: { name: 'Original' } })
      const draft = useFormDraft({
        form,
        storage: {
          get: <TValue>() => stored as TValue,
          set: () => undefined,
          remove: () =>
            removeFails ? Promise.reject(new Error('remove failed')) : Promise.resolve(),
        },
        storageKey: 'incompatible',
        schemaVersion: 'current',
        migrate,
        immediate: false,
      })
      return { form, draft }
    })
    if (!state) throw new Error('Expected form draft scope')

    await expect(state.draft.save()).resolves.toBeUndefined()
    expect(state.draft.restore()).toBe(false)
    await expect(state.draft.hydrate()).resolves.toBeUndefined()
    expect(migrate).toHaveBeenCalledOnce()
    expect(state.draft.hasDraft.value).toBe(false)

    stored = { format: 2, schemaVersion: 'current', savedAt: 10, values: {} }
    await expect(state.draft.hydrate()).resolves.toBeUndefined()
    await state.draft.discard()
    expect(state.draft.error.value).toMatchObject({ message: 'remove failed' })
    removeFails = false
    await state.draft.discard()
    expect(state.draft.error.value).toBeUndefined()
    scope.stop()
  })
})

describe('useFormWorkflow', () => {
  it('loads edit records, maps payloads, validates, submits, and commits the result', async () => {
    interface Values {
      name: string
    }
    interface RecordValue {
      displayName: string
    }
    interface Payload {
      display_name: string
    }
    const submitted: Payload[] = []
    const scope = effectScope()
    const workflow = scope.run(() =>
      useFormWorkflow<Values, RecordValue, Payload, { ok: true }, number>({
        initialValues: { name: '' },
        validation: createRuleValidationAdapter({ fields: { name: [required()] } }),
        adapter: {
          load: ({ key }) => Promise.resolve({ displayName: `User ${key}` }),
          toValues: (record) => ({ name: record.displayName }),
          toPayload: (values) => ({ display_name: values.name }),
          submit: (payload) => {
            submitted.push({ ...payload })
            return Promise.resolve({ ok: true as const })
          },
        },
      }),
    )
    if (!workflow) throw new Error('Expected workflow scope')

    await expect(workflow.beginEdit(7)).resolves.toBe(true)
    expect(workflow.form.values.value.name).toBe('User 7')
    workflow.form.setValue('name', 'Updated')
    await expect(workflow.submit()).resolves.toEqual({ ok: true })
    expect(submitted).toEqual([{ display_name: 'Updated' }])
    expect(workflow.form.dirty.value).toBe(false)

    workflow.beginCreate()
    expect(workflow.mode.value).toBe('create')
    expect(workflow.key.value).toBeUndefined()
    expect(await workflow.submit()).toBeUndefined()
    scope.stop()
  })

  it('ignores stale loads and exposes normalized load failures for retry UI', async () => {
    const scope = effectScope()
    let resolveFirst!: (value: { name: string }) => void
    const workflow = scope.run(() =>
      useFormWorkflow<{ name: string }, { name: string }, { name: string }, string, number>({
        initialValues: { name: '' },
        adapter: {
          load: ({ key }) =>
            key === 1
              ? new Promise((resolve) => {
                  resolveFirst = resolve
                })
              : key === 2
                ? Promise.resolve({ name: 'Current' })
                : Promise.reject(
                    Object.assign(new Error('Missing record'), {
                      kind: 'not-found',
                      retryable: false,
                    }),
                  ),
          toValues: (record) => record,
          toPayload: (values) => values,
          submit: () => Promise.resolve('saved'),
        },
      }),
    )
    if (!workflow) throw new Error('Expected workflow scope')

    const first = workflow.beginEdit(1)
    await expect(workflow.beginEdit(2)).resolves.toBe(true)
    resolveFirst({ name: 'Stale' })
    await expect(first).resolves.toBe(false)
    expect(workflow.form.values.value.name).toBe('Current')

    await expect(workflow.beginEdit(3)).resolves.toBe(false)
    expect(workflow.loadError.value).toMatchObject({ kind: 'not-found', message: 'Missing record' })
    scope.stop()
  })
})

describe('useDirtyLeaveGuard', () => {
  it('blocks browser unload and deduplicates async navigation confirmation', async () => {
    const dirty = shallowRef(true)
    let beforeUnload: ((event: BeforeUnloadEvent) => void) | undefined
    const target = {
      addEventListener: vi.fn((_: 'beforeunload', listener: (event: BeforeUnloadEvent) => void) => {
        beforeUnload = listener
      }),
      removeEventListener: vi.fn(),
    }
    let resolveConfirmation: ((accepted: boolean) => void) | undefined
    const confirm = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirmation = resolve
        }),
    )
    const scope = effectScope()
    const guard = scope.run(() =>
      useDirtyLeaveGuard({ dirty, confirm, beforeUnloadTarget: target }),
    )
    if (!guard) throw new Error('Expected leave guard scope')

    const preventDefault = vi.fn()
    const event = { preventDefault, returnValue: undefined } as unknown as BeforeUnloadEvent
    beforeUnload?.(event)
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(event.returnValue).toBe('')

    const first = guard.canLeave()
    const second = guard.canLeave()
    expect(confirm).toHaveBeenCalledOnce()
    expect(guard.confirming.value).toBe(true)
    resolveConfirmation?.(true)
    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
    expect(guard.confirming.value).toBe(false)

    dirty.value = false
    await expect(guard.canLeave()).resolves.toBe(true)
    expect(confirm).toHaveBeenCalledOnce()
    scope.stop()
    expect(target.removeEventListener).toHaveBeenCalledOnce()
  })

  it('supports programmatic reasons and idempotent manual disposal', async () => {
    const dirty = shallowRef(true)
    const confirm = vi.fn(() => true)
    const scope = effectScope()
    const guard = scope.run(() => useDirtyLeaveGuard({ dirty, confirm, beforeUnloadTarget: null }))
    if (!guard) throw new Error('Expected leave guard scope')

    expect(guard.blocked.value).toBe(true)
    await expect(guard.canLeave('programmatic')).resolves.toBe(true)
    expect(confirm).toHaveBeenCalledWith({ reason: 'programmatic' })
    guard.dispose()
    guard.dispose()
    expect(guard.blocked.value).toBe(false)
    await expect(guard.canLeave()).resolves.toBe(true)
    scope.stop()
  })
})
