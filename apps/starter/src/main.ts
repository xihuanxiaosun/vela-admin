import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import '@fontsource-variable/inter'
import 'vuetify/styles'
import '@vela-admin/theme/styles.css'
import '@vela-admin/ui/styles.css'
import '@vela-admin/shell/styles.css'

import { createVelaLocale } from '@vela-admin/locale'
import { createVelaPreset } from '@vela-admin/theme'
import { createVelaFeedback } from '@vela-admin/ui'

import App from './App.vue'
import { starterAccess } from './access'
import { registerStarterMessages } from './messages'
import { router } from './router'

const app = createApp(App)
export const feedback = createVelaFeedback()
const locale = createVelaLocale()
registerStarterMessages(locale)

app.use(createVuetify(createVelaPreset()))
app.use(locale)
app.use(feedback)
app.use(starterAccess)
app.use(router)
app.mount('#app')
