import type { PermissionAdapter } from '@vela-admin/contracts'

import type { NavigationItem } from './types'

export async function filterNavigation(
  items: readonly NavigationItem[],
  permission?: PermissionAdapter,
): Promise<readonly NavigationItem[]> {
  const resolved: NavigationItem[] = []

  for (const item of items) {
    if (item.capability && permission && !(await permission.can(item.capability))) continue
    const children = item.children ? await filterNavigation(item.children, permission) : undefined
    if (item.children && children?.length === 0 && !item.href) continue
    resolved.push({
      ...item,
      ...(children === undefined ? {} : { children }),
    })
  }

  return resolved
}

export function flattenNavigation(items: readonly NavigationItem[]): readonly NavigationItem[] {
  return items.flatMap((item) => [item, ...flattenNavigation(item.children ?? [])])
}

/** Resolves horizontal destinations from grouped or flat navigation schemas. */
export function topNavigationDestinations(
  items: readonly NavigationItem[],
): readonly NavigationItem[] {
  return flattenNavigation(items).filter((item) => item.href && item.kind !== 'section')
}

export function findNavigationPath(
  items: readonly NavigationItem[],
  id: string,
): readonly NavigationItem[] {
  for (const item of items) {
    if (item.id === id) return [item]
    const childPath = findNavigationPath(item.children ?? [], id)
    if (childPath.length) return [item, ...childPath]
  }
  return []
}
