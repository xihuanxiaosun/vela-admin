<script setup lang="ts">
import { computed } from 'vue'
import { VSkeletonLoader } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import type { SkeletonPreset } from './types'

const props = withDefaults(
  defineProps<{
    preset?: SkeletonPreset
    type?: string | undefined
    label?: string | undefined
  }>(),
  {
    preset: 'text',
    type: undefined,
    label: undefined,
  },
)

const presetTypes: Readonly<Record<SkeletonPreset, string>> = {
  text: 'paragraph',
  card: 'image, article, actions',
  table: 'table-heading, table-thead, table-tbody',
  form: 'heading, text, text, text, actions',
  detail: 'image, article',
}

const resolvedType = computed(() => props.type ?? presetTypes[props.preset])
const locale = useVelaLocale()
const resolvedLabel = computed(() => props.label ?? locale.t('ui.skeleton.content'))
</script>

<template>
  <VSkeletonLoader :aria-label="resolvedLabel" class="va-skeleton" :type="resolvedType" />
</template>

<style>
.va-skeleton {
  inline-size: 100%;
  background: transparent;
}
</style>
