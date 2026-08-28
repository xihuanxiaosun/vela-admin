# ADR 0006: Adaptive table sizing, alignment, overflow, and pinning

- Status: Accepted
- Date: 2026-08-26

## Context

Column width is not a single number. A useful table must balance intrinsic content width, header
width, available container space, minimum readability, maximum scan distance, user resizing,
horizontal overflow, responsive presentation, and sticky columns. Naive fixed widths create empty
space when values are short and truncation when values are long. Pinning the first and last columns
by default wastes space and obscures content when a table does not overflow.

Vuetify 4 already exposes column alignment, `width`, `minWidth`, `maxWidth`, and logical
`fixed: 'start' | 'end'` metadata and calculates fixed offsets. Element Plus distributes remaining
width across flexible columns when `fit` is enabled but still requires fixed columns to be declared.
TanStack Table models sizing and logical start/end pinning separately. Vela adopts the useful
policies without introducing a second rendering engine.

## Decision

### 1. Default layout behavior

The default table layout is `adaptive`:

- no start or end column is pinned by default;
- the table fills its container;
- content columns use intrinsic width constrained by semantic minimum and maximum sizes;
- one declared `fill` column absorbs useful remaining width up to its semantic maximum;
- if no fill column is declared, the first eligible primary text column becomes the fill column;
- when constrained minimum widths exceed the viewport, the body scrolls horizontally;
- widths are not inferred from the entire remote data set.

The table also supports a `content` layout mode that disables automatic fill-column selection.
Individual columns may still declare `content`, `fill`, or `fixed` sizing in either layout mode.

### 2. Column sizing contract

Public columns use intent instead of a single ambiguous width:

```ts
type ColumnSizing =
  | { mode: 'content'; min?: number; max?: number }
  | { mode: 'fill'; min?: number; max?: number }
  | { mode: 'fixed'; size: number }

type ColumnPinning = 'none' | 'start' | 'end' | 'auto-end'

interface DataColumn<T> {
  key: string
  title: string
  value?: keyof T | ((item: T) => unknown)
  role?: 'identity' | 'data' | 'status' | 'selection' | 'actions'
  dataType?:
    | 'text'
    | 'number'
    | 'currency'
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'status'
    | 'media'
    | 'progress'
    | 'trend'
  sizing?: ColumnSizing
  pin?: ColumnPinning
  overflow?: 'ellipsis' | 'wrap' | 'clip'
  align?: 'start' | 'center' | 'end'
  priority?: number
}
```

Numeric token values are resolved by the layout policy and may be overridden by an application
theme. Page components do not embed repeated visual widths; a schema declares a different bound
only when its business content requires one.

### 3. Alignment inference

Explicit alignment always wins. Otherwise:

- text, identity, media, progress, date, and datetime values align to logical start;
- numbers, currency, and trends align to logical end using tabular numerals;
- boolean and status values align to center;
- selection and action controls align to center;
- header alignment follows cell alignment unless explicitly overridden.

Logical `start` and `end` are used instead of physical left and right so RTL remains correct.

### 4. Structurally stable action-column pinning

An action column declares `role: 'actions'`. It defaults to `pin: 'auto-end'`. Vela emits bounded
end-fixed header metadata from the first render so Vuetify never reconciles the header before body
cells after an asynchronous overflow measurement. When the table fits, that structural metadata is
visually inert; separators and elevation appear only when all of these conditions are true:

1. the scroll container has meaningful horizontal overflow after layout;
2. the action column is visible;
3. the active responsive presentation is a table rather than cards;
4. pinning is not disabled globally or with `pin: 'none'` on that column;
5. the column has a bounded width.

Vuetify calculates fixed offsets from numeric column widths. Therefore an automatically pinned
action column must resolve to a numeric width before pinning; content-only width is not sufficient
for stable offsets.

