<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import {
  VApp,
  VAppBar,
  VAppBarTitle,
  VIcon,
  VIconBtn,
  VList,
  VListItem,
  VMain,
  VMenu,
  VNavigationDrawer,
  VSpacer,
  VTabs,
  VTab,
} from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { velaShellMetrics } from '@vela-admin/theme'
import { VaAvatar } from '@vela-admin/ui'

import VaCommandPalette from './VaCommandPalette.vue'
import VaNavItems from './VaNavItems.vue'
import { findNavigationPath, flattenNavigation, topNavigationDestinations } from './navigation'
import type {
  NavigationItem,
  ShellContentSpacing,
  ShellContentWidth,
  ShellHeaderStyle,
  ShellLayout,
  ShellPageMode,
  ShellUser,
} from './types'

const props = withDefaults(
  defineProps<{
    appName: string
    navigation: readonly NavigationItem[]
    activeId?: string | undefined
    user?: ShellUser | undefined
    layout?: ShellLayout
    contentWidth?: ShellContentWidth
    contentSpacing?: ShellContentSpacing
    headerStyle?: ShellHeaderStyle
    pageMode?: ShellPageMode
    rail?: boolean
    searchShortcut?: string
    drawerWidth?: string | number
    drawerRailWidth?: string | number
    headerHeight?: string | number
  }>(),
  {
    activeId: undefined,
    user: undefined,
    layout: 'sidebar',
    contentWidth: 'boxed',
    contentSpacing: 'comfortable',
    headerStyle: 'floating',
    pageMode: 'document',
    rail: false,
    searchShortcut: 'k',
    drawerWidth: velaShellMetrics.sidebarWidth,
    drawerRailWidth: velaShellMetrics.sidebarRailWidth,
    headerHeight: velaShellMetrics.headerHeight,
  },
)

const emit = defineEmits<{
  navigate: [item: NavigationItem]
  settings: []
  'user-action': [action: string]
}>()

const { mdAndDown } = useDisplay()
const locale = useVelaLocale()
const drawer = ref(true)
const searchOpen = ref(false)
const navigationScrolled = ref(false)
const effectiveRail = computed(() => props.layout === 'compact' || (props.rail && !mdAndDown.value))
const topLevelDestinations = computed(() => topNavigationDestinations(props.navigation))
const activeItem = computed(() =>
  flattenNavigation(props.navigation).find((item) => item.id === props.activeId),
)
const navigationPath = computed(() =>
  props.activeId ? findNavigationPath(props.navigation, props.activeId) : [],
)
const effectivePageMode = computed(() => activeItem.value?.pageMode ?? props.pageMode)

watch(
  mdAndDown,
  (mobile) => {
    drawer.value = !mobile
  },
  { immediate: true },
)

function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === props.searchShortcut) {
    event.preventDefault()
    searchOpen.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
})

function navigate(item: NavigationItem): void {
  emit('navigate', item)
  if (mdAndDown.value) drawer.value = false
}

function onNavigationScroll(event: Event): void {
  navigationScrolled.value = (event.currentTarget as HTMLElement).scrollTop > 1
}
</script>

