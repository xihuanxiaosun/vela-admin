# @vela-admin/forms

Form state, schema-driven rendering, centered form dialogs, synchronous and asynchronous
validation, record/payload mapping, cancellable load and submit workflows, server-error mapping,
dirty tracking, and navigation guards for Vela Admin Kit.

```bash
pnpm add @vela-admin/forms @vela-admin/ui vue vuetify
```

```ts
import {
  createFormDataMapper,
  useFormWorkflow,
  VaFormDialog,
  type FormSchema,
} from '@vela-admin/forms'
import '@vela-admin/forms/styles.css'
```

`FormSchema` owns field type, options, visibility, and responsive grid spans (`cols`, `sm`, `md`,
`lg`, `xl`). It deliberately does not contain URLs. `useFormWorkflow()` injects a host adapter for
load, record-to-values mapping, values-to-payload mapping, and submit. `createFormDataMapper()` is
the declarative convenience for differently named echo and submit fields. Image and file fields use
the custom field registry; their `UploadResult` can remain in form state while the mapper serializes
only the backend key or URL. `recordPath: false` preserves local-only initial state, while
`submitPath: false` omits a loaded display value from the outgoing payload. See the form workflow
guide for the complete pattern.

`useFormDraft()` persists versioned, migratable work in progress through an injected
`StorageAdapter`; `VaFormDraftNotice` and `VaFormDialog` provide localized restore/discard UI without
coupling forms to `localStorage`. Licensed under MIT.
