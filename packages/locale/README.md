# @vela-admin/locale

Application-scoped localization and text-direction control for Vela Admin Kit, with Vuetify locale
integration and SSR-safe controller creation.

```bash
pnpm add @vela-admin/locale vue vuetify
```

```ts
import { createVelaLocale, VelaLocaleProvider } from '@vela-admin/locale'
```

Create one controller per application or SSR request. Licensed under MIT.

English and Simplified Chinese framework messages ship with the package. Register or override
business copy per application; missing keys fall back to English. `VelaLocaleProvider` also passes
the active locale and text direction into Vuetify, including RTL locales.

Framework messages cover reusable controls only. Register product navigation, filters, columns,
statuses, forms, and feedback with `registerMessages()`, and build translated configuration from
`computed()` so a live locale change cannot leave stale labels. See the localization guide for the
catalog-parity pattern and browser acceptance checklist.
