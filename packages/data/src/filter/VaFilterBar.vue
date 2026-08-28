<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { VBottomSheet, VMenu } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaChip, VaIconButton, VaTag } from '@vela-admin/ui'

import { compactFilterValues, countActiveFilters } from './filter-values'
import type { FilterField, FilterValues } from './types'
import VaFilterField from './VaFilterField.vue'

const props = withDefaults(
  defineProps<{
    fields: readonly FilterField[]
    modelValue: FilterValues
    immediate?: boolean
    debounce?: number
    applyText?: string | undefined
    resetText?: string | undefined
    moreText?: string | undefined
  }>(),
  {
    immediate: false,
    debounce: 280,
    applyText: undefined,
    resetText: undefined,
    moreText: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: FilterValues]
  apply: [value: FilterValues]
  reset: []
}>()

const draft = ref<FilterValues>({ ...props.modelValue })
const locale = useVelaLocale()
const menuOpen = ref(false)
const mobileOpen = ref(false)
const { smAndDown } = useDisplay()
const mobileTitleId = useId()
const pinnedFields = computed(() => props.fields.filter((field) => field.pinned))
const moreFields = computed(() => props.fields.filter((field) => !field.pinned))
const mobileSearchField = computed(() =>
  props.immediate ? pinnedFields.value.find((field) => field.kind === 'text') : undefined,
)
const mobileSheetFields = computed(() =>
  props.fields.filter((field) => field.key !== mobileSearchField.value?.key),
)
const activeValues = computed(() => compactFilterValues(props.modelValue))
const activeCount = computed(() => countActiveFilters(activeValues.value))
const moreActiveCount = computed(
  () => moreFields.value.filter((field) => activeValues.value[field.key] !== undefined).length,
)
const resolvedApplyText = computed(() => props.applyText ?? locale.t('common.apply'))
const resolvedResetText = computed(() => props.resetText ?? locale.t('common.reset'))
const resolvedMoreText = computed(() => props.moreText ?? locale.t('data.filter.more'))
const activeFields = computed(() =>
  props.fields.filter((field) => activeValues.value[field.key] !== undefined),
)
let applyTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.modelValue,
  (value) => {
    cancelScheduledApply()
    draft.value = { ...value }
  },
  { deep: true },
)

function cancelScheduledApply(): void {
  if (!applyTimer) return
  clearTimeout(applyTimer)
  applyTimer = undefined
}

function updateField(field: FilterField, value: FilterValues[string]): void {
  draft.value = { ...draft.value, [field.key]: value }
  if (!props.immediate) return
  if (field.kind === 'text' || field.kind === 'number') {
    cancelScheduledApply()
    applyTimer = setTimeout(() => apply(false), Math.max(0, props.debounce))
    return
  }
  apply(false)
}

function apply(closeMenu = true): void {
  cancelScheduledApply()
  const values = compactFilterValues(draft.value)
  emit('update:modelValue', values)
  emit('apply', values)
  if (closeMenu) {
    menuOpen.value = false
    mobileOpen.value = false
  }
}

function reset(): void {
  draft.value = {}
  emit('update:modelValue', {})
  emit('reset')
  if (props.immediate) emit('apply', {})
  menuOpen.value = false
  mobileOpen.value = false
}

function removeFilter(field: FilterField): void {
  draft.value = { ...draft.value, [field.key]: undefined }
  apply(false)
}

function formatValue(field: FilterField): string {
  const value = activeValues.value[field.key]
  if (field.format) return field.format(value)
  if (field.kind === 'select') {
    const values = Array.isArray(value) ? value : [value]
    return values
      .map((item) => field.options.find((option) => option.value === item)?.title ?? String(item))
      .join(', ')
  }
  if (field.kind === 'boolean') {
    return value
      ? (field.trueLabel ?? locale.t('common.yes'))
      : (field.falseLabel ?? locale.t('common.no'))
  }
  return String(value ?? '')
}

onBeforeUnmount(cancelScheduledApply)
</script>

