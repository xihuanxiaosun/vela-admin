# Feedback API

Application-wide feedback uses one root host and a factory-scoped service. Feature code calls a
plain API; it does not import and mount a snackbar, dialog, or overlay for every operation.

## Install once

```ts
// bootstrap.ts
import { createApp } from 'vue'
import { createVelaFeedback } from '@vela-admin/ui'

import App from './App.vue'

export const feedback = createVelaFeedback({
  loading: { delay: 120, minimumDuration: 280 },
})

createApp(App).use(feedback).mount('#app')
```

Mount the host once, inside the same Vuetify and defaults context as the rest of the application:

```vue
<script setup lang="ts">
import { VaFeedbackHost } from '@vela-admin/ui'
</script>

<template>
  <RouterView />
  <VaFeedbackHost />
</template>
```

This architecture preserves theme, locale, RTL, focus management, SSR isolation, and queue state.
Creating a detached Vue application for every call would lose that shared context and make
concurrent operations difficult to coordinate.

The Host is a real component rendered in the existing Vue tree; feature code still gets the direct
API ergonomics of `feedback.toast.success()` and `feedback.loading.run()`. One Host is therefore the
DOM owner for the whole application, rather than one newly created DOM subtree per notification.

## Call from a component

```ts
import { useFeedback } from '@vela-admin/ui'

const feedback = useFeedback()

feedback.toast.success('Workspace saved')

const accepted = await feedback.confirm({
  title: 'Archive workspace?',
  message: 'You can restore it later.',
  confirmText: 'Archive',
  intent: 'warning',
})

const name = await feedback.prompt({
  title: 'Rename workspace',
  label: 'Workspace name',
  validate: (value) => (value.trim().length < 3 ? 'Enter at least three characters.' : undefined),
})
```

Code outside Vue setup may import the application-scoped `feedback` instance exported from its
bootstrap module. Do not create a process-global singleton in a reusable package or SSR server.

## Loading contracts

Wrap an operation when the whole application must wait:

```ts
const account = await feedback.loading.run(() => accountApi.load(), { label: 'Loading account' })
```

For staged work, retain a handle:

```ts
const loading = feedback.loading.start('Uploading document')
loading.update('Processing document')
loading.close()
```

Every handle is independent. Closing one request cannot hide another request still in flight. The
default delay prevents short operations from flashing, while the minimum duration prevents a
visible indicator from disappearing abruptly.

Use `VaLoadingOverlay` instead when only a card, table, form, or other bounded region is busy. A
global service must not make routine background refreshes block the entire workspace.
