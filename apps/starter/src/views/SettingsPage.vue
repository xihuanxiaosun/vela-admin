<script setup lang="ts">
import { VaPageHeader } from '@vela-admin/shell'
import { VaStateView } from '@vela-admin/ui'
import { useVelaLocale } from '@vela-admin/locale'

const locale = useVelaLocale()
</script>

<template>
  <div class="starter-page">
    <VaPageHeader
      :description="locale.t('starter.settings.description')"
      :title="locale.t('starter.nav.settings')"
    />
    <VaStateView :text="locale.t('starter.settings.stateText')" />
  </div>
</template>

<style scoped>
.starter-page {
  display: grid;
  gap: var(--v-space-6);
}

.starter-page :deep(.va-state-view) {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-xl);
  box-shadow: var(--v-shadow-card);
}
</style>
