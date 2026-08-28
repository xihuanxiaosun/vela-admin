<script setup lang="ts">
import { computed } from 'vue'
import { VAvatar } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import type { AvatarItem } from '../types'
import VaAvatar from './VaAvatar.vue'

const props = withDefaults(
  defineProps<{
    items: readonly AvatarItem[]
    max?: number
    size?: string | number
    label?: string | undefined
  }>(),
  {
    max: 4,
    size: 36,
    label: undefined,
  },
)

const locale = useVelaLocale()
const accessibleLabel = computed(() => props.label ?? locale.t('ui.avatarGroup.label'))
const visibleItems = computed(() => props.items.slice(0, Math.max(0, props.max)))
const remaining = computed(() => Math.max(0, props.items.length - visibleItems.value.length))
</script>

<template>
  <div class="va-avatar-group" role="group" :aria-label="accessibleLabel">
    <VaAvatar
      v-for="item in visibleItems"
      :key="item.id"
      :icon="item.icon"
      :image="item.image"
      :name="item.name"
      :size="size"
    />
    <VAvatar
      v-if="remaining"
      class="va-avatar-group__remaining"
      :aria-label="locale.t('ui.avatarGroup.more', { count: remaining })"
      role="img"
      :size="size"
    >
      +{{ remaining }}
    </VAvatar>
  </div>
</template>

<style>
.va-avatar-group {
  display: inline-flex;
  align-items: center;
  padding-inline-start: var(--v-space-2);
}

.va-avatar-group > * {
  margin-inline-start: calc(var(--v-space-2) * -1);
  border: 2px solid rgb(var(--v-theme-surface));
}

.va-avatar-group__remaining {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: var(--v-font-size-xs);
  font-weight: var(--v-font-weight-semibold);
}
</style>