Overflow is observed with `ResizeObserver` on the scroll container and a scheduled measurement of
`scrollWidth` versus `clientWidth`. A small tokenized tolerance prevents sub-pixel oscillation. The
state controls only overflow affordances, not header metadata, and is recalculated after columns,
density, fonts, container size, or action visibility changes.

The sticky boundary uses logical CSS inset properties. A divider or shadow appears only when
content actually scrolls beneath the pinned column. The first column is never auto-pinned.

### 5. Bounded row actions

`VaRowActions` keeps the action column measurable:

- display a configurable number of high-priority actions directly;
- move remaining actions into an overflow menu;
- use icon buttons with accessible labels at narrow widths;
- keep destructive actions semantically distinct;
- never allow an unbounded list of text buttons to determine table width.

The action column resolves to a bounded fixed size because its visible action count and control
sizes are bounded by design tokens.

### 6. Long and short content

- Short-content columns use `content` sizing and do not receive equal shares of unused width.
- The fill column absorbs surplus width only up to its maximum, without forcing every column to
  look oversized or starving later fields.
- Long text uses a declared maximum plus ellipsis or wrapping. `VaOverflowText` observes rendered
  dimensions and enables its tooltip only after actual truncation is detected.
- A preferred width is not treated as immutable. Only `fixed` mode guarantees an exact width.
- Identifiers and dates default to no-wrap; descriptions default to bounded wrap or ellipsis.
- User resizing persists as an explicit user override and does not mutate the schema.

### 7. Column resizing and export

Resizable data columns expose a semantic separator in each header. Pointer dragging previews the
width locally; Arrow keys change it by the tokenized step; Home and End select declared bounds;
double-click resets the override. Selection and action columns remain non-resizable unless a
schema opts in explicitly. Committed widths are emitted and can be stored by
`useColumnPreferences()` through any `StorageAdapter`; the table itself never reads browser
storage.

CSV export is a pure transformation over the same visible column schema. Structural columns are
excluded, nested values and formatters are supported, and spreadsheet formulas are escaped by
default. Download behavior stays host-owned so browser, SSR, desktop, and encrypted workflows can
reuse the same document builder.

### 8. Responsive presentation

The first stable release uses one lossless mobile strategy: retain all columns and scroll the table
horizontally. This avoids silently hiding data and keeps one column schema across breakpoints.
Priority-column and card presentations remain planned extensions; they will ship only after a row
detail contract can guarantee that hidden values and row actions remain discoverable. Action
pinning can be disabled per table or column; overflow-only styling never appears when the table
fits.

## Implementation constraints

- Use Vuetify's existing table engine and header metadata; do not fork its renderer.
- Do not add TanStack Table to the first release solely for column sizing or pinning.
- Prefer browser table layout and a single container observer over measuring every cell.
- Do not scan every row to derive widths. Optional sampling may inspect rendered rows only and
  must remain bounded.
- Keep layout state separate from server query, sort, filter, and selection state.
- Persist user column preferences through an injected storage adapter once the column-preference
  module is enabled; never bind persistence directly to `localStorage` inside the renderer.

## Required test matrix

1. One short column in a wide container.
2. Several short columns whose intrinsic width is smaller than the container.
3. One unbounded text value with ellipsis and with wrap.
4. Many columns that create horizontal overflow.
5. Auto-end action column with and without overflow.
6. No action column and explicitly disabled auto-pinning.
7. Hidden, reordered, and resized columns.
8. RTL with start/end pinning.
9. Container resize, density change, and late font load.
10. Desktop and mobile horizontal-scroll behavior without hidden values.
11. Empty, loading, refreshing, and error states without layout jumps.
12. Keyboard focus while horizontally scrolling past a pinned column.

## Consequences

Tables remain visually balanced with short data, readable with long data, and predictable under
overflow. Automatic behavior is constrained by explicit semantics and can always be overridden.
The policy requires more tests than fixed widths but removes repeated page-level CSS and fragile
manual pinning decisions.
