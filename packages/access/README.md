# @vela-admin/access

Backend-neutral authentication state, permission checks, declarative access boundaries, and Vue
Router guards for Vela Admin Kit. Applications provide their own auth and permission adapters; this
package never assumes endpoints, token storage, role names, or route paths.

```bash
pnpm add @vela-admin/access @vela-admin/contracts vue vue-router
```

```ts
import { createVelaAccess, createVelaRouteGuard } from '@vela-admin/access'

const access = createVelaAccess({ auth, permission })
app.use(access)
router.beforeEach(createVelaRouteGuard(access, routeAccessOptions))
```

Licensed under MIT.
