import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { ar } from 'vuetify/locale'
import '@fontsource-variable/inter'
import 'vuetify/styles'
import '@vela-admin/theme/styles.css'
import '@vela-admin/ui/styles.css'
import '@vela-admin/shell/styles.css'
import '@vela-admin/data/styles.css'
import '@vela-admin/forms/styles.css'
import '@vela-admin/upload/styles.css'

import { createVelaLocale } from '@vela-admin/locale'
import { createVelaPreset } from '@vela-admin/theme'
import { createVelaFeedback } from '@vela-admin/ui'

import App from './App.vue'
import { registerPlaygroundMessages } from './demo/messages'
import './styles.css'

const vuetify = createVuetify(
  createVelaPreset({
    vuetify: {
      locale: {
        fallback: 'en',
        locale: 'en',
        messages: { ar },
        rtl: { ar: true },
      },
    },
  }),
)
export const feedback = createVelaFeedback()
const locale = createVelaLocale()
registerPlaygroundMessages(locale)

createApp(App).use(vuetify).use(locale).use(feedback).mount('#app')