<template>
  <VApp
    class="va-app-shell"
    :class="[
      `va-app-shell--content-${contentWidth}`,
      `va-app-shell--spacing-${contentSpacing}`,
      `va-app-shell--header-${headerStyle}`,
      `va-app-shell--layout-${layout}`,
      `va-app-shell--page-${effectivePageMode}`,
    ]"
  >
    <VNavigationDrawer
      v-if="layout !== 'topbar'"
      v-model="drawer"
      :aria-label="locale.t('shell.navigation.primary')"
      class="va-app-shell__drawer"
      :rail="effectiveRail"
      :rail-width="drawerRailWidth"
      :temporary="mdAndDown"
      :width="drawerWidth"
    >
      <div class="va-app-shell__brand">
        <slot name="brand">
          <span class="va-app-shell__brand-mark" aria-hidden="true">V</span>
          <strong v-if="!effectiveRail" class="va-app-shell__brand-name">{{ appName }}</strong>
        </slot>
      </div>
      <div
        class="va-app-shell__navigation-region"
        :class="{ 'va-app-shell__navigation-region--scrolled': navigationScrolled }"
      >
        <VList
          class="va-app-shell__navigation"
          nav
          role="presentation"
          @scroll.passive="onNavigationScroll"
        >
          <VaNavItems
            :active-id="activeId"
            :items="navigation"
            :rail="effectiveRail"
            @navigate="navigate"
          />
        </VList>
      </div>
      <template #append>
        <div class="va-app-shell__drawer-footer">
          <VListItem
            class="va-nav-item va-nav-item--settings"
            link
            prepend-icon="$settings"
            role="button"
            :title="locale.t('shell.settings.label')"
            @click="emit('settings')"
          />
        </div>
      </template>
    </VNavigationDrawer>

    <VAppBar class="va-app-shell__header" elevation="0" :height="headerHeight">
      <div class="va-app-shell__header-surface">
        <VIconBtn
          v-if="layout !== 'topbar'"
          :aria-label="
            drawer ? locale.t('shell.navigation.close') : locale.t('shell.navigation.open')
          "
          class="va-app-shell__header-action"
          icon="$menu"
          variant="text"
          @click="drawer = !drawer"
        />
        <div v-if="layout === 'topbar'" class="va-app-shell__topbar-brand">
          <slot name="brand">
            <span class="va-app-shell__brand-mark" aria-hidden="true">V</span>
            <strong class="va-app-shell__brand-name">{{ appName }}</strong>
          </slot>
        </div>
        <VAppBarTitle v-else class="va-app-shell__title">
          <nav
            v-if="navigationPath.length"
            :aria-label="locale.t('shell.breadcrumbs.label')"
            class="va-app-shell__breadcrumbs"
          >
            <ol>
              <li v-for="(item, index) in navigationPath" :key="item.id">
                <span v-if="index" aria-hidden="true" class="va-app-shell__breadcrumb-divider"
                  >/</span
                >
                <button
                  v-if="item.href && item.id !== activeId"
                  class="va-app-shell__breadcrumb-link"
                  type="button"
                  @click="navigate(item)"
                >
                  {{ item.label }}
                </button>
                <span v-else :aria-current="item.id === activeId ? 'page' : undefined">
                  {{ item.label }}
                </span>
              </li>
            </ol>
          </nav>
          <span v-else>{{ appName }}</span>
        </VAppBarTitle>
        <VTabs
          v-if="layout === 'topbar'"
          class="va-app-shell__topbar-navigation"
          :model-value="activeId"
          show-arrows
        >
          <VTab
            v-for="item in topLevelDestinations"
            :key="item.id"
            :value="item.id"
            @click="navigate(item)"
          >
            <VIcon v-if="item.icon" :icon="item.icon" size="18" start />
            {{ item.label }}
          </VTab>
        </VTabs>
        <VSpacer />
        <div v-if="$slots['header-actions']" class="va-app-shell__header-extra-actions">
          <slot name="header-actions" />
        </div>
        <VIconBtn
          :aria-label="locale.t('shell.search.label')"
          class="va-app-shell__header-action"
          icon="$search"
          variant="text"
          @click="searchOpen = true"
        />
        <VIconBtn
          :aria-label="locale.t('shell.settings.label')"
          class="va-app-shell__header-action"
          icon="$settings"
          variant="text"
          @click="emit('settings')"
        />
        <VMenu v-if="user" location="bottom end">
          <template #activator="{ props: activatorProps }">
            <button v-bind="activatorProps" class="va-app-shell__user" type="button">
              <VaAvatar :image="user.avatar" :name="user.name" size="36" />
              <span class="va-app-shell__user-copy">
                <strong>{{ user.name }}</strong>
                <small v-if="user.subtitle">{{ user.subtitle }}</small>
              </span>
            </button>
          </template>
          <VList min-width="200">
            <slot name="user-menu">
              <VListItem
                prepend-icon="$account"
                :title="locale.t('shell.profile.label')"
                @click="emit('user-action', 'profile')"
              />
              <VListItem
                prepend-icon="$logout"
                :title="locale.t('shell.signOut.label')"
                @click="emit('user-action', 'sign-out')"
              />
            </slot>
          </VList>
        </VMenu>
      </div>
    </VAppBar>

    <VMain class="va-app-shell__main">
      <div class="va-app-shell__workspace-frame">
        <div v-if="$slots.tabs" class="va-app-shell__tabs">
          <slot name="tabs" />
        </div>
        <div class="va-app-shell__content">
          <slot />
        </div>
      </div>
    </VMain>

    <VaCommandPalette v-model="searchOpen" :items="navigation" @navigate="navigate" />
  </VApp>
