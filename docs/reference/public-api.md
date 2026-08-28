# Public API

Vela exposes backend-neutral contracts, composables, adapters, and stable administration patterns.
Vuetify remains available for product-specific composition; Vela wrappers exist only where they add
semantics, orchestration, accessibility, or a reusable workflow.

All packages are ESM, tree-shakeable, typed with strict TypeScript, and require Vue 3.5 and Vuetify 4. Import package styles once for every visual package you use.

```ts
import { createVelaPreset } from '@vela-admin/theme'
import { VaDataPage, useDataPage } from '@vela-admin/data'
import { VaFormDialog } from '@vela-admin/forms'
import { VaAvatarUpload, createUploadQueue } from '@vela-admin/upload'
```

## Packages

| Package                 | Stable surface                        | Owns                                                                                  |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `@vela-admin/contracts` | Types and pure factories              | async state, errors, transport, auth, permissions, pagination, queries, uploads       |
| `@vela-admin/adapters`  | Pure adapters                         | fetch, authenticated transport, query serialization, response pagination, web storage |
| `@vela-admin/access`    | Service, boundary, router guard       | fail-closed identity and capability resolution                                        |
| `@vela-admin/theme`     | preset, tokens, appearance controller | light/dark themes, defaults, runtime preferences, icon aliases                        |
| `@vela-admin/locale`    | controller and provider               | English/Chinese catalogs, host translation bridge, LTR/RTL synchronization            |
| `@vela-admin/ui`        | components and direct feedback API    | semantic controls, states, modal, toast, confirmation, prompt, global loading         |
| `@vela-admin/forms`     | schema and workflow engine            | fields, sections, validation, mapping, dirty guard, centered edit/create flow         |
| `@vela-admin/data`      | data workspace engine                 | filtering, tables, paging, selection, columns, row actions, CSV export                |
| `@vela-admin/upload`    | queue and media workflows             | validation, progress, retry, preview, crop, avatar, cover and gallery uploads         |
| `@vela-admin/shell`     | application shell                     | navigation, page header, tabs, command search, appearance settings                    |
| `@vela-admin/testing`   | deterministic helpers                 | deferred promises, fake adapters and in-memory testing utilities                      |

## Contracts and adapters

### Async state

`AsyncState<TData>` is a discriminated union of `idle`, `loading`, `success`, `refreshing`, and
`error`. Use `idleState`, `loadingState`, `successState`, `refreshingState`, `errorState`,
`hasAsyncData`, and `readAsyncData` instead of parallel loading/error/data booleans.

### Data sources and pagination

`DataSource<TItem, TFilters, TSortKey, TMeta>` accepts a `DataQuery` and abortable
`DataSourceContext`. Pagination supports:

- `PagePagination` via `createPagePagination(page, pageSize)`;
- `OffsetPagination` via `createOffsetPagination(offset, limit)`;
- `CursorPagination` via `createCursorPagination(limit, cursor)`.

Use `createPageResponseAdapter`, `createOffsetResponseAdapter`, or
`createCursorResponseAdapter` to map arbitrary response envelopes. Each accepts paths or selector
functions, so `data.list`, `items`, and `records` require no component changes.

### Transport and access

`createFetchTransport` implements the minimal `TransportAdapter`. Wrap it with
`createAuthenticatedTransport` to inject credentials and coordinate one refresh attempt. Neither
adapter assumes a token format or backend response envelope.

`createVelaAccess` combines injected `AuthAdapter` and `PermissionAdapter` instances. It is
fail-closed by default. `VelaAccessBoundary`, `defineRouteAccess`, and `createVelaRouteGuard`
consume the same service so route, menu, component, and action decisions cannot drift.

## Theme and localization

`createVelaPreset(options)` returns complete `createVuetify` options with semantic light/dark
themes, responsive thresholds, icon aliases, component defaults, and built-in English and
Simplified Chinese Vuetify catalogs.

`createVelaAppearanceController` and `useVelaAppearance` manage versioned preferences for color
mode, brand color, density, radius, surface opacity, motion, font scale, contrast, shell layout,
content width, header style, and workspace spacing. A host-owned `StorageAdapter` controls
persistence.

`createVelaLocale` owns framework copy per application or SSR request. `VelaLocaleProvider`
synchronizes Vuetify locale and RTL state. `translate` and `registerMessages` bridge existing i18n
systems and business catalogs.

## UI components

| Component                    | Primary contract                                                              |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `VaButton`                   | semantic `intent`, stable `appearance`, size and non-clipping loading state   |
| `VaIconButton`               | mandatory accessible label, tooltip, intent and loading state                 |
| `VaAvatar`, `VaAvatarGroup`  | image failure fallback, one-character initial, accessible overflow count      |
| `VaTag`, `VaChip`, `VaBadge` | semantic tone rather than raw product color                                   |
| `VaStatCard`                 | loading, trend, title and metric hierarchy                                    |
| `VaModal`                    | centered dialog, async close guard, busy state and optional mobile fullscreen |
| `VaStateView`                | empty, error, forbidden, not-found and offline states                         |
| `VaSkeleton`                 | text, card, table, form and detail presets                                    |
| `VaLoadingOverlay`           | local blocking state with accessible status                                   |
| `VaOverflowText`             | truncation tooltip only when content actually overflows                       |

