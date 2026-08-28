# Viewport-bound data workspaces

Use a workspace page for operational lists that should keep filters, tools, and pagination visible
while rows scroll internally. This is a coordinated Shell and Data contract, not a page-specific
height calculation.

```ts
const navigation = [
  {
    id: 'users',
    label: 'Users',
    href: '/users',
    pageMode: 'workspace',
  },
] satisfies readonly NavigationItem[]
```

```vue
<VaDataPage
  :columns="columns"
  fill-height
  :items="items"
  :pagination="pagination"
  @paginate="query.pagination = $event"
>
  <template #filters>
    <VaFilterBar :fields="filterFields" :model-value="filters" @apply="applyFilters" />
  </template>
  <template #toolbar>
    <VaButton appearance="outline" @click="exportRows">Export</VaButton>
    <VaButton :loading="refreshing" @click="refresh">Refresh</VaButton>
    <VaColumnManager :controller="columnPreferences" />
  </template>
</VaDataPage>
```

The Shell bounds the workspace to the available viewport while continuing to honor the user's
`boxed` or `fluid` content-width preference. Workspace mode controls height and scroll ownership;
it never silently overrides content width. `VaDataPage` allocates fixed rows for filters, tools, and
pager, then gives all remaining height to the internal Vuetify table wrapper. Use the normal
`height` prop instead of `fill-height` when a table is embedded inside a scrolling report or card.

Table density inherits the global Vuetify/Vela preference. Pass `density="compact"`,
`"comfortable"`, or `"default"` only when a specific operational page has a documented reason to
override it. Column `min` and `max` values are content contracts, not viewport percentages; the
bounded fill column absorbs useful surplus without pushing later columns into unreadable widths.
