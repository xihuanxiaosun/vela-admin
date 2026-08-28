<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { mdiCloudCheckOutline } from '@mdi/js'
import { VDefaultsProvider, VIcon, VList, VListItem, VMenu } from 'vuetify/components'
import { createWebStorageAdapter } from '@vela-admin/adapters'
import { useVelaLocale, VelaLocaleProvider } from '@vela-admin/locale'
import {
  VaAppShell,
  VaAppearanceSettings,
  VaWorkspaceTabs,
  createShellPreferencesController,
  flattenNavigation,
  type NavigationItem,
  type WorkspaceTab,
  useWorkspaceTabs,
} from '@vela-admin/shell'
import { useVelaAppearance } from '@vela-admin/theme'
import { useFeedback, VaButton, VaFeedbackHost } from '@vela-admin/ui'

import {
  createPlaygroundNavigation,
  isPlaygroundPage,
  type PlaygroundPage,
} from './demo/navigation'

const ComponentsDemo = defineAsyncComponent(() => import('./components/ComponentsDemo.vue'))
const DataDemo = defineAsyncComponent(() => import('./components/DataDemo.vue'))
const FormDemo = defineAsyncComponent(() => import('./components/FormDemo.vue'))
const FinanceDemo = defineAsyncComponent(() => import('./components/FinanceDemo.vue'))
const ModerationDemo = defineAsyncComponent(() => import('./components/ModerationDemo.vue'))
const OverviewDemo = defineAsyncComponent(() => import('./components/OverviewDemo.vue'))
const UploadDemo = defineAsyncComponent(() => import('./components/UploadDemo.vue'))
const UsersDemo = defineAsyncComponent(() => import('./components/UsersDemo.vue'))
const WideDataDemo = defineAsyncComponent(() => import('./components/WideDataDemo.vue'))

const storage = createWebStorageAdapter(window.localStorage, { namespace: 'vela-playground' })
const appearance = useVelaAppearance({ storage })
const shellPreferences = createShellPreferencesController({ storage })
const feedback = useFeedback()
const locale = useVelaLocale()
const playgroundNavigation = computed(() => createPlaygroundNavigation(locale.t))
const activePage = ref<PlaygroundPage>('overview')
const settingsOpen = ref(false)
const workspaceTabs = useWorkspaceTabs({
  initialItems: [
    {
      id: 'overview',
      label: locale.t('playground.nav.overview'),
      pinned: true,
      href: '#overview',
    },
  ],
  initialActiveId: 'overview',
  maxItems: 8,
})
const localeOptions = computed(() => [
  { code: 'en', label: locale.t('playground.locale.english') },
  { code: 'zh-CN', label: locale.t('playground.locale.chineseNative') },
])
const localeShortLabel = computed(() => {
  if (locale.locale.value === 'zh-CN') return '中文'
  if (locale.locale.value === 'ar') return 'AR'
  return 'EN'
})
const localizedWorkspaceTabs = computed(() =>
  workspaceTabs.items.value.map((tab) => ({
    ...tab,
    label: navigationForPage(tab.id as PlaygroundPage)?.label ?? tab.label,
  })),
)

function tabFromNavigation(item: NavigationItem): WorkspaceTab {
  return {
    id: item.id,
    label: item.label,
    ...(item.icon ? { icon: item.icon } : {}),
    ...(item.href ? { href: item.href } : {}),
    closable: item.id !== 'overview',
    pinned: item.id === 'overview',
  }
}

function navigationForPage(page: PlaygroundPage): NavigationItem | undefined {
  return flattenNavigation(playgroundNavigation.value).find((item) => item.id === page)
}

function visit(page: PlaygroundPage): void {
  activePage.value = page
  const item = navigationForPage(page)
  if (item) workspaceTabs.open(tabFromNavigation(item))
}

function pageFromHash(): PlaygroundPage {
  const value = window.location.hash.slice(1)
  return isPlaygroundPage(value) ? value : 'overview'
}

function syncHash(): void {
  visit(pageFromHash())
}

function navigate(item: NavigationItem): void {
  if (!isPlaygroundPage(item.id)) return
  visit(item.id)
  window.history.replaceState(null, '', `#${item.id}`)
}

