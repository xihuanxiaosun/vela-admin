// @vitest-environment node

import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createVuetify } from 'vuetify'
import { VApp } from 'vuetify/components'
import { describe, expect, it } from 'vitest'
import { createVelaLocale, VelaLocaleProvider } from '@vela-admin/locale'
import { createVelaPreset } from '@vela-admin/theme'
import { createVelaFeedback, VaButton, VaFeedbackHost, VaStateView } from '@vela-admin/ui'

describe('server rendering', () => {
  it('renders locale, Vuetify, UI states, and the shared feedback host without a DOM', async () => {
    const Root = defineComponent({
      setup() {
        return () =>
          h(VelaLocaleProvider, null, {
            default: () =>
              h(VApp, null, {
                default: () => [
                  h(VaButton, null, { default: () => 'Continue' }),
                  h(VaStateView, { kind: 'empty' }),
                  h(VaFeedbackHost),
                ],
              }),
          })
      },
    })
    const app = createSSRApp(Root)
    app.use(createVuetify(createVelaPreset()))
    app.use(createVelaLocale({ locale: 'en-GB', root: null }))
    app.use(createVelaFeedback())

    const html = await renderToString(app)

    expect(html).toContain('Continue')
    expect(html).toContain('Nothing here yet')
    expect(html).toContain('va-state-view__visual')
    expect(html).toContain('role="status"')
    expect(html).toContain('v-application')
  })
})
