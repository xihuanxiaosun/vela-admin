<script setup lang="ts">
import { VBadge, VDivider, VIcon, VListGroup, VListItem, VListSubheader } from 'vuetify/components'

import type { NavigationItem } from './types'

withDefaults(
  defineProps<{
    items: readonly NavigationItem[]
    activeId?: string | undefined
    depth?: number
    rail?: boolean
  }>(),
  {
    activeId: undefined,
    depth: 0,
    rail: false,
  },
)

const emit = defineEmits<{
  navigate: [item: NavigationItem]
}>()

function containsActive(item: NavigationItem, activeId: string | undefined): boolean {
  return (
    item.id === activeId || item.children?.some((child) => containsActive(child, activeId)) === true
  )
}
</script>

<template>
  <template v-for="item in items" :key="item.id">
    <div v-if="item.kind === 'section'" class="va-nav-section">
      <VDivider v-if="rail && depth === 0" class="va-nav-section__divider" />
      <VListSubheader v-else class="va-nav-section__title">{{ item.label }}</VListSubheader>
      <VaNavItems
        :active-id="activeId"
        :depth="depth + 1"
        :items="item.children ?? []"
        :rail="rail"
        @navigate="emit('navigate', $event)"
      />
    </div>

    <VListGroup v-else-if="item.children?.length" class="va-nav-group" :value="item.id">
      <template #activator="{ props: activatorProps }">
        <VListItem
          v-bind="activatorProps"
          :active="containsActive(item, activeId)"
          class="va-nav-item va-nav-item--group"
          :disabled="item.disabled ?? false"
          :prepend-icon="item.icon"
          :title="item.label"
        />
      </template>
      <VaNavItems
        :active-id="activeId"
        :depth="depth + 1"
        :items="item.children"
        :rail="rail"
        @navigate="emit('navigate', $event)"
      />
    </VListGroup>

    <VListItem
      v-else
      :active="item.id === activeId"
      :aria-current="item.id === activeId ? 'page' : undefined"
      class="va-nav-item va-nav-item--link"
      :disabled="item.disabled ?? false"
      :href="item.href"
      link
      role="link"
      :title="item.label"
      @click="emit('navigate', item)"
    >
      <template v-if="item.icon" #prepend>
        <VIcon class="va-nav-item__icon" :icon="item.icon" />
      </template>
      <template v-if="item.badge" #append>
        <VBadge
          class="va-nav-item__badge"
          inline
          :color="item.badge.color ?? 'primary'"
          :content="item.badge.content"
        />
      </template>
    </VListItem>
  </template>
</template>