</template>

<style>
.va-app-shell {
  --va-shell-content-padding: var(--v-shell-content-padding-comfortable);

  background: rgb(var(--v-theme-background));
}

.va-app-shell--spacing-compact {
  --va-shell-content-padding: var(--v-shell-content-padding-compact);
}

.va-app-shell--spacing-spacious {
  --va-shell-content-padding: var(--v-shell-content-padding-spacious);
}

.va-app-shell__drawer {
  color: rgb(var(--v-theme-on-navigation));
  background: rgb(var(--v-theme-navigation)) !important;
  border-inline-end: 0;
  box-shadow: var(--v-shadow-floating);
  transition:
    inline-size var(--v-motion-duration-standard) var(--v-motion-easing-standard),
    transform var(--v-motion-duration-standard) var(--v-motion-easing-standard);
}

.va-app-shell__drawer .v-navigation-drawer__content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

html[data-vela-skin='bordered'] .va-app-shell__drawer {
  border-inline-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: none;
}

html[data-vela-skin='semi-dark'] .va-app-shell__drawer {
  color: rgb(var(--v-theme-on-navigation-dark));
  background: rgb(var(--v-theme-navigation-dark)) !important;
  box-shadow: none;
}

.va-app-shell__brand {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  min-block-size: var(--v-shell-header-height);
  padding-inline: calc(var(--v-shell-nav-inline-padding) + var(--v-space-1));
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.v-navigation-drawer--rail .va-app-shell__brand {
  justify-content: center;
  padding-inline: var(--v-space-2);
}

.va-app-shell__brand-mark {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  inline-size: var(--v-control-height-md);
  block-size: var(--v-control-height-md);
  color: rgb(var(--v-theme-on-primary));
  font-weight: var(--v-font-weight-bold);
  background: linear-gradient(
    145deg,
    rgb(var(--v-theme-primary-lighten-1)),
    rgb(var(--v-theme-primary-darken-1))
  );
  border-radius: var(--v-radius-md);
  box-shadow: var(--v-shell-nav-active-shadow);
}

.va-app-shell__brand-name {
  overflow: hidden;
  font-size: var(--v-font-size-lg);
  font-weight: var(--v-font-weight-bold);
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-app-shell__navigation {
  block-size: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--v-space-2) var(--v-shell-nav-inline-padding) var(--v-space-4);
  scrollbar-gutter: stable;
}

.va-app-shell__navigation-region {
  position: relative;
  flex: 1 1 auto;
  min-block-size: 0;
}

.va-app-shell__navigation-region::before {
  position: absolute;
  z-index: var(--v-shell-nav-scroll-fade-layer);
  block-size: var(--v-shell-nav-scroll-fade-height);
  pointer-events: none;
  content: '';
  background: linear-gradient(
    to bottom,
    rgb(var(--v-theme-navigation)) 8%,
    rgba(var(--v-theme-navigation), 0)
  );
  opacity: 0;
  transition: opacity var(--v-motion-duration-fast) var(--v-motion-easing-standard);
  inset: 0 0 auto;
}

.va-app-shell__navigation-region--scrolled::before {
  opacity: 1;
}

html[data-vela-skin='semi-dark'] .va-app-shell__navigation-region::before {
  background: linear-gradient(
    to bottom,
    rgb(var(--v-theme-navigation-dark)) 8%,
    rgba(var(--v-theme-navigation-dark), 0)
  );
}

.va-app-shell__navigation .va-nav-item,
.va-app-shell__drawer-footer .va-nav-item {
  --v-list-prepend-gap: var(--v-space-3);

  min-block-size: var(--v-shell-nav-item-height);
  padding-inline: var(--v-space-3);
  margin-block: calc(var(--v-shell-nav-item-gap) / 2);
  color: inherit;
  font-size: var(--v-font-size-sm);
  font-weight: var(--v-font-weight-medium);
  border-radius: var(--v-shell-nav-item-radius);
  transition:
    color var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    background-color var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    box-shadow var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    transform var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-app-shell__navigation .va-nav-item .v-icon,
.va-app-shell__drawer-footer .va-nav-item .v-icon {
  font-size: var(--v-shell-nav-icon-size);
  opacity: var(--v-medium-emphasis-opacity);
}

.va-app-shell__navigation .va-nav-item:hover,
.va-app-shell__drawer-footer .va-nav-item:hover {
  background: rgba(var(--v-theme-primary), var(--v-hover-opacity));
  transform: translateX(var(--v-shell-nav-hover-offset));
}

html[data-vela-skin='semi-dark'] .va-app-shell__navigation .va-nav-item:hover,
html[data-vela-skin='semi-dark'] .va-app-shell__drawer-footer .va-nav-item:hover {
  background: rgba(var(--v-theme-on-navigation-dark), var(--v-hover-opacity));
}

.va-app-shell__navigation .va-nav-item--link.v-list-item--active {
  color: rgb(var(--v-theme-on-primary));
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary-lighten-1)),
    rgb(var(--v-theme-primary)) 52%,
    rgb(var(--v-theme-primary-darken-1))
  );
  box-shadow: var(--v-shell-nav-active-shadow);
  transform: none;
}

