<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

import { useVelaAccess } from './access'
import type { VelaCapabilityMode } from './router'

const props = withDefaults(
  defineProps<{
    capability?: string | undefined
    capabilities?: readonly string[]
    mode?: VelaCapabilityMode
    context?: unknown
  }>(),
  {
    capabilities: () => [],
    mode: 'all',
  },
)

const access = useVelaAccess()
const checking = ref(false)
const allowed = ref(false)
const requestedCapabilities = computed(() =>
  [props.capability, ...props.capabilities].filter((capability): capability is string =>
    Boolean(capability),
  ),
)

watchEffect((onCleanup) => {
  const capabilities = requestedCapabilities.value
  const context = props.context
  const revision = access.revision.value
  let active = true
  onCleanup(() => {
    active = false
  })

  checking.value = true
  const check =
    capabilities.length === 0
      ? Promise.resolve(true)
      : props.mode === 'any'
        ? access.canAny(capabilities, context)
        : access.canAll(capabilities, context)
  void check
    .then((result) => {
      if (active && revision === access.revision.value) allowed.value = result
    })
    .finally(() => {
      if (active) checking.value = false
    })
})
</script>

<template>
  <slot v-if="!checking && allowed" />
  <slot v-else-if="checking" name="pending" />
  <slot v-else name="denied" />
</template>
