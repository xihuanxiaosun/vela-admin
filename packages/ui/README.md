# @vela-admin/ui

Semantic Vuetify controls and stable admin composites: buttons, icon actions, avatars, tags,
state views, centered overlays, toast, confirmation, prompt, and global loading APIs.

```bash
pnpm add @vela-admin/ui @vela-admin/theme @vela-admin/locale vue vuetify
```

```ts
import { createVelaFeedback, VaButton, VaFeedbackHost } from '@vela-admin/ui'
import '@vela-admin/ui/styles.css'

export const feedback = createVelaFeedback()
```

Install that app-scoped instance once and mount one `VaFeedbackHost` near the application root.
Features and plain TypeScript services can then call the API directly:

```ts
feedback.toast.success('Saved')
feedback.toast.error('Unable to save')
feedback.toast.info('Import started', { title: 'Background task', timeout: 8000 })

await feedback.loading.run(loadWorkspace(), 'Loading workspace')

const accepted = await feedback.confirm({
  title: 'Archive workspace?',
  message: 'You can restore it later.',
})
```

`VaButton` provides semantic intent, `small`/`medium`/`large` sizing, icon placement, and a loading
state that participates in normal layout. Loading therefore cannot clip its spinner or copy, grows
past an undersized minimum when necessary, and uses Vuetify's neutral disabled treatment. `VaTag`
accepts semantic tone plus an optional icon or dot for compact status communication.
`VaAvatar` owns image failure fallback and accessible naming; set `decorative` when the same name is
already rendered beside it so assistive technology does not announce duplicate identity copy.

The host owns rendering, theme inheritance, focus, queueing, locale, RTL, and SSR safety. Do not
create a detached Vue app or DOM tree for each toast or loading call. Create one feedback instance
per application (and per SSR request), not a process-global singleton.

`VaStateView` provides themed empty, error, forbidden, not-found, and offline presentation. Its
semantic tone follows the active Vuetify theme, so applications do not need one-off illustrations
or hard-coded state colours. Licensed under MIT.
