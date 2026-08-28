# Authentication and access

Vela coordinates session state and access decisions without owning accounts, endpoints, token
storage, role names, or route paths. The host implements the framework-neutral adapters from
`@vela-admin/contracts`, then installs `@vela-admin/access` once.

```ts
import { createVelaAccess } from '@vela-admin/access'

export const access = createVelaAccess({
  auth: myAuthAdapter,
  permission: myPermissionAdapter,
  // Missing permission adapters deny named capabilities by default.
  permissionFallback: 'deny',
})

app.use(access)
await access.initialize()
```

`initialize()` and `refresh()` are single-flight. Signed-out snapshots discard identity and tokens,
and capability checks fail closed when the session is anonymous. `invalidatePermissions()` lets a
host re-evaluate mounted boundaries after its policy cache changes.

## Route protection

The guard receives every route decision from the application. There are no built-in login,
forbidden, or home paths.

```ts
import {
  createMetaAccessResolver,
  createVelaRouteGuard,
  defineRouteAccess,
} from '@vela-admin/access'

const routes = [
  {
    path: '/sign-in',
    component: SignInPage,
    meta: { access: defineRouteAccess({ guestOnly: true }) },
  },
  {
    path: '/reports',
    component: ReportsPage,
    meta: { access: defineRouteAccess({ capabilities: ['reports.read'] }) },
  },
]

router.beforeEach(
  createVelaRouteGuard(access, {
    resolveRequirement: createMetaAccessResolver(),
    signInRoute: { name: 'sign-in' },
    forbiddenRoute: { name: 'forbidden' },
    authenticatedHomeRoute: { name: 'home' },
  }),
)
```

Anonymous redirects preserve `to.fullPath` in a configurable `redirect` query key. Route-scoped
permission context may be supplied as a value or asynchronously through `resolveContext`.

## View boundaries

Use a boundary for optional controls or sections. Protect the corresponding route and backend as
well; hiding UI is not an authorization boundary.

```vue
<VelaAccessBoundary capability="users.create">
  <VaButton>Create user</VaButton>
  <template #pending><VaSkeleton preset="button" /></template>
  <template #denied><span>You do not have access.</span></template>
</VelaAccessBoundary>
```

## Runnable Starter example

The Starter wires the access controller to three switchable roles and applies the same capabilities
to navigation, routes, and user actions. Its HTTP API simulator independently enforces each request,
so the example does not treat hidden controls as authorization. See the
[reference user workflow](./starter-user-workflow.md) for the role matrix and production transport
replacement.
