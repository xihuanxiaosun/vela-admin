# Reference user workflow

The copyable `apps/starter` application includes one complete user-management workflow. It is an
application example, not a published package and not a production backend.

## What it demonstrates

- typed list loading through `useDataPage` and an HTTP repository;
- Bearer token injection through `createAuthenticatedTransport`;
- page and filter serialization at the transport boundary;
- responsive search, filters, semantic table cells, create, edit, and delete flows;
- route, navigation, and action permissions from one injected access service;
- independent API-side permission enforcement in the in-browser API simulator;
- localized validation, confirmation, feedback, cancellation, conflicts, and not-found errors.

The implementation stays application-local:

| File                                          | Responsibility                                      |
| --------------------------------------------- | --------------------------------------------------- |
| `src/data/users.ts`                           | Domain records, inputs, repository contract, seed   |
| `src/data/user-http-repository.ts`            | HTTP URLs, query mapping, response envelope mapping |
| `src/data/demo-user-api.ts`                   | Replaceable in-browser API simulator                |
| `src/data/user-services.ts`                   | Transport and repository composition root           |
| `src/access-policy.ts`                        | Demo roles, capabilities, and token claims          |
| `src/access.ts`                               | Injected auth and permission adapters               |
| `src/router.ts` and `src/views/UsersPage.vue` | Route and action enforcement                        |

The simulator deliberately waits briefly before each request so loading, refreshing, and
cancellation remain visible. It also checks the Bearer token and required capability before reading
or mutating records. Hiding a button is therefore not the only check in the example.

## Role matrix

Use the role menu in the Starter header to exercise each policy.

| Capability        | Administrator | Editor | Viewer |
| ----------------- | ------------- | ------ | ------ |
| `users.read`      | Yes           | Yes    | Yes    |
| `users.create`    | Yes           | Yes    | No     |
| `users.update`    | Yes           | Yes    | No     |
| `users.delete`    | Yes           | No     | No     |
| `settings.manage` | Yes           | No     | No     |

The navigation filter removes destinations that are not granted. Direct navigation is still
protected by `createVelaRouteGuard`, and user commands recheck permission before execution. The demo
API performs the final independent check.

## Connect a production API

Keep `createHttpStarterUserRepository()` and replace only the composition root in
`src/data/user-services.ts`:

```ts
import { createAuthenticatedTransport, createFetchTransport } from '@vela-admin/adapters'

import { starterAuthAdapter } from '../access'
import { createHttpStarterUserRepository } from './user-http-repository'

const http = createFetchTransport({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: 'include',
})

const authenticatedHttp = createAuthenticatedTransport(http, starterAuthAdapter)

export const starterUserRepository = createHttpStarterUserRepository(authenticatedHttp)
```

Then replace the Starter auth adapter with the product's session source. The repository contract and
page do not change. If the backend uses different URLs, query names, or response envelopes, adjust
only `user-http-repository.ts`.

The token format in `access-policy.ts` exists only to keep the local example deterministic. A real
backend must validate trusted session or token claims and enforce every capability itself. Client
route guards, navigation filtering, and hidden controls are user-experience boundaries, not a
security boundary.
