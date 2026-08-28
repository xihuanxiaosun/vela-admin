import { describe, expect, it, vi } from 'vitest'

import {
  avatarInitial,
  createConfirmController,
  createGlobalLoadingController,
  createPromptController,
  createVelaFeedback,
  createToastController,
  colorForIntent,
  colorForTone,
  isContentTruncated,
  variantForAppearance,
} from './index'

describe('avatar fallback', () => {
  it('returns one Unicode character and handles empty names', () => {
    expect(avatarInitial('  saber ')).toBe('S')
    expect(avatarInitial('周俊')).toBe('周')
    expect(avatarInitial('')).toBeUndefined()
  })
})

describe('semantic presentation', () => {
  it('maps every public intent, tone, and appearance to Vuetify semantics', () => {
    expect(
      (['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const).map(
        colorForIntent,
      ),
    ).toEqual(['primary', 'secondary', 'success', 'warning', 'error', undefined])
    expect(
      (['neutral', 'primary', 'success', 'warning', 'danger', 'info'] as const).map(colorForTone),
    ).toEqual([undefined, 'primary', 'success', 'warning', 'error', 'info'])
    expect(
      (['solid', 'outline', 'tonal', 'text', 'plain'] as const).map(variantForAppearance),
    ).toEqual(['flat', 'outlined', 'tonal', 'text', 'plain'])
  })
})

describe('confirm controller', () => {
  it('queues confirmations without replacing an active request', async () => {
    const controller = createConfirmController()
    const first = controller.confirm({ title: 'One', message: 'First' })
    const second = controller.confirm({ title: 'Two', message: 'Second' })
    expect(controller.current.value?.title).toBe('One')
    controller.accept()
    expect(await first).toBe(true)
    expect(controller.current.value?.title).toBe('Two')
    controller.cancel()
    expect(await second).toBe(false)
    expect(controller.current.value).toBeUndefined()
    expect(() => controller.accept()).not.toThrow()
  })
})

describe('prompt controller', () => {
  it('queues prompts and resolves cancellation without losing the next request', async () => {
    const controller = createPromptController()
    const first = controller.prompt({ title: 'Rename', label: 'Name' })
    const second = controller.prompt({ title: 'Reason', label: 'Reason' })
    controller.accept('Vela')
    expect(await first).toBe('Vela')
    expect(controller.current.value?.title).toBe('Reason')
    controller.cancel()
    expect(await second).toBeUndefined()
    expect(() => controller.cancel()).not.toThrow()
  })
})

describe('overflow text', () => {
  it('only reports meaningful horizontal or vertical truncation', () => {
    expect(
      isContentTruncated({
        clientWidth: 100,
        scrollWidth: 101,
        clientHeight: 20,
        scrollHeight: 20,
      }),
    ).toBe(false)
    expect(
      isContentTruncated({
        clientWidth: 100,
        scrollWidth: 104,
        clientHeight: 20,
        scrollHeight: 20,
      }),
    ).toBe(true)
    expect(
      isContentTruncated({
        clientWidth: 100,
        scrollWidth: 100,
        clientHeight: 20,
        scrollHeight: 24,
      }),
    ).toBe(true)
  })
})

describe('toast controller', () => {
  it('uses semantic colors and supports clearing the queue', () => {
    const controller = createToastController()
    controller.success('Saved')
    expect(controller.messages.value[0]).toMatchObject({
      text: 'Saved',
      color: 'surface',
      class: 'va-toast-host va-toast-message va-toast-message--success',
      timerColor: 'success',
    })
    controller.clear()
    expect(controller.messages.value).toHaveLength(0)
  })

  it('offers direct semantic helpers and configurable queue messages', () => {
    const controller = createToastController()
    controller.show({ text: 'Neutral', title: 'Notice', icon: false, timeout: 10 })
    controller.error('Failed', { title: 'Request failed', timeout: 9000 })
    controller.warning('Careful')
    controller.info('FYI')
    controller.show({ text: 'Custom', tone: 'primary', icon: '$star' })

    expect(controller.messages.value).toMatchObject([
      { text: 'Neutral', title: 'Notice', color: 'surface', timeout: 10 },
      {
        text: 'Failed',
        title: 'Request failed',
        color: 'surface',
        timeout: 9000,
        prependIcon: '$error',
      },
      { text: 'Careful', color: 'surface', prependIcon: '$warning' },
      { text: 'FYI', color: 'surface', prependIcon: '$info' },
      { text: 'Custom', color: 'surface', prependIcon: '$star' },
    ])
    expect(controller.messages.value[0]).not.toHaveProperty('prependIcon')
    controller.replace([{ text: 'Only one' }])
    expect(controller.messages.value).toEqual([{ text: 'Only one' }])
  })
})

describe('global loading controller', () => {
  it('does not flash when an operation ends before its delay', () => {
    vi.useFakeTimers()
    const controller = createGlobalLoadingController({ delay: 120, minimumDuration: 0 })
    const handle = controller.start('Saving')
    handle.close()
    vi.advanceTimersByTime(120)
    expect(controller.active.value).toBe(false)
    vi.useRealTimers()
  })

  it('keeps concurrent operations independent and exposes the newest label', () => {
    const controller = createGlobalLoadingController({ delay: 0, minimumDuration: 0 })
    const first = controller.start('Loading account')
    const second = controller.start('Loading permissions')
    expect(controller.count.value).toBe(2)
    expect(controller.current.value?.label).toBe('Loading permissions')
    second.close()
    expect(controller.current.value?.label).toBe('Loading account')
    first.close()
    expect(controller.active.value).toBe(false)
  })

  it('always closes the matching handle around an async task', async () => {
    const controller = createGlobalLoadingController({ delay: 0, minimumDuration: 0 })
    await expect(controller.run(() => Promise.resolve('ready'), 'Preparing')).resolves.toBe('ready')
    expect(controller.active.value).toBe(false)
  })

  it('supports delayed visibility, label updates, minimum duration, and clearing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const controller = createGlobalLoadingController({
      label: 'Working',
      delay: 20,
      minimumDuration: 100,
    })
    const handle = controller.start()
    handle.update({ label: 'Almost ready' })
    vi.advanceTimersByTime(20)
    expect(controller.current.value).toEqual({ id: handle.id, label: 'Almost ready' })

    vi.advanceTimersByTime(30)
    handle.close()
    handle.close()
    expect(controller.active.value).toBe(true)
    vi.advanceTimersByTime(70)
    expect(controller.active.value).toBe(false)

    const visible = controller.start({ delay: -1, minimumDuration: -1 })
    visible.update('Updated')
    expect(controller.current.value?.label).toBe('Updated')
    controller.clear()
    expect(controller.count.value).toBe(0)
    vi.useRealTimers()
  })

  it('closes loading state when a wrapped task rejects', async () => {
    const controller = createGlobalLoadingController({ delay: 0, minimumDuration: 0 })
    await expect(controller.run(() => Promise.reject(new Error('failed')))).rejects.toThrow(
      'failed',
    )
    expect(controller.active.value).toBe(false)
  })
})

describe('feedback service', () => {
  it('exposes direct API methods backed by one scoped controller set', async () => {
    const feedback = createVelaFeedback({ loading: { delay: 0, minimumDuration: 0 } })
    const pending = feedback.confirm({ title: 'Publish', message: 'Continue?' })
    feedback.confirmation.accept()
    expect(await pending).toBe(true)
    feedback.toast.success('Published')
    expect(feedback.toast.messages.value[0]).toMatchObject({ text: 'Published' })
  })
})
