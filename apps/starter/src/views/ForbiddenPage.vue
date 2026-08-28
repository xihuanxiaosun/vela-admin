<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useVelaLocale } from '@vela-admin/locale'
import { VaPageHeader } from '@vela-admin/shell'
import { VaStateView } from '@vela-admin/ui'

const router = useRouter()
const locale = useVelaLocale()
</script>

<template>
  <div class="starter-page">
    <VaPageHeader
      :description="locale.t('starter.forbidden.description')"
      :title="locale.t('starter.forbidden.title')"
    />
    <VaStateView
      :action-text="locale.t('starter.forbidden.action')"
      kind="forbidden"
      :text="locale.t('starter.forbidden.text')"
      :title="locale.t('starter.forbidden.stateTitle')"
      @action="router.push({ name: 'dashboard' })"
    />
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
