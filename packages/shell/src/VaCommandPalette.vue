<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { VDialog, VIcon, VList, VListItem, VTextField } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'

import { flattenNavigation } from './navigation'
import type { NavigationItem } from './types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    items: readonly NavigationItem[]
    title?: string | undefined
    placeholder?: string | undefined
    emptyText?: string | undefined
  }>(),
  {
    title: undefined,
    placeholder: undefined,
    emptyText: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  navigate: [item: NavigationItem]
}>()

const query = ref('')
const locale = useVelaLocale()
const searchInput = ref<{ focus: () => void }>()
const resolvedTitle = computed(() => props.title ?? locale.t('shell.command.title'))
const resolvedPlaceholder = computed(
  () => props.placeholder ?? locale.t('shell.command.placeholder'),
)
const resolvedEmptyText = computed(() => props.emptyText ?? locale.t('shell.command.empty'))
const candidates = computed(() => flattenNavigation(props.items).filter((item) => item.href))
const results = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  if (!needle) return candidates.value.slice(0, 12)
  return candidates.value
    .filter((item) =>
      [item.label, ...(item.keywords ?? [])].some((value) =>
        value.toLocaleLowerCase().includes(needle),
      ),
    )
    .slice(0, 12)
})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      query.value = ''
      return
    }
    await nextTick()
    searchInput.value?.focus()
  },
)

function navigate(item: NavigationItem): void {
  emit('navigate', item)
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog
    :aria-label="resolvedTitle"
    :model-value="modelValue"
    max-width="640"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="va-command-palette">
      <VTextField
        ref="searchInput"
        v-model="query"
        autofocus
        :aria-label="resolvedPlaceholder"
        clearable
        hide-details
        :placeholder="resolvedPlaceholder"
        prepend-inner-icon="$search"
        variant="solo"
      />
      <VList class="va-command-palette__results">
        <VListItem
          v-for="item in results"
          :key="item.id"
          :prepend-icon="item.icon"
          :title="item.label"
          @click="navigate(item)"
        />
        <div v-if="results.length === 0" class="va-command-palette__empty">
          <VIcon icon="$info" />
          {{ resolvedEmptyText }}
        </div>
      </VList>
    </div>
  </VDialog>
</template>

<style>
.va-command-palette {
  overflow: hidden;
  padding: var(--v-space-2);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-xl);
  box-shadow: var(--v-shadow-overlay);
}

.va-command-palette__results {
  max-block-size: min(28rem, 60vh);
  margin-block-start: var(--v-space-2);
  overflow-y: auto;
}

.va-command-palette__empty {
  display: flex;
  gap: var(--v-space-2);
  align-items: center;
  justify-content: center;
  min-block-size: 8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-sm);
}
</style>