.va-app-shell__navigation .va-nav-item--link.v-list-item--active .v-icon {
  opacity: 1;
}

.va-app-shell__navigation .va-nav-item--group.v-list-item--active {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), var(--v-selected-opacity));
}

.va-app-shell__navigation .va-nav-section + .va-nav-section {
  margin-block-start: var(--v-shell-nav-section-gap);
}

.va-app-shell__navigation .va-nav-section__title {
  min-block-size: auto;
  padding-inline: var(--v-space-3);
  margin-block: var(--v-space-3) var(--v-space-2);
  color: rgba(var(--v-theme-on-navigation), var(--v-shell-nav-section-opacity));
  font-size: var(--v-font-size-xs);
  font-weight: var(--v-font-weight-semibold);
  letter-spacing: 0.075em;
  line-height: var(--v-line-height-tight);
  text-transform: uppercase;
}

html[data-vela-skin='semi-dark'] .va-app-shell__navigation .va-nav-section__title {
  color: rgba(var(--v-theme-on-navigation-dark), var(--v-shell-nav-section-opacity));
}

.va-app-shell__navigation .va-nav-section__divider {
  margin-block: var(--v-space-3);
  opacity: var(--v-disabled-opacity);
}

.v-navigation-drawer--rail .va-app-shell__navigation {
  padding-inline: var(--v-space-2);
}

.v-navigation-drawer--rail .va-app-shell__navigation .va-nav-item,
.v-navigation-drawer--rail .va-app-shell__drawer-footer .va-nav-item {
  justify-content: center;
  padding-inline: var(--v-space-2);
}

.v-navigation-drawer--rail .va-app-shell__navigation .va-nav-item:hover,
.v-navigation-drawer--rail .va-app-shell__drawer-footer .va-nav-item:hover {
  transform: none;
}

.va-app-shell__drawer-footer {
  padding: var(--v-space-3) var(--v-shell-nav-inline-padding);
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-app-shell__header {
  background: transparent !important;
  box-shadow: none !important;
}

.va-app-shell__header .v-toolbar__content {
  padding: 0;
  overflow: visible;
}

.va-app-shell__header-surface {
  display: flex;
  gap: var(--v-space-1);
  align-items: center;
  inline-size: calc(100% - (2 * var(--va-shell-content-padding)));
  max-inline-size: var(--v-shell-content-max-width);
  min-block-size: calc(var(--v-shell-header-height) - var(--v-space-3));
  padding-inline: var(--v-space-3);
  margin: var(--v-space-2) auto var(--v-space-1);
  background: rgba(var(--v-theme-surface), var(--v-surface-opacity-strong));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-floating);
  backdrop-filter: blur(var(--v-space-3));
}

.va-app-shell--content-fluid .va-app-shell__header-surface,
.va-app-shell--content-fluid .va-app-shell__content {
  max-inline-size: none;
}

.va-app-shell--header-attached .va-app-shell__header-surface {
  inline-size: 100%;
  min-block-size: var(--v-shell-header-height);
  padding-inline: var(--va-shell-content-padding);
  margin: 0;
  border-block-start: 0;
  border-inline: 0;
  border-radius: 0;
  box-shadow: 0 var(--v-space-1) var(--v-space-3) rgba(var(--v-shadow-color), 0.05);
  backdrop-filter: blur(var(--v-space-4));
}

html[data-vela-skin='bordered'] .va-app-shell__header-surface {
  box-shadow: none;
}

