<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VAvatar, VIcon, VImg } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import { avatarInitial } from '../utils/semantics'

const props = withDefaults(
  defineProps<{
    name?: string | undefined
    image?: string | undefined
    icon?: string | undefined
    label?: string | undefined
    size?: string | number
    decorative?: boolean
  }>(),
  {
    name: undefined,
    image: undefined,
    icon: '$account',
    label: undefined,
    size: 36,
    decorative: false,
  },
)

const imageFailed = ref(false)
const locale = useVelaLocale()
const initial = computed(() => avatarInitial(props.name))
const accessibleLabel = computed(() => props.label ?? props.name ?? locale.t('ui.avatar.label'))

watch(
  () => props.image,
  () => {
    imageFailed.value = false
  },
)
</script>

<template>
  <VAvatar
    class="va-avatar"
    :aria-hidden="decorative || undefined"
    :aria-label="decorative ? undefined : accessibleLabel"
    :role="decorative ? undefined : 'img'"
    :size="size"
  >
    <VImg
      v-if="image && !imageFailed"
      :alt="decorative ? '' : accessibleLabel"
      :src="image"
      @error="imageFailed = true"
    />
    <span v-else-if="initial" aria-hidden="true" class="va-avatar__initial">{{ initial }}</span>
    <VIcon v-else :icon="icon" aria-hidden="true" />
  </VAvatar>
</template>

<style>
.va-avatar {
  flex: 0 0 auto;
  color: rgb(var(--v-theme-primary-darken-1));
  font-weight: var(--v-font-weight-semibold);
  background:
    linear-gradient(
      rgba(var(--v-theme-primary), var(--v-avatar-tint-opacity)),
      rgba(var(--v-theme-primary), var(--v-avatar-tint-opacity))
    ),
    rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-primary), var(--v-avatar-border-opacity));
  box-shadow: var(--v-avatar-shadow);
}

.va-avatar__initial {
  font-size: var(--v-avatar-initial-font-size);
  line-height: 1;
}
</style>
