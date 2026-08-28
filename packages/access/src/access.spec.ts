import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import VelaAccessBoundary from './VelaAccessBoundary.vue'
import { createMetaAccessResolver, createVelaAccess, createVelaRouteGuard } from './index'

describe('Vela access controller', () => {
  it('initializes once, exposes identity, and evaluates permission fallbacks', async () => {
    const getSnapshot = vi.fn(() =>
      Promise.resolve({ authenticated: true as const, identity: { id: 7 }, accessToken: 'token' }),
    )
    const can = vi.fn((capability: string) => Promise.resolve(capability === 'users.read'))
    const access = createVelaAccess({ auth: { getSnapshot }, permission: { can } })

    await Promise.all([access.initialize(), access.initialize()])

    expect(getSnapshot).toHaveBeenCalledTimes(1)
    expect(access.status.value).toBe('ready')
    expect(access.identity.value).toEqual({ id: 7 })
    await expect(access.can('users.read')).resolves.toBe(true)
    await expect(access.canAny(['users.write', 'users.read'])).resolves.toBe(true)
    await expect(access.canAll(['users.read', 'users.write'])).resolves.toBe(false)
    await expect(access.can('')).resolves.toBe(false)
  })

  it('uses adapter aggregate checks, refreshes once, and clears sensitive state on sign-out', async () => {
    const refresh = vi.fn(() =>
      Promise.resolve({ authenticated: true as const, identity: 'Ada', accessToken: 'fresh' }),
    )
    const signOut = vi.fn()
    const access = createVelaAccess({
      initialSnapshot: { authenticated: true, identity: 'Old', accessToken: 'expired' },
      auth: { getSnapshot: () => ({ authenticated: true }), refresh, signOut },
      permission: {
        can: () => false,
        canAny: (capabilities) => capabilities.includes('read'),
        canAll: (capabilities) => capabilities.every((item) => item === 'read'),
      },
    })

    await Promise.all([access.refresh(), access.refresh()])
    expect(refresh).toHaveBeenCalledTimes(1)
    await expect(access.canAny(['read', 'write'])).resolves.toBe(true)
    await expect(access.canAll(['read'])).resolves.toBe(true)
    access.invalidatePermissions()
    expect(access.revision.value).toBe(2)

    await access.signOut('manual')
    expect(signOut).toHaveBeenCalledWith('manual')
    expect(access.snapshot.value).toEqual({ authenticated: false })
    await expect(access.canAll([])).resolves.toBe(false)
  })

  it('fails closed without a permission adapter and supports an explicit authenticated fallback', async () => {
    const auth = { getSnapshot: () => ({ authenticated: true as const }) }
    const strict = createVelaAccess({ auth })
    const permissive = createVelaAccess({ auth, permissionFallback: 'allow-authenticated' })

    await strict.initialize()
    await permissive.initialize()
    await expect(strict.can('reports.read')).resolves.toBe(false)
    await expect(permissive.can('reports.read')).resolves.toBe(true)
    await expect(permissive.canAny([])).resolves.toBe(false)
    await expect(permissive.canAll([])).resolves.toBe(true)
  })

  it('reports initialization errors and can retry after the adapter recovers', async () => {
    const failure = new Error('offline')
    const onError = vi.fn()
    const getSnapshot = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ authenticated: false })
    const access = createVelaAccess({ auth: { getSnapshot }, onError })

    await expect(access.initialize()).rejects.toBe(failure)
    expect(access.status.value).toBe('error')
    expect(access.initialized.value).toBe(false)
    await expect(access.initialize()).resolves.toEqual({ authenticated: false })
    expect(onError).toHaveBeenCalledWith(failure)
    expect(access.status.value).toBe('signed-out')
  })

  it('renders pending, allowed, and denied access-boundary slots reactively', async () => {
    let allowed = false
    const access = createVelaAccess({
      initialSnapshot: { authenticated: true },
      auth: { getSnapshot: () => ({ authenticated: true }) },
      permission: { can: () => Promise.resolve(allowed) },
    })
    const wrapper = mount(VelaAccessBoundary, {
      props: { capability: 'users.write' },
      slots: { default: 'Allowed', denied: 'Denied', pending: 'Checking' },
      global: { plugins: [access] },
    })

    await flushPromises()
    expect(wrapper.text()).toBe('Denied')
    allowed = true
    access.invalidatePermissions()
    await flushPromises()
    expect(wrapper.text()).toBe('Allowed')
  })
})

describe('Vela route guard', () => {
  function createTestRouter(access: ReturnType<typeof createVelaAccess>) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' }, meta: { access: { public: true } } },
        {
          path: '/login',
          component: { template: '<div />' },
          meta: { access: { guestOnly: true } },
        },
        { path: '/home', component: { template: '<div />' } },
        {
          path: '/secure',
          component: { template: '<div />' },
          meta: { access: { capabilities: ['reports.read'] } },
        },
        {
          path: '/any',
          component: { template: '<div />' },
          meta: { access: { capabilities: ['one', 'two'], capabilityMode: 'any' } },
        },
        {
          path: '/forbidden',
          component: { template: '<div />' },
          meta: { access: { public: true } },
        },
      ],
    })
    router.beforeEach(
      createVelaRouteGuard(access, {
        resolveRequirement: createMetaAccessResolver(),
        signInRoute: '/login',
        forbiddenRoute: { path: '/forbidden' },
        authenticatedHomeRoute: '/home',
      }),
    )
    return router
  }

  it('preserves the intended route when redirecting an anonymous visitor', async () => {
    const getSnapshot = vi.fn(() => ({ authenticated: false as const }))
    const router = createTestRouter(createVelaAccess({ auth: { getSnapshot } }))

    await router.push('/secure?tab=monthly')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/secure?tab=monthly')
  })

  it('redirects authenticated guests and denies missing capabilities', async () => {
    const access = createVelaAccess({
      auth: { getSnapshot: () => ({ authenticated: true as const }) },
      permission: { can: (capability) => capability === 'two' },
    })
    const router = createTestRouter(access)

    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/home')
    await router.push('/secure')
    expect(router.currentRoute.value.path).toBe('/forbidden')
    await router.push('/any')
    expect(router.currentRoute.value.path).toBe('/any')
  })

  it('allows public routes without forcing session initialization', async () => {
    const getSnapshot = vi.fn(() => ({ authenticated: false as const }))
    const router = createTestRouter(createVelaAccess({ auth: { getSnapshot } }))

    await router.push('/')

    expect(router.currentRoute.value.path).toBe('/')
    expect(getSnapshot).not.toHaveBeenCalled()
  })
})
