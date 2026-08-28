<script setup lang="ts">
import { VBreadcrumbs, VBreadcrumbsItem } from 'vuetify/components'

export interface PageBreadcrumb {
  readonly title: string
  readonly href?: string
  readonly disabled?: boolean
}

withDefaults(
  defineProps<{
    title: string
    description?: string | undefined
    breadcrumbs?: readonly PageBreadcrumb[]
  }>(),
  {
    description: undefined,
    breadcrumbs: () => [],
  },
)
</script>

<template>
  <header class="va-page-header">
    <div class="va-page-header__copy">
      <VBreadcrumbs v-if="breadcrumbs.length" class="va-page-header__breadcrumbs">
        <VBreadcrumbsItem
          v-for="item in breadcrumbs"
          :key="`${item.title}:${item.href ?? ''}`"
          :disabled="item.disabled ?? false"
          :href="item.href"
          :title="item.title"
        />
      </VBreadcrumbs>
      <h1 class="va-page-header__title">{{ title }}</h1>
      <p v-if="description" class="va-page-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="va-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style>
.va-page-header {
  display: flex;
  gap: var(--v-space-6);
  align-items: flex-end;
  justify-content: space-between;
  min-inline-size: 0;
}

.va-page-header__copy {
  min-inline-size: 0;
}

.va-page-header__breadcrumbs {
  min-block-size: 0;
  padding: 0 0 var(--v-space-2);
  color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
}

.va-page-header__title {
  margin: 0;
  color: rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity));
  font-size: clamp(var(--v-font-size-2xl), 2vw, var(--v-font-size-3xl));
  font-weight: var(--v-font-weight-bold);
  line-height: var(--v-line-height-tight);
  letter-spacing: -0.02em;
}

.va-page-header__description {
  max-inline-size: 52rem;
  margin: var(--v-space-2) 0 0;
  color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-md);
}

.va-page-header__actions {
  display: flex;
  flex: 0 0 auto;
  gap: var(--v-space-2);
  align-items: center;
}

@media (max-width: 599px) {
  .va-page-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