Install `createVelaFeedback()` once and render one `VaFeedbackHost`. `useFeedback()` then exposes
direct `toast`, `confirm`, `prompt`, and global-loading APIs without manually creating DOM nodes in
feature pages.

## Forms

`FormSchema<TValues>` contains sections and typed `FormFieldSchema` entries. Supported built-ins are
text, textarea, password, email, number, select, autocomplete, combobox, checkbox, switch, radio,
date, datetime, and custom registry fields. `FormFieldLayout` supports responsive one- or two-column
placement without embedding CSS in schemas.

`VaFormBuilder` renders a schema; `VaForm` adds submission state; `VaFormDialog` provides a centered
create/edit workflow. `useFormWorkflow` keeps record loading, initial mapping, payload mapping,
submission, server field errors, stale request cancellation, and dirty-close confirmation in one
controller. `createFormDataMapper` isolates backend DTOs from form values.

## Data workspaces

### Components

| Component         | Purpose                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `VaDataPage`      | fixed toolbar/table/pager composition and all async states                                      |
| `VaFilterBar`     | schema-driven desktop/mobile filters with applied-value ownership                               |
| `VaDataTable`     | semantic sizing, bounded fill, internal scroll, resize, fixed header and stable action pinning  |
| `VaTableCell`     | identity, media, number, currency, date/time, status, boolean, progress and trend presentations |
| `VaColumnManager` | show, hide, reorder and reset persisted column widths                                           |
| `VaPager`         | page/offset/cursor navigation, page size and bounded jump-to-page                               |
| `VaSelectionBar`  | page and cross-page selection summary/actions                                                   |
| `VaRowActions`    | labelled primary action plus accessible overflow menu by default                                |

`DataColumn<TItem>` controls role, type, value selector, sizing, overflow, pinning, presentation,
resize bounds, export mapping, and visibility. `pin: 'auto-end'` is structurally stable; the divider
and shadow appear only when the table has real horizontal overflow. Ordinary first and last columns
are never fixed automatically.

`useDataPage` cancels stale requests, preserves old data during refresh, coordinates filters,
sorting and pagination, and exposes an explicit async state. `useDataQueryState` optionally binds
the complete query to a `StateSyncAdapter`; `createDataQuerySearchParamsCodec` and
`createUrlStateAdapter` provide router-neutral URL sharing. `useSavedViews`,
`useColumnPreferences`, and `useCrossPageSelection` are optional persistence controllers.
`createCsvDocument` escapes spreadsheet formulas by default.

`useFormDraft` stores versioned, migratable, debounced work in progress through a
`StorageAdapter`. `VaFormDraftNotice` is available independently and `VaFormDialog` accepts the
controller directly.

## Uploads and media

### Queue

`createUploadQueue(options)` accepts a host `UploadAdapter`, validators, concurrency, automatic
retry policy, preview adapter, and localized fallback messages. The returned queue exposes
`add`, `seed`, `start`, `pause`, `cancel`, `retry`, `move`, `remove`, `clearCompleted`, `drain`, and
`dispose`. Seeded remote assets are successful display items and never enter local validation or
transport.

`UploadFilePreparer<File>` is the pre-upload pipeline for crop, compression, EXIF normalization,
watermarking, encryption, or another host concern. Returning `undefined` means the user cancelled.
`imageDimensions(rules)` validates decoded width, height, total pixels, aspect ratio, and tolerance;
`inspectImageDimensions(file)` is the browser decoder and remains replaceable in tests.

### Components

| Component              | Intended use                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `VaFileUpload`         | generic list/gallery; count, progress, retry, cancel, reorder, preview, read-only mode  |
| `VaImageUpload`        | image gallery or cover; camera hint and optional Cropper.js editing before the queue    |
| `VaAvatarUpload`       | compact avatar; drop/replace/remove, progress, camera hint, preview, default 1:1 crop   |
| `VaImageCropDialog`    | centered free/fixed crop UI with zoom, rotate, flip, reset, keyboard and output options |
| `VaImagePreviewDialog` | theme-aware, large image preview                                                        |

`ImageCropOptions` configures aspect ratio, circle/rectangle presentation, output size, MIME type,
and quality. `resolveUrl` keeps upload result envelopes host-owned; the convenience
`resolveCommonUploadUrl` understands a string or `{ url }` only.

All upload surfaces accept an async `beforeRemove` guard. Use it for remote authorization,
retention checks, and server deletion before local queue removal; failure keeps the asset visible
and emits `remove-error`.

## Shell

`VaAppShell` accepts typed navigation and user data, then exposes header, tabs, content and action
slots. It supports sidebar, compact rail and top navigation; boxed/fluid content; floating/attached
header; responsive temporary navigation; workspace/document page modes; and safe-area behavior.

`VaPageHeader`, `VaWorkspaceTabs`, `VaCommandPalette`, `VaAppearanceSettings`,
`useWorkspaceTabs`, and `createShellPreferencesController` are independently reusable.

## Extension rules

1. Prefer Vuetify defaults and variants for atomic controls.
2. Add a Vela wrapper only for a stable repeated workflow or semantic contract.
3. Put endpoint, authorization, response-envelope, and upload-service differences behind adapters.
4. Keep business labels, capabilities, routes, and field schemas in the host application.
5. Add a Changeset, tests, documentation, and an escape hatch for every public API addition.
