import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import {
  createMetaAccessResolver,
  createVelaRouteGuard,
  defineRouteAccess,
} from '@vela-admin/access'

import { starterAccess } from './access'
import { starterCapabilities } from './access-policy'

const routes: readonly RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./views/DashboardPage.vue'),
    meta: { access: defineRouteAccess({ public: true }) },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('./views/UsersPage.vue'),
    meta: {
      access: defineRouteAccess({ capabilities: [starterCapabilities.usersRead] }),
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./views/SettingsPage.vue'),
    meta: {
      access: defineRouteAccess({ capabilities: [starterCapabilities.settingsManage] }),
    },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('./views/ForbiddenPage.vue'),
    meta: { access: defineRouteAccess({ public: true }) },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes: [...routes],
})

router.beforeEach(
  createVelaRouteGuard(starterAccess, {
    resolveRequirement: createMetaAccessResolver(),
    signInRoute: { name: 'dashboard' },
    forbiddenRoute: (to) => ({ name: 'forbidden', query: { from: to.fullPath } }),
    authenticatedHomeRoute: { name: 'dashboard' },
  }),
)
