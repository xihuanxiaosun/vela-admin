# Backend adapters

Backend variation is expected, so Vela normalizes it at the edge.

## Transport

`createFetchTransport()` supports a base URL, injected headers, request serialization, abort
signals, and error normalization. Wrap it with `createAuthenticatedTransport()` when the product
uses token authentication. The wrapper reads the injected auth adapter, preserves explicit request
headers, performs one shared refresh for concurrent 401 responses, retries once, and signs out on
an unrecoverable refresh by default.

```ts
const transport = createAuthenticatedTransport(createFetchTransport({ baseUrl }), auth, {
  // Optional: use a non-Bearer backend without changing the transport implementation.
  formatToken: (token) => `Token ${token}`,
})
```

Token storage, refresh endpoints, cookie policy, and sign-out side effects remain product-owned.
The [Starter user workflow](./starter-user-workflow.md) provides a runnable composition with an HTTP
repository, authenticated transport, role switching, and an independently protected demo API.

## Pagination

Use the matching query adapter:

| Backend contract | Request example          |
| ---------------- | ------------------------ |
| page             | `page=2&limit=25`        |
| page size        | `page=2&pageSize=25`     |
| offset           | `offset=25&limit=25`     |
| cursor           | `cursor=opaque&limit=25` |

Response parsing is configured independently. A product can read rows and totals from nested paths
without changing `VaDataTable`, `VaPager`, or `useDataPage`.

## Errors

Normalize transport failures into a stable `NormalizedError` kind: validation, authentication,
permission, not-found, conflict, rate-limit, network, cancelled, or unknown. Preserve the original
cause for logging, but never require components to understand an HTTP client exception.

## Product adapters

Authentication, permission, storage, upload, validation, and response adapters should live in the
host application. Publish a separate integration package only when several applications share the
same backend contract.