<template>
  <section class="va-filter-bar" :aria-label="locale.t('data.filter.label')">
    <template v-if="smAndDown">
      <div class="va-filter-bar__mobile-controls">
        <VaFilterField
          v-if="mobileSearchField"
          class="va-filter-bar__mobile-search"
          :field="mobileSearchField"
          hide-details
          :model-value="draft[mobileSearchField.key]"
          @submit="apply()"
          @update:model-value="updateField(mobileSearchField, $event)"
        />
        <VaButton
          v-if="mobileSheetFields.length"
          appearance="outline"
          class="va-filter-bar__mobile-trigger"
          prepend-icon="$filter"
          @click="mobileOpen = true"
        >
          {{ locale.t('data.filter.label') }}
          <VaTag v-if="activeCount" class="va-filter-bar__count" tone="primary">
            {{ activeCount }}
          </VaTag>
        </VaButton>
      </div>

      <VBottomSheet v-model="mobileOpen" :aria-labelledby="mobileTitleId" inset>
        <section class="va-filter-bar__sheet">
          <header class="va-filter-bar__sheet-header">
            <div>
              <h2 :id="mobileTitleId">{{ locale.t('data.filter.label') }}</h2>
              <p>
                {{
                  activeCount
                    ? locale.t('data.filter.activeCount', { count: activeCount })
                    : locale.t('data.filter.refine')
                }}
              </p>
            </div>
            <VaIconButton
              appearance="text"
              icon="$close"
              :label="locale.t('data.filter.close')"
              @click="mobileOpen = false"
            />
          </header>
          <div class="va-filter-bar__sheet-fields">
            <VaFilterField
              v-for="field in mobileSheetFields"
              :key="field.key"
              :field="field"
              :model-value="draft[field.key]"
              @submit="apply()"
              @update:model-value="updateField(field, $event)"
            />
          </div>
          <footer class="va-filter-bar__sheet-actions">
            <VaButton appearance="text" intent="neutral" @click="reset">
              {{ resolvedResetText }}
            </VaButton>
            <VaButton v-if="immediate" @click="mobileOpen = false">
              {{ locale.t('common.done') }}
            </VaButton>
            <VaButton v-else @click="apply">{{ resolvedApplyText }}</VaButton>
          </footer>
        </section>
      </VBottomSheet>
    </template>

    <template v-else>
      <div class="va-filter-bar__fields">
        <template v-for="field in pinnedFields" :key="field.key">
          <VaFilterField
            :field="field"
            hide-details
            :model-value="draft[field.key]"
            @submit="apply()"
            @update:model-value="updateField(field, $event)"
          />
        </template>
      </div>

      <div class="va-filter-bar__actions">
        <VMenu v-if="moreFields.length" v-model="menuOpen" :close-on-content-click="false">
          <template #activator="{ props: activatorProps }">
            <VaButton v-bind="activatorProps" appearance="tonal" prepend-icon="$filter">
              {{ resolvedMoreText }}
              <VaTag v-if="moreActiveCount" class="va-filter-bar__count" tone="primary">
                {{ moreActiveCount }}
              </VaTag>
            </VaButton>
          </template>
          <div class="va-filter-bar__menu">
            <template v-for="field in moreFields" :key="field.key">
              <VaFilterField
                :field="field"
                :model-value="draft[field.key]"
                @submit="apply()"
                @update:model-value="updateField(field, $event)"
              />
            </template>
            <div class="va-filter-bar__menu-actions">
              <VaButton appearance="text" intent="neutral" @click="reset">
                {{ resolvedResetText }}
              </VaButton>
              <VaButton @click="apply">{{ resolvedApplyText }}</VaButton>
            </div>
          </div>
        </VMenu>
        <template v-if="!immediate">
          <VaButton appearance="text" intent="neutral" @click="reset">
            {{ resolvedResetText }}
          </VaButton>
          <VaButton @click="apply">{{ resolvedApplyText }}</VaButton>
        </template>
      </div>
    </template>

    <div
      v-if="activeFields.length"
      :aria-label="locale.t('data.filter.applied')"
      class="va-filter-bar__active"
    >
      <VaChip
        v-for="field in activeFields"
        :key="field.key"
        :label="locale.t('data.filter.remove', { label: field.label })"
        closable
        selected
        tone="primary"
        @close="removeFilter(field)"
      >
        <strong>{{ field.label }}:</strong> {{ formatValue(field) }}
      </VaChip>
      <span class="va-filter-bar__active-count">
        {{ locale.t('data.filter.active', { count: activeCount }) }}
      </span>
    </div>
  </section>
