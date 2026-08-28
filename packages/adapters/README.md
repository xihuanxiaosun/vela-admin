# @vela-admin/adapters

Backend-neutral adapters for Vela Admin Kit, including Fetch transport, query serialization,
page/offset/cursor pagination, response-path parsing, and browser storage.

```bash
pnpm add @vela-admin/adapters @vela-admin/contracts
```

```ts
import { createFetchTransport, createPageResponseAdapter } from '@vela-admin/adapters'
```

Endpoints and response envelopes stay application-owned. Licensed under MIT.