.va-app-shell__header-action {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  transition:
    color var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    background-color var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    transform var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-app-shell__header-action:hover {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), var(--v-hover-opacity));
  transform: translateY(calc(0px - var(--v-shell-nav-hover-offset)));
}

.va-app-shell__title {
  font-size: var(--v-font-size-md);
  font-weight: var(--v-font-weight-semibold);
  letter-spacing: -0.01em;
}

.va-app-shell__breadcrumbs {
  min-inline-size: 0;
}

.va-app-shell__breadcrumbs ol,
.va-app-shell__breadcrumbs li {
  display: flex;
  align-items: center;
  min-inline-size: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

.va-app-shell__breadcrumbs ol {
  overflow: hidden;
}

.va-app-shell__breadcrumbs li {
  flex: 0 1 auto;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-sm);
  white-space: nowrap;
}

.va-app-shell__breadcrumbs li:last-child {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-weight: var(--v-font-weight-semibold);
}

.va-app-shell__breadcrumbs li > span:last-child,
.va-app-shell__breadcrumb-link {
  overflow: hidden;
  text-overflow: ellipsis;
}

.va-app-shell__breadcrumb-divider {
  flex: 0 0 auto;
  padding-inline: var(--v-space-2);
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
}

.va-app-shell__breadcrumb-link {
  padding: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
  background: none;
  border: 0;
}

.va-app-shell__breadcrumb-link:hover {
  color: rgb(var(--v-theme-primary));
}

.va-app-shell__topbar-brand {
  display: flex;
  flex: 0 0 auto;
  gap: var(--v-space-3);
  align-items: center;
  padding-inline-end: var(--v-space-3);
  border-inline-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-app-shell__topbar-navigation {
  flex: 0 1 auto;
  min-inline-size: 0;
  max-inline-size: min(52vw, 46rem);
}

.va-app-shell__topbar-navigation .v-tab {
  min-inline-size: auto;
  padding-inline: var(--v-space-3);
  font-size: var(--v-font-size-sm);
  letter-spacing: 0;
  text-transform: none;
}

.va-app-shell__user {
  display: flex;
  gap: var(--v-space-2);
  align-items: center;
  padding: var(--v-space-1) var(--v-space-2);
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--v-radius-md);
  transition: background-color var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-app-shell__user:hover {
  background: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}

.va-app-shell__user-copy {
  display: grid;
  max-inline-size: 10rem;
}

.va-app-shell__user-copy strong,
.va-app-shell__user-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-app-shell__user-copy strong {
  font-size: var(--v-font-size-sm);
}

.va-app-shell__user-copy small {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
}

.va-app-shell__main {
  min-inline-size: 0;
}

.va-app-shell__workspace-frame {
  min-block-size: 100%;
}

.va-app-shell__tabs {
  inline-size: 100%;
  max-inline-size: var(--v-shell-content-max-width);
  min-inline-size: 0;
  padding: var(--v-space-2) var(--va-shell-content-padding) 0;
  margin-inline: auto;
}

.va-app-shell__content {
  inline-size: 100%;
  max-inline-size: var(--v-shell-content-max-width);
  min-block-size: 100%;
  padding: var(--va-shell-content-padding);
  margin-inline: auto;
}

.va-app-shell--content-fluid .va-app-shell__tabs {
  max-inline-size: none;
}

.va-app-shell--page-workspace .va-app-shell__main {
  block-size: 100dvh;
  min-block-size: 0;
  overflow: hidden;
}

.va-app-shell--page-workspace .va-app-shell__workspace-frame {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  block-size: 100%;
  min-block-size: 0;
  overflow: hidden;
}

.va-app-shell--page-workspace .va-app-shell__content {
  block-size: 100%;
  min-block-size: 0;
  padding-block-start: var(--v-space-3);
  overflow: hidden;
}

@media (max-width: 599px) {
  .va-app-shell__header-surface {
    inline-size: calc(100% - (2 * var(--v-space-3)));
    padding-inline: var(--v-space-2);
  }

  .va-app-shell__content {
    padding: var(--v-space-4);
  }

  .va-app-shell__header-extra-actions {
    display: none;
  }

  .va-app-shell__user-copy {
    display: none;
  }

  .va-app-shell__topbar-brand .va-app-shell__brand-name {
    display: none;
  }

  .va-app-shell__topbar-brand {
    padding-inline-end: var(--v-space-1);
    border-inline-end: 0;
  }
}
</style>