function navigateTab(tab: WorkspaceTab): void {
  if (!isPlaygroundPage(tab.id)) return
  visit(tab.id)
  window.history.replaceState(null, '', `#${tab.id}`)
}

function closeTab(tab: WorkspaceTab): void {
  const nextId = workspaceTabs.close(tab.id)
  if (!nextId || !isPlaygroundPage(nextId) || nextId === activePage.value) return
  visit(nextId)
  window.history.replaceState(null, '', `#${nextId}`)
}

function handleUserAction(action: string): void {
  feedback.toast.info(
    locale.t(
      action === 'profile' ? 'playground.app.profileAction' : 'playground.app.signOutAction',
    ),
  )
}

async function confirmDeletion(): Promise<void> {
  const accepted = await feedback.confirm({
    title: locale.t('playground.app.deleteTitle'),
    message: locale.t('playground.app.deleteMessage'),
    confirmText: locale.t('playground.app.deleteConfirm'),
    intent: 'danger',
  })
  if (accepted) feedback.toast.success(locale.t('playground.app.deleteSuccess'))
}

async function promptForName(): Promise<void> {
  const value = await feedback.prompt({
    title: locale.t('playground.app.renameTitle'),
    message: locale.t('playground.app.renameMessage'),
    label: locale.t('playground.app.renameLabel'),
    initialValue: locale.t('playground.app.renameInitial'),
    confirmText: locale.t('playground.app.renameConfirm'),
    validate: (name) =>
      name.trim().length < 3 ? locale.t('playground.app.renameValidation') : undefined,
  })
  if (value) feedback.toast.success(locale.t('playground.app.renameSuccess', { name: value }))
}

onMounted(() => {
  syncHash()
  window.addEventListener('hashchange', syncHash)
})
onBeforeUnmount(() => window.removeEventListener('hashchange', syncHash))
</script>

<template>
  <VelaLocaleProvider>
    <VDefaultsProvider :defaults="appearance.vuetifyDefaults.value">
      <VaAppShell
        :active-id="activePage"
        app-name="Vela Admin Kit"
        :content-spacing="shellPreferences.preferences.value.contentSpacing"
        :content-width="shellPreferences.preferences.value.contentWidth"
        :header-style="shellPreferences.preferences.value.headerStyle"
        :layout="shellPreferences.preferences.value.layout"
        :navigation="playgroundNavigation"
        :user="{ id: 'demo', name: 'Maya Chen', subtitle: locale.t('playground.app.userSubtitle') }"
        @navigate="navigate"
        @settings="settingsOpen = true"
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
          <div class="playground-connection" :aria-label="locale.t('playground.app.readyAria')">
            <span />
            <VIcon :icon="mdiCloudCheckOutline" size="18" />
            <strong>{{ locale.t('playground.app.ready') }}</strong>
          </div>
        </template>

        <template #tabs>
          <VaWorkspaceTabs
            :items="localizedWorkspaceTabs"
            :model-value="activePage"
            @close="closeTab"
            @navigate="navigateTab"
          />
        </template>

        <OverviewDemo v-if="activePage === 'overview'" />
        <UsersDemo v-else-if="activePage === 'users'" @message="feedback.toast.success" />
        <DataDemo v-else-if="activePage === 'data'" @message="feedback.toast.info" />
        <FinanceDemo v-else-if="activePage === 'finance'" @message="feedback.toast.info" />
        <ModerationDemo v-else-if="activePage === 'moderation'" @message="feedback.toast.info" />
        <WideDataDemo v-else-if="activePage === 'wide-data'" @message="feedback.toast.info" />
        <FormDemo v-else-if="activePage === 'forms'" @message="feedback.toast.success" />
        <UploadDemo v-else-if="activePage === 'upload'" />
        <ComponentsDemo
          v-else
          @confirm="confirmDeletion"
          @message="feedback.toast.success"
          @prompt="promptForName"
        />
      </VaAppShell>

      <VaAppearanceSettings
        v-model="settingsOpen"
        :controller="appearance"
        :shell-controller="shellPreferences"
      />
      <VaFeedbackHost />
    </VDefaultsProvider>
  </VelaLocaleProvider>
</template>
