import { createApp, defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import { createVelaLocale, useVelaLocale } from './locale'

describe('Vela locale', () => {
  it('uses English defaults, interpolation, and locale fallbacks', () => {
    const locale = createVelaLocale({
      locale: 'fr-CA',
      fallbackLocale: 'en',
      messages: { fr: { 'ui.avatarGroup.more': '{count} de plus' } },
    })

    expect(locale.t('ui.avatarGroup.more', { count: 3 })).toBe('3 de plus')
    expect(locale.t('common.cancel')).toBe('Cancel')
    expect(locale.t('custom.missing')).toBe('custom.missing')
  })

  it('infers direction, supports overrides, and updates an explicit root', () => {
    const root = document.createElement('html')
    const locale = createVelaLocale({ locale: 'en-GB', root })

    expect(locale.direction.value).toBe('ltr')
    expect(root.lang).toBe('en-GB')
    expect(root.dir).toBe('ltr')

    locale.setLocale('ar')
    expect(locale.direction.value).toBe('rtl')
    expect(root.dir).toBe('rtl')

    locale.setDirection('ltr')
    expect(locale.direction.value).toBe('ltr')
    expect(root.dir).toBe('ltr')
  })

  it('ships complete Simplified Chinese framework copy with English fallback', () => {
    const locale = createVelaLocale({ locale: 'zh-CN' })

    expect(locale.t('data.pager.rowsPerPage')).toBe('每页条数')
    expect(locale.t('forms.dialog.save')).toBe('保存修改')
    expect(locale.t('shell.settings.label')).toBe('设置')
  })

  it('provides an app-scoped controller without process-global mutation', () => {
    const Consumer = defineComponent({
      setup() {
        const locale = useVelaLocale()
        return () => h('span', locale.t('common.cancel'))
      },
    })

    const firstRoot = document.createElement('div')
    const firstLocale = createVelaLocale({
      locale: 'de',
      messages: { de: { 'common.cancel': 'Abbrechen' } },
    })
    const firstApp = createApp(Consumer)
    firstApp.use(firstLocale)
    firstApp.mount(firstRoot)

    const secondRoot = document.createElement('div')
    const secondApp = createApp(Consumer)
    secondApp.use(createVelaLocale())
    secondApp.mount(secondRoot)

    expect(firstRoot.textContent).toBe('Abbrechen')
    expect(secondRoot.textContent).toBe('Cancel')
  })
})
