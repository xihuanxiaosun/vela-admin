# @vela-admin/shell

A responsive Vuetify application shell with navigation, header actions, command search, workspace
tabs, versioned layout and spacing preferences, appearance settings, breadcrumbs, mobile drawer
behavior, and RTL support.

```bash
pnpm add @vela-admin/shell @vela-admin/theme @vela-admin/ui vue vuetify
```

```ts
import {
  VaAppShell,
  VaWorkspaceTabs,
  createShellPreferencesController,
  useWorkspaceTabs,
  type NavigationItem,
} from '@vela-admin/shell'
import '@vela-admin/shell/styles.css'
```

Navigation items can declare `pageMode: 'workspace'` for viewport-bound operational pages. Both
workspace and scrolling `document` pages honor the same boxed/fluid content-width preference;
page mode only decides height and scroll ownership. The header, workspace tabs, and page content
share the same width boundary. The shell derives compact breadcrumbs from the active navigation
path. `useWorkspaceTabs()` provides router-neutral visited-tab state, while the host remains
responsible for URL synchronization.

Routing remains host-owned and can use Vue Router, Nuxt, or a custom adapter. Licensed under MIT.
