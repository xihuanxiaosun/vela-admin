<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  VDefaultsProvider,
  VDivider,
  VList,
  VListItem,
  VListSubheader,
  VMenu,
} from 'vuetify/components'
import type { VelaRouteAccessRequirement } from '@vela-admin/access'
import { createWebStorageAdapter } from '@vela-admin/adapters'
import { useVelaLocale, VelaLocaleProvider } from '@vela-admin/locale'
import {
  VaAppearanceSettings,
  VaAppShell,
  createShellPreferencesController,
  filterNavigation,
  type NavigationItem,
} from '@vela-admin/shell'
import { useVelaAppearance } from '@vela-admin/theme'
import { VaButton, VaFeedbackHost, useFeedback } from '@vela-admin/ui'

import { setStarterAccessRole, starterAccess, starterAccessRole } from './access'
import { starterAccessRoles, type StarterAccessRole } from './access-policy'
import { createStarterNavigation } from './navigation'

const route = useRoute()
const router = useRouter()
const feedback = useFeedback()
const locale = useVelaLocale()
const appearanceOpen = ref(false)
const storage = createWebStorageAdapter(window.localStorage, { namespace: 'vela-starter' })
const appearance = useVelaAppearance({ storage })
const shellPreferences = createShellPreferencesController({ storage })
const activeId = computed(() => (typeof route.name === 'string' ? route.name : undefined))
const starterNavigation = ref<readonly NavigationItem[]>([])
const localeOptions = computed(() => [
  { code: 'en', label: locale.t('starter.locale.english') },
  { code: 'zh-CN', label: locale.t('starter.locale.chinese') },
])
const roleOptions = computed(() =>
  starterAccessRoles.map((role) => ({ role, label: roleLabel(role) })),
)
const localeShortLabel = computed(() => (locale.locale.value.startsWith('zh') ? '中文' : 'EN'))

watch(
  [() => locale.locale.value, () => starterAccess.revision.value],
  (_values, _previous, onCleanup) => {
    let active = true
    onCleanup(() => {
      active = false
    })

    void filterNavigation(createStarterNavigation(locale.t), {
      can: (capability) => starterAccess.can(capability),
    }).then((items) => {
      if (active) starterNavigation.value = items
    })
  },
  { immediate: true },
)

function roleLabel(role: StarterAccessRole): string {
  return locale.t(`starter.access.role.${role}`)
}

function navigate(item: NavigationItem): void {
  if (router.hasRoute(item.id)) void router.push({ name: item.id })
}

function handleUserAction(action: string): void {
  feedback.toast.info(
    locale.t(action === 'profile' ? 'starter.app.profileAction' : 'starter.app.signOutAction'),
  )
}

async function selectRole(role: StarterAccessRole): Promise<void> {
  if (role === starterAccessRole.value) return
  await setStarterAccessRole(role)
  feedback.toast.info(locale.t('starter.access.roleChanged', { role: roleLabel(role) }))

  const requirement = route.meta.access as VelaRouteAccessRequirement | undefined
  const capabilities = requirement?.capabilities ?? []
  if (requirement?.public || capabilities.length === 0) return
  const allowed =
    requirement?.capabilityMode === 'any'
      ? await starterAccess.canAny(capabilities)
      : await starterAccess.canAll(capabilities)
  if (!allowed) {
    await router.replace({ name: 'forbidden', query: { from: route.fullPath } })
  }
}
</script>

<template>
  <VelaLocaleProvider>
    <VDefaultsProvider :defaults="appearance.vuetifyDefaults.value">
      <VaAppShell
        :active-id="activeId"
        app-name="Vela Admin"
        :content-spacing="shellPreferences.preferences.value.contentSpacing"
        :content-width="shellPreferences.preferences.value.contentWidth"
        :header-style="shellPreferences.preferences.value.headerStyle"
        :layout="shellPreferences.preferences.value.layout"
        :navigation="starterNavigation"
        :user="{
          id: 'starter-admin',
          name: locale.t('starter.app.userName'),
          subtitle: roleLabel(starterAccessRole),
        }"
        @navigate="navigate"
        @settings="appearanceOpen = true"
        @user-action="handleUserAction"
      >
        <template #header-actions>
          <VMenu location="bottom end">
            <template #activator="{ props: activatorProps }">
              <VaButton v-bind="activatorProps" appearance="text" intent="neutral" size="small">
                {{ localeShortLabel }}
              </VaButton>
            </template>
            <VList min-width="160">
              <VListItem
                v-for="option in localeOptions"
                :key="option.code"
                :active="locale.locale.value === option.code"
                :title="option.label"
                @click="locale.setLocale(option.code)"
              />
            </VList>
          </VMenu>
        </template>
        <template #user-menu>
          <VListSubheader>{{ locale.t('starter.access.roleMenuTitle') }}</VListSubheader>
          <VListItem
            v-for="option in roleOptions"
            :key="option.role"
            :active="starterAccessRole === option.role"
            :subtitle="locale.t(`starter.access.roleDescription.${option.role}`)"
            :title="option.label"
            @click="selectRole(option.role)"
          />
          <VDivider />
          <VListItem
            prepend-icon="$account"
            :title="locale.t('shell.profile.label')"
            @click="handleUserAction('profile')"
          />
          <VListItem
            prepend-icon="$logout"
            :title="locale.t('shell.signOut.label')"
            @click="handleUserAction('sign-out')"
          />
        </template>
        <RouterView />
      </VaAppShell>

      <VaAppearanceSettings
        v-model="appearanceOpen"
        :controller="appearance"
        :shell-controller="shellPreferences"
      />
      <VaFeedbackHost />
    </VDefaultsProvider>
  </VelaLocaleProvider>
</template>
