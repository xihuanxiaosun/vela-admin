# Getting started

## Requirements

- Node.js 22.12 or newer
- pnpm 10 (the exact version is pinned through Corepack)
- Vue 3.5 or newer
- Vuetify 4
- TypeScript with strict mode recommended
- Vite 8 for the reference setup

## Run the reference application

After cloning the repository, the Starter runs without an environment file or external backend:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The default authenticated HTTP workflow is backed by an in-browser API simulator. Replace the
transport composition in `apps/starter/src/data/user-services.ts` when connecting a production API.
Use `pnpm playground:dev` for the component catalog and `pnpm docs:dev` for this documentation.

Vela packages are independent. Install the theme and only the patterns your application needs.

```bash
pnpm add vuetify @mdi/js @vela-admin/theme @vela-admin/locale @vela-admin/ui
```

## Configure Vuetify

```ts
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { createVelaLocale } from '@vela-admin/locale'
import { createVelaPreset } from '@vela-admin/theme'
import { createVelaFeedback } from '@vela-admin/ui'
import 'vuetify/styles'
import '@vela-admin/theme/styles.css'
import '@vela-admin/ui/styles.css'

import App from './App.vue'

const app = createApp(App)
app.use(createVuetify(createVelaPreset()))
app.use(createVelaLocale())
app.use(createVelaFeedback())
app.mount('#app')
```

`createVelaPreset()` provides semantic light and dark themes, SVG icon aliases, density-aware
Vuetify defaults, and stable visual tokens. Pass `defaults` or `theme` overrides when a product needs
a different baseline.

Wrap the rendered application with `VelaLocaleProvider`. This keeps framework copy, Vuetify's
locale context, RTL direction, and the browser document language synchronized. See
[Localization and RTL](./localization.md).

## Add runtime appearance

Persist preferences through an adapter instead of reading storage inside components.

```ts
import { createWebStorageAdapter } from '@vela-admin/adapters'
import { useVelaAppearance } from '@vela-admin/theme'

const appearance = useVelaAppearance({
  storage: createWebStorageAdapter(window.localStorage, { namespace: 'my-admin' }),
})
```

Wrap the application in `VDefaultsProvider` with `appearance.vuetifyDefaults.value`, then mount
`VaAppearanceSettings` wherever the Shell exposes settings.

Import each installed visual package's published stylesheet once. For example, applications using
the Shell and data-page package also import `@vela-admin/shell/styles.css` and
`@vela-admin/data/styles.css`.

## Development repository

The monorepo keeps published packages separate from examples:

```text
apps/playground   interactive examples and visual fixtures
apps/docs         this documentation site
apps/starter      copyable reference app with HTTP and permission examples
packages/*        publishable framework packages
tooling/*         shared build configuration
```

Use `apps/starter` as the baseline for a new product. It contains the Vuetify preset, Shell,
runtime appearance controller, router, feedback Host, and a complete user-management reference
workflow. The workflow uses an authenticated HTTP repository against a replaceable in-browser API
simulator, plus route, navigation, action, and API-side permissions. Connect the repository to your
API without changing the DataPage or FormDialog composition. Playground content, visual-test
controls, and published-package fixtures remain separate. See
[Reference user workflow](./starter-user-workflow.md).

Install the Playwright browser once with `pnpm test:e2e:install`, then run the complete local gate
with `pnpm check`. Run `pnpm check:security` separately before publishing a release.
