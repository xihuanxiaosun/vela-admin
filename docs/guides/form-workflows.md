# Configuration-driven form dialogs

Vela separates four concerns that are often coupled in admin pages:

1. `FormSchema` describes fields, conditional visibility, options, and responsive layout.
2. A validation adapter owns client and server-compatible rules.
3. A form-data mapper translates record fields to form values and form values to submit payloads.
4. A workflow adapter loads and submits through the host's transport.

The schema never contains endpoint URLs, HTTP verbs, authentication, or response envelopes.

```ts
interface UserValues {
  name: string
  teamId: number | null
  avatar: UploadResult<{ key: string }> | null
}

const mapper = createFormDataMapper<UserValues, UserRecord, UpdateUserPayload>({
  createValues: () => ({ name: '', teamId: null, avatar: null }),
  createPayload: () => ({ display_name: '', team_id: null, avatar_key: null }),
  fields: [
    { valuePath: 'name', recordPath: 'displayName', submitPath: 'display_name' },
    { valuePath: 'teamId', recordPath: 'team.id', submitPath: 'team_id' },
    {
      valuePath: 'avatar',
      recordPath: 'avatar',
      submitPath: 'avatar_key',
      deserialize: (value) => (value ? { value } : null),
      serialize: (value) => value?.value.key ?? null,
    },
  ],
})

const editor = useFormWorkflow({
  initialValues: mapper.fromRecord(emptyUserRecord),
  validation,
  adapter: {
    load: ({ key, signal }) => userRepository.detail(key, signal),
    toValues: mapper.fromRecord,
    toPayload: (values) => mapper.toPayload(values),
    submit: (payload, { mode, key, signal }) =>
      mode === 'create'
        ? userRepository.create(payload, signal)
        : userRepository.update(key, payload, signal),
  },
})
```

Set `recordPath: false` for local-only form state that must keep its initialized value. Set
`submitPath: false` for values that may be loaded and displayed but must not enter the payload.
Keeping those directions independent avoids accidental undefined hydration and supports read-only
echo fields without hidden request coupling.

```vue
<VaFormDialog
  v-model="open"
  :controller="editor"
  :schema="userSchema"
  title="Edit user"
  @submitted="refreshList"
/>
```

Fields default to a full row. Set `layout: { md: 6 }` for two columns from the medium breakpoint,
or combine `cols`, `sm`, `md`, `lg`, and `xl` for other compositions. Native text, numeric, select,
autocomplete, date, switch, radio, and related renderers are built in. Image/file inputs are
registered as custom renderers so the upload package stays independently replaceable. The workflow
handles stale-load cancellation, load/retry state, validation, normalized field errors, submission,
and committed dirty state; the host decides its actual repository or transport implementation.
