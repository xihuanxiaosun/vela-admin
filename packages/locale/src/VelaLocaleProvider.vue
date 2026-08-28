<script setup lang="ts">
import { computed } from 'vue'
import { VLocaleProvider } from 'vuetify/components'

import { useVelaLocale } from './locale'

const locale = useVelaLocale()
const currentLocale = computed(() => locale.locale.value)
const rtl = computed(() => locale.direction.value === 'rtl')
</script>

<template>
  <VLocaleProvider :locale="currentLocale" :rtl="rtl">
    <slot />
  </VLocaleProvider>
</template>
