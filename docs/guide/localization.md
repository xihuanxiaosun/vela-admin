# Localization and RTL

Vela provides an application-scoped locale controller instead of a process-global mutable
singleton. It localizes framework copy, synchronizes Vuetify's locale and RTL context, and updates
the document `lang` and `dir` attributes in the browser.

English (`en`) and Simplified Chinese (`zh`, `zh-CN`) framework catalogs ship with the package.
Application-owned navigation, field labels, domain vocabulary, and backend messages remain
injected by the host rather than being baked into reusable components.

That boundary is deliberate: installing the framework catalog translates Vela controls, but it
cannot translate a product's menus, table columns, statuses, or API vocabulary. A complete product
switch therefore registers an application catalog as well.

`createVelaPreset()` also registers Vuetify's native English and Simplified Chinese catalogs, so
the provider changes both Vela and Vuetify controls together. Register additional native Vuetify
catalogs when adding another language:

```ts
import { ar } from 'vuetify/locale'

createVelaPreset({
  vuetify: { locale: { messages: { ar }, rtl: { ar: true } } },
})
```

## Install the controller

```ts
import { createApp } from 'vue'
import { createVelaLocale } from '@vela-admin/locale'

const locale = createVelaLocale({
  locale: 'en-GB',
  fallbackLocale: 'en',
  messages: {
    'en-GB': {
      'data.pager.rowsPerPage': 'Rows per page',
    },
  },
})

createApp(App).use(locale).mount('#app')
```

## Register product copy

Keep application messages beside the application rather than adding business terms to the
framework package:

```ts
const english = {
  'app.nav.users': 'Users',
  'app.users.status.active': 'Active',
  'app.users.column.email': 'Email',
}

const simplifiedChinese = {
  'app.nav.users': '用户',
  'app.users.status.active': '正常',
  'app.users.column.email': '邮箱',
} satisfies Record<keyof typeof english, string>

locale.registerMessages('en', english)
locale.registerMessages('zh-CN', simplifiedChinese)
```

Schemas and navigation definitions that contain translated copy must be reactive. Creating them
once at module evaluation time leaves stale English labels after a locale change:

```ts
const columns = computed(() => [
  { key: 'email', title: locale.t('app.users.column.email') },
  {
    key: 'status',
    title: locale.t('app.users.column.status'),
    presentation: {
      kind: 'status',
      values: {
        active: { label: locale.t('app.users.status.active'), tone: 'success' },
      },
    },
  },
])
```

Apply the same rule to navigation and breadcrumbs, workspace tabs, filter labels and options,
table headers and semantic cell labels, row actions, form schemas and validation, feedback, empty
states, and date/number formatting. Proper names, identifiers, email addresses, and backend enum
values stay stable; translate only their presentation.

Mount `VelaLocaleProvider` inside Vuetify and above Vela components:

```vue
<script setup lang="ts">
import { VelaLocaleProvider } from '@vela-admin/locale'
</script>

<template>
  <VelaLocaleProvider>
    <RouterView />
  </VelaLocaleProvider>
</template>
```

Changing `locale.setLocale('ar')` infers RTL for common RTL languages. Pass an explicit second
argument when a product has a different direction policy. The provider updates Vuetify at the same
time, so menus, field adornments, pagination, tables, and logical CSS properties change direction
together.

## Bring an existing i18n system

Use the `translate` adapter to bridge vue-i18n, an internal translation service, or server-loaded
message catalogs:

```ts
const locale = createVelaLocale({
  locale: i18n.global.locale.value,
  translate: (key, { parameters }) =>
    i18n.global.te(key) ? String(i18n.global.t(key, parameters)) : undefined,
})
```

Vela's English catalog remains the final fallback. Product labels, navigation labels, backend
messages, and domain vocabulary remain application-owned.

## Acceptance checklist

A language is ready when a browser-level test switches locale without reloading and verifies:

- the document `lang` and `dir` attributes;
- Shell navigation, breadcrumbs, command search, tabs, and settings;
- filters, options, table headers, semantic cell labels, actions, and pagination;
- forms, validation, dialogs, toast/loading copy, empty/error states, and uploads;
- locale-aware dates, relative times, numbers, and currencies;
- native Vuetify controls and application-owned copy change together.

The Playground includes this end-to-end check for English and Simplified Chinese. Catalog key
parity is also enforced with TypeScript's `satisfies Record<...>` so a new English key cannot omit
its Chinese counterpart.

## Non-component factories

Rules and queues created outside component setup accept an explicit controller or resolved copy.
This keeps them deterministic in tests and isolated between SSR requests:

```ts
const rules = createValidationRules(locale)
const uploadRules = createUploadValidators(locale)

const queue = createUploadQueue({
  adapter,
  messages: {
    cancelled: locale.t('upload.error.cancelled'),
    failed: locale.t('upload.error.failed'),
  },
})
```

Inside setup, `useValidationRules()`, `useUploadValidators()`, and `useUploadQueue()` resolve the
same values from the nearest application provider.

## SSR boundary

Create one locale controller per SSR application or request. Pass `root: null` when constructing a
controller in a non-browser environment; browser document access is guarded and never occurs at
module evaluation time.
