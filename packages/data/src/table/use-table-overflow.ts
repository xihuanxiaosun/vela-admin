import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  readonly,
  ref,
  type Ref,
  watch,
  type WatchSource,
} from 'vue'

import { DEFAULT_TABLE_LAYOUT, isMeaningfulOverflow } from './layout'

export interface TableOverflowOptions {
  readonly tolerance?: number
  readonly watch?: readonly WatchSource[]
  readonly resolveScrollElement?: (root: HTMLElement) => HTMLElement | null
}

export interface TableOverflowState {
  readonly hasOverflow: Readonly<Ref<boolean>>
  readonly canScrollStart: Readonly<Ref<boolean>>
  readonly canScrollEnd: Readonly<Ref<boolean>>
  readonly refresh: () => void
}

function defaultResolveScrollElement(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('.v-table__wrapper') ?? root
}

export function useTableOverflow(
  root: Ref<HTMLElement | null>,
  options: TableOverflowOptions = {},
): TableOverflowState {
  const hasOverflow = ref(false)
  const canScrollStart = ref(false)
  const canScrollEnd = ref(false)
  let resizeObserver: ResizeObserver | undefined
  let mutationObserver: MutationObserver | undefined
  let frame: number | undefined
  let scrollElement: HTMLElement | null = null

  const measure = () => {
    if (!scrollElement) return
    const tolerance = options.tolerance ?? DEFAULT_TABLE_LAYOUT.overflowTolerance
    hasOverflow.value = isMeaningfulOverflow(
      scrollElement.scrollWidth,
      scrollElement.clientWidth,
      tolerance,
    )
    const rtl = getComputedStyle(scrollElement).direction === 'rtl'
    const logicalOffset = rtl ? Math.abs(scrollElement.scrollLeft) : scrollElement.scrollLeft
    canScrollStart.value = logicalOffset > tolerance
    canScrollEnd.value =
      scrollElement.scrollWidth - scrollElement.clientWidth - logicalOffset > tolerance
  }

  const refresh = () => {
    if (typeof requestAnimationFrame === 'undefined') return
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measure)
  }

  const disconnect = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    scrollElement?.removeEventListener('scroll', refresh)
    resizeObserver = undefined
    mutationObserver = undefined
    scrollElement = null
  }

  const connect = async () => {
    disconnect()
    await nextTick()
    if (!root.value || typeof ResizeObserver === 'undefined') return
    scrollElement = (options.resolveScrollElement ?? defaultResolveScrollElement)(root.value)
    if (!scrollElement) return
    resizeObserver = new ResizeObserver(refresh)
    resizeObserver.observe(scrollElement)
    const table = scrollElement.querySelector('table')
    if (table) resizeObserver.observe(table)
    mutationObserver = new MutationObserver(refresh)
    mutationObserver.observe(scrollElement, { childList: true, subtree: true })
    scrollElement.addEventListener('scroll', refresh, { passive: true })
    void document.fonts.ready.then(refresh)
    refresh()
  }

  onMounted(connect)
  onBeforeUnmount(disconnect)
  watch(root, connect)
  if (options.watch?.length) watch(options.watch, refresh, { deep: true, flush: 'post' })

  return {
    hasOverflow: readonly(hasOverflow),
    canScrollStart: readonly(canScrollStart),
    canScrollEnd: readonly(canScrollEnd),
    refresh,
  }
}
