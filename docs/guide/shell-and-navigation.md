# Shell and navigation

`VaAppShell` composes a responsive drawer, application header, command palette, user actions, and
content region. Navigation is data, not markup.

```ts
import type { NavigationItem } from '@vela-admin/shell'

const navigation: readonly NavigationItem[] = [
  {
    id: 'operations',
    label: 'Operations',
    kind: 'section',
    children: [
      { id: 'orders', label: 'Orders', href: '/orders', icon: orderIcon },
      { id: 'customers', label: 'Customers', href: '/customers', icon: peopleIcon },
    ],
  },
]
```

Use `kind: 'section'` for always-visible navigation headings, `kind: 'group'` for collapsible
branches, and `kind: 'link'` when explicit classification improves readability. Links and groups
remain inferred when `kind` is omitted, preserving concise schemas.

The application owns routing. Handle `navigate` and translate an item into Vue Router, Nuxt, or a
custom host action. This keeps the package usable without a router dependency.

## Persisted workspace layout

Shell presentation remains independent of routes and permissions. Create a controller with any
`StorageAdapter`, then bind its immutable preferences to the Shell:

```ts
import { createShellPreferencesController } from '@vela-admin/shell'

const shell = createShellPreferencesController({ storage })
```

```vue
<VaAppShell
  :content-spacing="shell.preferences.value.contentSpacing"
  :content-width="shell.preferences.value.contentWidth"
  :header-style="shell.preferences.value.headerStyle"
  :layout="shell.preferences.value.layout"
/>

<VaAppearanceSettings :controller="appearance" :shell-controller="shell" />
```

`layout` supports full sidebar, compact rail, and horizontal top navigation. Grouped schemas are
flattened into scrollable top destinations without modifying the source navigation. Content can
be centered or fluid, the header can float or attach to the viewport, and workspace padding can be
compact, comfortable, or spacious independently of component density. These settings use a
versioned, migratable storage envelope; they never grant access or rewrite navigation data.

## Responsive contract

- desktop uses a persistent navigation region;
- narrow screens use a temporary drawer and retain the same accessible names;
- top navigation remains horizontally scrollable instead of hiding destinations;
- optional header-action slots yield to primary controls on phone widths;
- command search is keyboard accessible and filters labels plus keywords;
- products decide whether workspace tabs and breadcrumbs are present through slots and companion
  components.

Permission filtering belongs at the application boundary: transform navigation through the
product's permission adapter before passing it to the Shell. Use `@vela-admin/access` when the app
also needs reactive access boundaries and route guards; the Shell itself stays router-neutral.
