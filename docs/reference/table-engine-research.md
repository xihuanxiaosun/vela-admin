# Table engine research

Snapshot date: 2026-08-26.

## Vuetify 4.1.11

Vuetify's `DataTableHeader` supports logical start/end pinning, alignment, width, minimum width,
maximum width, nowrap behavior, and cell/header props. Its header parser calculates pinned offsets
from numeric widths. Multiple adjacent fixed columns require static widths for reliable offsets.

Vela uses this renderer and generates Vuetify headers from its semantic column schema. Bounded
action columns keep stable end-fixed header metadata from first render; measured container overflow
controls only the divider and directional shadow.

Sources:

- <https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VDataTable/types.ts>
- Installed `vuetify/lib/components/VDataTable/composables/headers.js`

## Element Plus

Element Plus defaults table `fit` to true. Fixed width columns remain fixed, while flexible columns
use minimum widths and receive remaining container width. If minimum widths exceed the container,
the table becomes horizontally scrollable. Pinning remains an explicit column option (`fixed`,
`left`, or `right`); the table does not infer an action column.

Source: <https://element-plus.org/en-US/component/table.html>

## TanStack Table

TanStack keeps column sizing, resizing, ordering, visibility, and pinning as separate state. Its
logical pinning APIs expose start/end offsets that map cleanly to sticky CSS and RTL. This is a
useful state-model reference, but adding a second table engine would duplicate Vuetify rendering
and styling in the first release.

Sources:

- <https://tanstack.com/table/latest/docs/guide/column-pinning>
- <https://tanstack.com/table/v8/docs/guide/column-sizing>

## Decision summary

- Render with Vuetify.
- Borrow Element Plus's flexible-minimum-width principle.
- Borrow TanStack's separation of sizing, pinning, and user preference state.
- Add Vela-specific overflow detection, stable action pinning, and overflow-only visual separation.
- Infer bounded semantic widths by role and data type, then let one identity/fill column absorb
  useful surplus only up to its maximum; do not scan remote rows or assign every column the same
  width.
- Keep every automatic decision explicit, deterministic, testable, and overridable.
