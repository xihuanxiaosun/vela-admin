# @vela-admin/data

Configuration-driven data pages for Vela Admin Kit: adaptive server tables, semantic column
sizing, pointer/keyboard column resizing, safe CSV export, filters, paging, selection, column
preferences, request cancellation, and async states.

```bash
pnpm add @vela-admin/data @vela-admin/ui vue vuetify
```

```ts
import { VaDataPage, createCsvDocument, useDataPage, type DataColumn } from '@vela-admin/data'
import '@vela-admin/data/styles.css'
```

For viewport-bound list pages, mark the navigation item with `pageMode: 'workspace'` and use
`<VaDataPage fill-height>`. Put the filter rail in `#filters` and export, refresh, bulk actions, and
column preferences in `#toolbar`; the component then keeps its pager visible while only the table
body scrolls. Fixed numeric heights remain available for embedded cards and document pages.

Column schemas support `fixed`, bounded `content`, and bounded `fill` sizing. A fill column absorbs
space only up to its declared maximum, so an identity column cannot starve later fields on a wide
screen. The first and last ordinary columns are not fixed by default. Bounded action columns keep
stable end-fixed metadata so header and body cannot diverge; their separator and shadow appear only
after real horizontal overflow is measured. Table density inherits the application setting unless
a page passes `density` explicitly.

Use `presentation` for recurring business cells while keeping named slots as the final escape hatch:

```ts
const columns: readonly DataColumn<Account>[] = [
  {
    key: 'name',
    title: 'Account',
    role: 'identity',
    value: (account) => ({
      primary: account.name,
      secondary: `#${account.id} · ${account.region}`,
      image: account.avatarUrl,
    }),
    presentation: { kind: 'identity' },
  },
  {
    key: 'revenue',
    title: 'Revenue',
    dataType: 'currency',
    presentation: { kind: 'currency', currency: 'GBP', locale: 'en-GB' },
  },
  { key: 'actions', title: 'Actions', role: 'actions' },
]
```

Identity, media, number, currency, date/time, status, boolean, progress, and trend presentations
create consistent information hierarchy without page-local cell markup. Their accessors assemble
backend-neutral view values; named slots remain the escape hatch for truly domain-specific visuals.
Header tint, row
hover/focus/selection feedback, filters, and paging remain theme-driven. `VaPager` supports page,
offset, and cursor metadata, a compact page-size selector, and a bounded page-jump field for long
result sets. `useDataQueryState` adds optional URL/router synchronization and `useSavedViews` stores
named query/display snapshots through injected adapters. The Playground includes user, finance,
moderation, and a 1,280-row, 19-column stress case.
Licensed under MIT.
