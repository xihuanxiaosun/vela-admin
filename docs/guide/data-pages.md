# Data pages

Vela separates query state, backend adaptation, filters, table presentation, actions, and paging so
each part can evolve without duplicating page logic.

## Table column policy

Every `DataColumn` declares meaning rather than arbitrary pixels:

```ts
const columns: DataColumn<Account>[] = [
  {
    key: 'name',
    title: 'Account',
    role: 'identity',
    sizing: { mode: 'fill', min: 220, max: 320 },
    value: (account) => ({
      primary: account.name,
      secondary: `#${account.id} · ${account.region}`,
      image: account.avatarUrl,
    }),
    presentation: { kind: 'identity' },
  },
  { key: 'email', title: 'Email', sizing: { mode: 'content' }, overflow: 'ellipsis' },
  { key: 'status', title: 'Status', role: 'status', align: 'center' },
  { key: 'revenue', title: 'Revenue', dataType: 'currency' },
  { key: 'actions', title: 'Actions', role: 'actions' },
]
```

The layout engine applies these rules:

- the first and last columns are **not fixed by default**;
- one identity or explicitly declared `fill` column absorbs surplus space on wide tables;
- content columns receive bounded semantic widths instead of growing with one long value;
- number, currency, date, status, and action roles infer appropriate alignment;
- an action role opts into a bounded, structurally stable end pin so Vuetify never reconciles a
  fixed header separately from its body cells; `pin: 'none'` remains an explicit escape hatch;
- the action divider and directional shadow appear only after `ResizeObserver` confirms meaningful
  horizontal overflow and only while more content exists beneath that boundary;
- internal vertical and horizontal scrolling keeps the header and pager reachable.
- data columns are resizable by pointer or keyboard; widths are clamped, emitted as schema-neutral
  preferences, and reset by double-clicking the separator;

Use `presentation` to express recurring information hierarchy instead of rebuilding cell markup in
every page. The first release includes identity, media, number, currency, date/time, status,
boolean, progress, and trend renderers. Accessors assemble backend-neutral view values instead of
exposing a DTO shape. Currency and trend values use `Intl.NumberFormat`, including correct sign and
currency-symbol ordering; progress exposes an accessible name and value; status/boolean mappings
keep domain values separate from labels, icons, and semantic tones.

```ts
const operationalColumns: readonly DataColumn<Order>[] = [
  {
    key: 'service',
    title: 'Service',
    value: (row) => ({ primary: row.serviceName, secondary: row.category, image: row.cover }),
    presentation: { kind: 'media', fallbackIcon: '$image' },
  },
  {
    key: 'net',
    title: 'Net',
    presentation: { kind: 'currency', currency: 'GBP', locale: 'en-GB', toneBySign: true },
  },
  {
    key: 'reconciliation',
    title: 'Reconciliation',
    value: (row) => ({ value: row.percent, secondary: row.stage, tone: row.tone }),
    presentation: { kind: 'progress', max: 100 },
  },
  {
    key: 'movement',
    title: 'Movement',
    value: (row) => ({ value: row.net, delta: row.changePercent }),
    presentation: { kind: 'trend', currency: 'GBP', locale: 'en-GB' },
  },
]
```

A named `item.<key>` slot still overrides the renderer for genuinely domain-specific charts,
ratings, or compound actions.

This handles both extremes: short content does not produce a comically stretched table, and one
very long value does not dictate the width of every row. Use `ellipsis`, `wrap`, or `clip` per
column; ellipsis cells use `VaOverflowText`, which only enables a tooltip when the rendered text is
truly truncated. Mobile tables retain every field and use lossless horizontal scrolling in the
first stable release.

## Request lifecycle

`useDataPage()` coordinates filters, sorting, pagination, refresh, cancellation, keep-previous-data,
and async view state. Changing page size resets the page; changing filters cancels stale requests.

The UI must distinguish:

- first load (skeleton);
- background refresh (retain rows and show a subtle loading signal);
- empty data versus filtered empty data;
- recoverable request errors;
- offline and dependency-unavailable states.

## Shareable query state and saved views

`useDataQueryState()` owns filter, search, sort, and pagination transitions. Filters, search, and
sort reset to the first valid page automatically. Attach a `StateSyncAdapter` when the view should
hydrate from and write to a URL, desktop shell, or host router; without one it remains a local
controller. Writes are serialized and `popstate` subscriptions remain adapter-owned.

```ts
const codec = createDataQuerySearchParamsCodec({
  defaults: initialQuery,
  filters: { status: { type: 'string' }, assigned: { type: 'boolean' } },
  allowedSortKeys: ['createdAt', 'status'],
})

const queryState = useDataQueryState({
  initialQuery,
  sync: createUrlStateAdapter({ codec, location: window.location, history: window.history }),
})
```

The URL codec preserves unrelated query parameters and supports page, offset, and cursor modes.
`useSavedViews()` persists named snapshots through an injected `StorageAdapter`; it supports
create, update, rename, delete, default-view selection, schema-independent state cloning, and a
maximum-view policy. `VaSavedViewPicker` is the optional centered UI for the controller. A saved
view can include query state plus column visibility/order/widths without putting those details in
the backend contract.

## Pagination adapters

The query layer can emit page/page-size, offset/limit, or cursor requests. Response adapters can
read `data.list`, `items`, `records`, or another configured path without teaching the table about
the backend envelope.

`VaPager` consumes the returned `PaginationMeta` union and emits a normalized `PaginationRequest`:

```vue
<VaDataPage
  :columns="columns"
  :items="page.items"
  :pagination="page.pagination"
  @paginate="query.pagination = $event"
/>
```

- numbered page metadata renders direct page navigation;
- offset metadata works with or without a known total;
- cursor metadata keeps tokens opaque and emits forward/backward requests;
- changing the page size resets page/offset/cursor position rather than reusing an invalid token.

## Column preferences and cross-page selection

`useColumnPreferences()` stores ordering and visibility through an injected `StorageAdapter`.
Schema changes are reconciled at hydration time, action/selection columns are structural by
default, and a user cannot hide the last configurable data column. It also stores bounded custom
widths without making pixels part of the backend contract. `VaColumnManager` is the
optional UI for that controller; the table renderer never reads `localStorage` itself.

```vue
<VaDataPage
  :columns="columnPreferences.visibleColumns.value"
  @column-resize="columnPreferences.setWidth($event.key, $event.width)"
  @column-resize-reset="columnPreferences.resetWidth($event)"
/>
```

## Safe CSV export

`createCsvDocument()` is a pure export primitive. It follows visible column schemas, skips action
and selection columns, supports nested paths and per-column formatters, quotes cells correctly,
and escapes spreadsheet formulas by default. It returns text instead of creating a hidden DOM
node so applications remain free to download, upload, encrypt, or stream the result.

`useCrossPageSelection()` supports two serializable states:

```ts
{ mode: 'explicit', keys: [12, 24] }
{ mode: 'all', total: 2341, except: [91] }
```

The second form selects a complete filtered result without downloading thousands of IDs. Pass a
filter/sort fingerprint as `scope` so a changed query clears stale selection while ordinary page
navigation preserves it. `VaSelectionBar` exposes the selected count, “select all matching”, and
clear actions without coupling bulk operations to a particular API.

For the detailed evidence and alternatives, read [Adaptive table research](/reference/table-engine-research)
and [ADR 0006](/architecture/0006-adaptive-table-layout).
