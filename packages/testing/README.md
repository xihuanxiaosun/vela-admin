# @vela-admin/testing

Deterministic storage, permission, transport, upload, and deferred-promise fakes for testing Vela
Admin Kit integrations without a backend.

```bash
pnpm add -D @vela-admin/testing
```

```ts
import { createMemoryStorage, createTransportFake } from '@vela-admin/testing'
```

Production packages never depend on this package. Licensed under MIT.
