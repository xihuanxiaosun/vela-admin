# Forms and validation

## Typed controller

`useForm<TValues>()` owns values, initial values, dirty state, field errors, async validation,
submission, cancellation, and reset. It does not require a particular schema library.

```ts
interface Profile {
  name: string
  email: string
}

const form = useForm<Profile>({
  initialValues: { name: '', email: '' },
  validation: createRuleValidationAdapter<Profile>({
    fields: {
      name: [required(), maxLength(80)],
      email: [required(), email()],
    },
  }),
})
```

The submit handler receives a cloned value object, an `AbortSignal`, and a field-error setter.
Aborted or superseded work cannot mutate a newer submission.

Call `form.commit()` after a successful save to make the current values the new clean baseline.
`reset()` restores that baseline; `reset(nextValues)` replaces it with a freshly loaded record.

## Schema builder

`VaFormBuilder` maps typed field descriptors to Vuetify controls, supports responsive column spans,
conditional visibility and read-only state, grouped sections, help text, value transforms, static or
abortable async options, and custom slots. Built-in renderers cover text, password, email, telephone,
URL, textarea, number, select, autocomplete, combobox, checkbox, switch, radio, slider, date, and
datetime fields. Keep payload mapping outside the builder so UI schemas do not become backend
contracts.

Override a field without forking the builder through `#field-<key>`. The slot receives `field`,
`value`, `disabled`, `readonly`, `errorMessages`, option state, `reloadOptions()`, `update(value)`,
and `blur()`.

Use a renderer registry for a stable product-specific control instead of adding page-local branches:

```ts
const registry = createFormFieldRegistry({
  money: { component: MoneyInput },
})

const price = {
  key: 'price',
  kind: 'custom',
  renderer: 'money',
  label: 'Price',
}
```

Async option sources receive current values, search text, and an `AbortSignal`. `dependsOn` reloads
dependent choices, `minQueryLength` protects broad searches, and caching/debounce remain configurable
per field. Configuration errors such as an unknown renderer fail during development instead of
silently falling back to an incorrect input.

## Unsaved-change protection

`useDirtyLeaveGuard()` owns the browser `beforeunload` contract and deduplicates async confirmation.
It stays router-agnostic: pass `guard.canLeave()` to Vue Router, TanStack Router, or the host
application's navigation callback.

```ts
const leaveGuard = useDirtyLeaveGuard({
  dirty: form.dirty,
  confirm: () =>
    feedback.confirm({
      title: 'Discard unsaved changes?',
      message: 'Your edits have not been saved.',
      confirmText: 'Discard changes',
      intent: 'danger',
    }),
})

router.beforeEach(() => leaveGuard.canLeave())
```

Browsers deliberately control the copy shown for a tab close or reload. In-app navigation uses the
provided async confirmation and can therefore use Vela's centered confirm UI.

## Recoverable form drafts

`useFormDraft()` persists work in progress through an injected `StorageAdapter`; it never reads
`localStorage` directly. Draft envelopes are versioned, debounced, serially written, and can be
migrated when a schema changes. Discovery is manual by default so a product decides whether an old
draft is safe to restore. Set `autoRestore` only for workflows where restoring without a user choice
is appropriate.

```ts
const draft = useFormDraft({
  form,
  storage: preferencesStorage,
  storageKey: `users.edit.${userId}`,
  schemaVersion: 2,
  migrate: (oldDraft) => migrateUserDraft(oldDraft),
})
```

Pass the controller to `<VaFormDialog :draft="draft">` to render the localized restore/discard
notice. Call `form.commit()` after a successful save; the default `clearWhenPristine` policy then
removes the stored draft. Call `draft.flush()` before an application-controlled shutdown when the
storage adapter writes asynchronously.

## Validation adapters

Built-in rules cover required values, email, text lengths, numeric bounds, integers, and patterns.
Add async or cross-field rules through the
same `FormValidationAdapter` contract, or bridge Zod, Valibot, Yup, a server endpoint, or a product
validator. Normalize backend validation errors into `FieldErrors` and pass them to
`setFieldErrors()`.

`composeValidationAdapters()` combines independent product and domain validators while preserving
all field messages and cancellation.

Never hide a server error behind a toast when it belongs to a specific field.

## Localized rule factories

The standalone `required()`, `email()`, `minLength()`, and `maxLength()` functions keep stable
English defaults and accept explicit messages. Inside component setup, use `useValidationRules()`
to resolve fallback copy from the current application locale:

```ts
const rules = useValidationRules()

const validation = createRuleValidationAdapter({
  fields: {
    name: [rules.required(), rules.maxLength(80)],
    email: [rules.required(), rules.email()],
  },
})
```

For schemas built outside setup or on an SSR server, call `createValidationRules(locale)` with the
request-scoped locale controller.