</template>

<style>
.va-filter-bar {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: var(--v-space-4);
  align-items: flex-end;
  justify-content: space-between;
  min-inline-size: 0;
  padding: var(--v-space-4);
  overflow: visible;
  background:
    linear-gradient(
      135deg,
      rgba(var(--v-theme-primary), var(--v-filter-bar-tint-opacity)),
      transparent 48%
    ),
    rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-filter-bar-shadow);
}

.va-filter-bar::before {
  position: absolute;
  inset-block: var(--v-space-3);
  inset-inline-start: 0;
  inline-size: var(--v-space-1);
  content: '';
  background: rgb(var(--v-theme-primary));
  border-start-end-radius: var(--v-radius-pill);
  border-end-end-radius: var(--v-radius-pill);
}

.va-filter-bar__fields {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 18rem));
  gap: var(--v-space-3);
  min-inline-size: 0;
}

.va-filter-bar__actions,
.va-filter-bar__menu-actions {
  display: flex;
  gap: var(--v-space-2);
  align-items: center;
}

.va-filter-bar__count {
  margin-inline-start: var(--v-space-2);
}

.va-filter-bar__mobile-controls {
  display: flex;
  gap: var(--v-space-2);
  align-items: center;
  inline-size: 100%;
}

.va-filter-bar__mobile-search {
  flex: 1 1 auto;
  min-inline-size: 0;
}

.va-filter-bar__mobile-trigger {
  flex: 0 0 auto;
}

.va-filter-bar__sheet {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-block-size: var(--v-filter-sheet-max-height);
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-block-end: 0;
  border-radius: var(--v-radius-xl) var(--v-radius-xl) 0 0;
  box-shadow: var(--v-shadow-overlay);
}

.va-filter-bar__sheet-header,
.va-filter-bar__sheet-actions {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  justify-content: space-between;
  padding: var(--v-space-4);
}

.va-filter-bar__sheet-header {
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-filter-bar__sheet-header h2,
.va-filter-bar__sheet-header p {
  margin: 0;
}

.va-filter-bar__sheet-header h2 {
  font-size: var(--v-font-size-lg);
  font-weight: var(--v-font-weight-semibold);
}

.va-filter-bar__sheet-header p {
  margin-block-start: var(--v-space-1);
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: var(--v-font-size-sm);
}

.va-filter-bar__sheet-fields {
  display: grid;
  gap: var(--v-space-3);
  padding: var(--v-space-4);
  overflow-y: auto;
}

.va-filter-bar__sheet-actions {
  padding-block-end: max(var(--v-space-4), env(safe-area-inset-bottom));
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-filter-bar__menu {
  display: grid;
  gap: var(--v-space-3);
  inline-size: min(24rem, calc(100vw - var(--v-space-8)));
  padding: var(--v-space-4);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-overlay);
}

.va-filter-bar__menu-actions {
  justify-content: flex-end;
  padding-block-start: var(--v-space-2);
}

.va-filter-bar__active {
  display: flex;
  flex: 1 0 100%;
  flex-wrap: wrap;
  gap: var(--v-space-2);
  align-items: center;
  padding-block-start: var(--v-space-3);
  border-block-start: 1px solid rgba(var(--v-theme-primary), var(--v-filter-divider-opacity));
}

.va-filter-bar__active strong {
  font-weight: var(--v-font-weight-semibold);
}

.va-filter-bar__active-count {
  margin-inline-start: auto;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: var(--v-font-size-xs);
}

@media (max-width: 959px) {
  .va-filter-bar {
    align-items: stretch;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .va-filter-bar__actions {
    justify-content: flex-end;
  }

  .va-filter-bar__active {
    flex: 0 0 auto;
    inline-size: 100%;
  }
}
</style>
