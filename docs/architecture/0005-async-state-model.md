# ADR 0005: Shared asynchronous and data-view state model

- Status: Proposed
- Date: 2026-08-26

## Context

Buttons, forms, uploads, data tables, and page-level requests currently tend to invent different
names for similar states. The framework needs consistent visual feedback without collapsing
important distinctions such as initial loading and background refresh.

## Proposed decision

Use discriminated state models instead of unrelated booleans. The base asynchronous state is:

```ts
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading'; previous?: T }
  | { status: 'success'; data: T }
  | { status: 'refreshing'; data: T }
  | { status: 'error'; error: E; previous?: T }
```

Data views add an explicit empty outcome after successful normalization. Uploads use their own
queue-item state machine because progress, cancellation, and retry are first-class.

Requests accept an `AbortSignal`, and consumers ignore stale completions even when a transport
cannot cancel in flight.

## Open questions

- Whether error normalization belongs in contracts or adapters.
- Whether the data package owns caching or exposes an optional query-library bridge.
- Whether optimistic updates belong in the first stable release.
