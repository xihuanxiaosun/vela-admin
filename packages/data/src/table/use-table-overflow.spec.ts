import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTableOverflow } from './use-table-overflow'

type ObserverCallback = () => void
let resolveMissingScroller = false

const OverflowHarness = defineComponent({
  setup() {
    const root = ref<HTMLElement | null>(null)
    const overflow = useTableOverflow(
      root,
      resolveMissingScroller ? { resolveScrollElement: () => null } : { tolerance: 2 },
    )
    return { root, overflow }
  },
  render() {
    return h('div', { ref: 'root' }, [h('div', { class: 'v-table__wrapper' }, [h('table')])])
  },
})

describe('useTableOverflow', () => {
  let resizeCallback: ObserverCallback
  let mutationCallback: ObserverCallback
  const resizeObserve = vi.fn()
  const resizeDisconnect = vi.fn()
  const mutationObserve = vi.fn()
  const mutationDisconnect = vi.fn()

  beforeEach(() => {
    resolveMissingScroller = false
    resizeObserve.mockClear()
    resizeDisconnect.mockClear()
    mutationObserve.mockClear()
    mutationDisconnect.mockClear()

    class ResizeObserverStub {
      constructor(callback: ObserverCallback) {
        resizeCallback = callback
      }

      observe = resizeObserve
      disconnect = resizeDisconnect
    }

    class MutationObserverStub {
      constructor(callback: ObserverCallback) {
        mutationCallback = callback
      }

      observe = mutationObserve
      disconnect = mutationDisconnect
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.stubGlobal('MutationObserver', MutationObserverStub)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('measures real overflow and logical scroll boundaries', async () => {
    const wrapper = mount(OverflowHarness)
    await nextTick()
    await nextTick()

    const scroller = wrapper.get('.v-table__wrapper').element as HTMLElement
    Object.defineProperties(scroller, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 600 },
    })
    scroller.scrollLeft = 0
    resizeCallback()

    expect(wrapper.vm.overflow.hasOverflow.value).toBe(true)
    expect(wrapper.vm.overflow.canScrollStart.value).toBe(false)
    expect(wrapper.vm.overflow.canScrollEnd.value).toBe(true)
    expect(resizeObserve).toHaveBeenCalledWith(scroller)
    expect(resizeObserve).toHaveBeenCalledWith(scroller.querySelector('table'))

    scroller.scrollLeft = 50
    scroller.dispatchEvent(new Event('scroll'))
    expect(wrapper.vm.overflow.canScrollStart.value).toBe(true)
    expect(wrapper.vm.overflow.canScrollEnd.value).toBe(true)

    vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
      direction: 'rtl',
    } as CSSStyleDeclaration)
    scroller.scrollLeft = -300
    mutationCallback()
    expect(wrapper.vm.overflow.canScrollStart.value).toBe(true)
    expect(wrapper.vm.overflow.canScrollEnd.value).toBe(false)

    wrapper.unmount()
    expect(resizeDisconnect).toHaveBeenCalled()
    expect(mutationDisconnect).toHaveBeenCalled()
  })

  it('allows a custom scroller resolver and safely handles missing browser APIs', async () => {
    resolveMissingScroller = true
    const wrapper = mount(OverflowHarness)
    await nextTick()
    await nextTick()

    expect(wrapper.vm.overflow.hasOverflow.value).toBe(false)
    vi.stubGlobal('requestAnimationFrame', undefined)
    expect(() => wrapper.vm.overflow.refresh()).not.toThrow()
    wrapper.unmount()
  })
})
