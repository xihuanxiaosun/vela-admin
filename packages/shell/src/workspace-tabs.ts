import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

import type { WorkspaceTab } from './types'

export interface WorkspaceTabsOptions {
  readonly initialItems?: readonly WorkspaceTab[]
  readonly initialActiveId?: string
  readonly maxItems?: number
}

export interface WorkspaceTabsController {
  readonly items: ShallowRef<readonly WorkspaceTab[]>
  readonly activeId: Ref<string | undefined>
  readonly open: (tab: WorkspaceTab) => void
  readonly activate: (id: string) => boolean
  readonly close: (id: string) => string | undefined
  readonly setDirty: (id: string, dirty: boolean) => void
  readonly reset: (items?: readonly WorkspaceTab[], activeId?: string) => void
}

/**
 * Keeps visited workspace tabs independent from Vue Router or any host navigation library.
 * The host owns URL synchronization; this controller only provides deterministic tab state.
 */
export function useWorkspaceTabs(options: WorkspaceTabsOptions = {}): WorkspaceTabsController {
  const maxItems = Math.max(1, options.maxItems ?? 10)
  const items = shallowRef<readonly WorkspaceTab[]>([...(options.initialItems ?? [])])
  const activeId = ref<string | undefined>(
    options.initialActiveId ?? items.value.find((item) => item.pinned)?.id ?? items.value[0]?.id,
  )
  const accessOrder = new Map<string, number>()
  let accessRevision = 0

  function touch(id: string): void {
    accessOrder.set(id, ++accessRevision)
  }

  for (const item of items.value) touch(item.id)

  function activate(id: string): boolean {
    if (!items.value.some((item) => item.id === id)) return false
    activeId.value = id
    touch(id)
    return true
  }

  function evictIfNeeded(incomingId: string): void {
    if (items.value.length < maxItems) return
    const candidate = items.value
      .filter((item) => item.id !== incomingId && !item.pinned && item.closable !== false)
      .toSorted(
        (left, right) => (accessOrder.get(left.id) ?? 0) - (accessOrder.get(right.id) ?? 0),
      )[0]
    if (!candidate) return
    items.value = items.value.filter((item) => item.id !== candidate.id)
    accessOrder.delete(candidate.id)
  }

  function open(tab: WorkspaceTab): void {
    const existingIndex = items.value.findIndex((item) => item.id === tab.id)
    if (existingIndex >= 0) {
      items.value = items.value.map((item, index) =>
        index === existingIndex ? { ...item, ...tab } : item,
      )
    } else {
      evictIfNeeded(tab.id)
      items.value = [...items.value, tab]
    }
    activate(tab.id)
  }

  function close(id: string): string | undefined {
    const index = items.value.findIndex((item) => item.id === id)
    const target = items.value[index]
    if (!target || target.pinned || target.closable === false) return activeId.value

    const nextItems = items.value.filter((item) => item.id !== id)
    items.value = nextItems
    accessOrder.delete(id)
    if (activeId.value !== id) return activeId.value

    const fallback = nextItems[Math.max(0, index - 1)] ?? nextItems[0]
    activeId.value = fallback?.id
    if (fallback) touch(fallback.id)
    return activeId.value
  }

  function setDirty(id: string, dirty: boolean): void {
    items.value = items.value.map((item) => (item.id === id ? { ...item, dirty } : item))
  }

  function reset(
    nextItems: readonly WorkspaceTab[] = options.initialItems ?? [],
    nextActiveId?: string,
  ): void {
    items.value = [...nextItems]
    accessOrder.clear()
    for (const item of items.value) touch(item.id)
    const requestedActiveId = nextActiveId ?? options.initialActiveId
    activeId.value = items.value.some((item) => item.id === requestedActiveId)
      ? requestedActiveId
      : (items.value.find((item) => item.pinned)?.id ?? items.value[0]?.id)
  }

  return { items, activeId, open, activate, close, setDirty, reset }
}
