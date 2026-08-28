import { describe, expect, it } from 'vitest'
import type { StorageAdapter } from '@vela-admin/contracts'

import {
  createShellPreferencesController,
  filterNavigation,
  findNavigationPath,
  flattenNavigation,
  topNavigationDestinations,
  useWorkspaceTabs,
} from './index'

const navigation = [
  {
    id: 'content',
    label: 'Content',
    children: [
      { id: 'posts', label: 'Posts', href: '/posts', capability: 'posts.read' },
      { id: 'drafts', label: 'Drafts', href: '/drafts', capability: 'drafts.read' },
    ],
  },
] as const

describe('shell navigation', () => {
  it('flattens items and finds breadcrumb paths', () => {
    expect(flattenNavigation(navigation).map((item) => item.id)).toEqual([
      'content',
      'posts',
      'drafts',
    ])
    expect(findNavigationPath(navigation, 'posts').map((item) => item.id)).toEqual([
      'content',
      'posts',
    ])
    expect(topNavigationDestinations(navigation).map((item) => item.id)).toEqual([
      'posts',
      'drafts',
    ])
  })

  it('filters capabilities and removes empty structural groups', async () => {
    const filtered = await filterNavigation(navigation, {
      can: (capability) => Promise.resolve(capability === 'posts.read'),
    })
    expect(filtered[0]?.children?.map((item) => item.id)).toEqual(['posts'])
    const empty = await filterNavigation(navigation, { can: () => Promise.resolve(false) })
    expect(empty).toEqual([])
  })
})

describe('shell preferences', () => {
  it('normalizes stored values and persists presentation-only changes', async () => {
    const writes: unknown[] = []
    const storage: StorageAdapter = {
      get: <TValue>() =>
        Promise.resolve({
          version: 1,
          preferences: { layout: 'compact', contentWidth: 'invalid', headerStyle: 'attached' },
        } as TValue),
      set: (_key, value) => {
        writes.push(value)
        return Promise.resolve()
      },
      remove: () => Promise.resolve(),
    }
    const controller = createShellPreferencesController({ storage, immediate: false })

    await controller.hydrate()
    expect(controller.preferences.value).toEqual({
      layout: 'compact',
      contentWidth: 'boxed',
      headerStyle: 'attached',
      contentSpacing: 'comfortable',
    })
    await controller.set({ layout: 'topbar', contentWidth: 'fluid', contentSpacing: 'spacious' })
    expect(writes.at(-1)).toEqual({
      version: 2,
      preferences: {
        layout: 'topbar',
        contentWidth: 'fluid',
        headerStyle: 'attached',
        contentSpacing: 'spacious',
      },
    })
  })

  it('resets to host defaults and removes persisted state', async () => {
    const removed: string[] = []
    const storage: StorageAdapter = {
      get: () => undefined,
      set: () => undefined,
      remove: (key) => {
        removed.push(key)
      },
    }
    const controller = createShellPreferencesController({
      storage,
      immediate: false,
      defaults: { layout: 'compact', contentWidth: 'fluid', contentSpacing: 'compact' },
    })

    await controller.set({ layout: 'topbar' })
    await controller.reset()
    expect(controller.preferences.value).toEqual({
      layout: 'compact',
      contentWidth: 'fluid',
      headerStyle: 'floating',
      contentSpacing: 'compact',
    })
    expect(removed).toEqual(['vela.shell'])
  })
})

describe('workspace tabs', () => {
  it('keeps pinned tabs, evicts the least recently used tab, and selects a close fallback', () => {
    const controller = useWorkspaceTabs({
      initialItems: [
        { id: 'home', label: 'Home', pinned: true },
        { id: 'users', label: 'Users', closable: true },
      ],
      initialActiveId: 'users',
      maxItems: 3,
    })

    controller.open({ id: 'orders', label: 'Orders', closable: true })
    controller.activate('users')
    controller.open({ id: 'reports', label: 'Reports', closable: true })

    expect(controller.items.value.map((item) => item.id)).toEqual(['home', 'users', 'reports'])
    expect(controller.activeId.value).toBe('reports')
    expect(controller.close('reports')).toBe('users')
    expect(controller.close('home')).toBe('users')
  })

  it('updates existing tab metadata and exposes dirty state without duplicating tabs', () => {
    const controller = useWorkspaceTabs()

    controller.open({ id: 'users', label: 'Users', closable: true })
    controller.open({ id: 'users', label: 'People', closable: true })
    controller.setDirty('users', true)

    expect(controller.items.value).toEqual([
      { id: 'users', label: 'People', closable: true, dirty: true },
    ])
  })
})
