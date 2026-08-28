<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  VAlert,
  VBtn,
  VBtnToggle,
  VColorPicker,
  VDivider,
  VSlider,
  VTab,
  VTabs,
} from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import {
  velaPalette,
  type VelaAppearanceController,
  type VelaAppearanceDensity,
  type VelaContrastPreference,
  type VelaFontScalePreference,
  type VelaMotionPreference,
  type VelaRadiusPreference,
  type VelaSkinPreference,
  type VelaThemeMode,
} from '@vela-admin/theme'
import { VaButton, VaModal } from '@vela-admin/ui'

import type { ShellPreferencesController } from './shell-preferences'
import type { ShellContentSpacing, ShellContentWidth, ShellHeaderStyle, ShellLayout } from './types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    controller: VelaAppearanceController
    shellController?: ShellPreferencesController | undefined
    title?: string | undefined
    description?: string | undefined
  }>(),
  {
    title: undefined,
    description: undefined,
    shellController: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const customColorOpen = ref(false)
const activeTab = ref<'appearance' | 'layout' | 'accessibility'>('appearance')
const locale = useVelaLocale()
const preferences = computed(() => props.controller.preferences.value)
const opacity = computed(() => Math.round(preferences.value.surfaceOpacity * 100))
const resolvedTitle = computed(() => props.title ?? locale.t('shell.appearance.title'))
const resolvedDescription = computed(
  () => props.description ?? locale.t('shell.appearance.description'),
)
const primaryPresets = computed(() => [
  { label: locale.t('shell.appearance.color.indigo'), value: velaPalette.indigo[600] },
  { label: locale.t('shell.appearance.color.blue'), value: velaPalette.blue[600] },
  { label: locale.t('shell.appearance.color.emerald'), value: velaPalette.emerald[600] },
  { label: locale.t('shell.appearance.color.amber'), value: velaPalette.amber[600] },
  { label: locale.t('shell.appearance.color.rose'), value: velaPalette.rose[600] },
])
const skinPresets = computed<
  readonly { value: VelaSkinPreference; label: string; description: string }[]
>(() => [
  {
    value: 'default',
    label: locale.t('shell.appearance.skin.soft'),
    description: locale.t('shell.appearance.skin.softDescription'),
  },
  {
    value: 'bordered',
    label: locale.t('shell.appearance.skin.bordered'),
    description: locale.t('shell.appearance.skin.borderedDescription'),
  },
  {
    value: 'semi-dark',
    label: locale.t('shell.appearance.skin.semiDark'),
    description: locale.t('shell.appearance.skin.semiDarkDescription'),
  },
])
const shellPreferences = computed(() => props.shellController?.preferences.value)
const layoutPresets = computed<
  readonly { value: ShellLayout; label: string; description: string }[]
>(() => [
  {
    value: 'sidebar',
    label: locale.t('shell.appearance.layout.sidebar'),
    description: locale.t('shell.appearance.layout.sidebarDescription'),
  },
  {
    value: 'compact',
    label: locale.t('shell.appearance.layout.compact'),
    description: locale.t('shell.appearance.layout.compactDescription'),
  },
  {
    value: 'topbar',
    label: locale.t('shell.appearance.layout.topbar'),
    description: locale.t('shell.appearance.layout.topbarDescription'),
  },
])

function update(patch: Parameters<VelaAppearanceController['set']>[0]): void {
  void props.controller.set(patch).catch(() => undefined)
}

function setMode(value: VelaThemeMode): void {
  update({ mode: value })
}

function setDensity(value: VelaAppearanceDensity): void {
  update({ density: value })
}

function setSkin(value: VelaSkinPreference): void {
  update({ skin: value })
}

function setRadius(value: VelaRadiusPreference): void {
  update({ radius: value })
}

function setMotion(value: VelaMotionPreference): void {
  update({ motion: value })
}

function setFontScale(value: VelaFontScalePreference): void {
  update({ fontScale: value })
}

function setContrast(value: VelaContrastPreference): void {
  update({ contrast: value })
}

function setPrimary(value: string): void {
  update({ primary: value })
}

function setOpacity(value: number): void {
  update({ surfaceOpacity: value / 100 })
}

function updateShell(patch: Parameters<ShellPreferencesController['set']>[0]): void {
  void props.shellController?.set(patch).catch(() => undefined)
}

function setLayout(value: ShellLayout): void {
  updateShell({ layout: value })
}

function setContentWidth(value: ShellContentWidth): void {
  updateShell({ contentWidth: value })
}

function setHeaderStyle(value: ShellHeaderStyle): void {
  updateShell({ headerStyle: value })
}

function setContentSpacing(value: ShellContentSpacing): void {
  updateShell({ contentSpacing: value })
}

function reset(): void {
  void props.controller.reset().catch(() => undefined)
  void props.shellController?.reset().catch(() => undefined)
}
</script>

<template>
  <VaModal
    :description="resolvedDescription"
    :model-value="modelValue"
    :title="resolvedTitle"
    width="820"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="va-appearance-settings">
      <VAlert
        v-if="controller.error.value || shellController?.error.value"
        density="compact"
        :text="locale.t('shell.appearance.saveError')"
        type="warning"
      />

      <VTabs v-model="activeTab" class="va-appearance-settings__tabs" color="primary" grow>
        <VTab value="appearance">{{ locale.t('shell.appearance.tab.appearance') }}</VTab>
        <VTab v-if="shellController" value="layout">
          {{ locale.t('shell.appearance.tab.layout') }}
        </VTab>
        <VTab value="accessibility">{{ locale.t('shell.appearance.tab.accessibility') }}</VTab>
      </VTabs>

      <div v-show="activeTab === 'appearance'" class="va-appearance-settings__pane">
        <section class="va-appearance-settings__section">
          <div class="va-appearance-settings__heading">
            <h3>{{ locale.t('shell.appearance.mode.title') }}</h3>
            <p>{{ locale.t('shell.appearance.mode.description') }}</p>
          </div>
          <VBtnToggle
            class="va-appearance-settings__segments"
            color="primary"
            divided
            mandatory
            :model-value="preferences.mode"
            variant="outlined"
            @update:model-value="setMode"
          >
            <VBtn value="system">{{ locale.t('shell.appearance.mode.system') }}</VBtn>
            <VBtn value="light">{{ locale.t('shell.appearance.mode.light') }}</VBtn>
            <VBtn value="dark">{{ locale.t('shell.appearance.mode.dark') }}</VBtn>
          </VBtnToggle>
        </section>

        <VDivider />

        <section class="va-appearance-settings__section">
          <div class="va-appearance-settings__heading">
            <h3>{{ locale.t('shell.appearance.color.title') }}</h3>
            <p>{{ locale.t('shell.appearance.color.description') }}</p>
          </div>
          <div
            :aria-label="locale.t('shell.appearance.color.group')"
            class="va-appearance-settings__swatches"
            role="group"
          >
            <button
              v-for="preset in primaryPresets"
              :key="preset.value"
              :aria-label="preset.label"
              :aria-pressed="preferences.primary === preset.value"
              class="va-appearance-settings__swatch"
              :class="{
                'va-appearance-settings__swatch--active': preferences.primary === preset.value,
              }"
              :style="{ '--va-swatch': preset.value }"
              type="button"
              @click="setPrimary(preset.value)"
            />
            <VaButton
              appearance="text"
              intent="neutral"
              @click="customColorOpen = !customColorOpen"
            >
              {{ locale.t('shell.appearance.color.custom') }}
            </VaButton>
          </div>
          <VColorPicker
            v-if="customColorOpen"
            class="va-appearance-settings__picker"
            hide-inputs
            :model-value="preferences.primary"
            mode="hex"
            @update:model-value="setPrimary"
          />
        </section>

        <VDivider />

        <section class="va-appearance-settings__section">
          <div class="va-appearance-settings__heading">
            <h3>{{ locale.t('shell.appearance.skin.title') }}</h3>
            <p>{{ locale.t('shell.appearance.skin.description') }}</p>
          </div>
          <div
            :aria-label="locale.t('shell.appearance.skin.title')"
            class="va-appearance-settings__skins"
            role="radiogroup"
          >
            <button
              v-for="skin in skinPresets"
              :key="skin.value"
              :aria-checked="preferences.skin === skin.value"
              class="va-appearance-settings__skin"
              :class="{
                'va-appearance-settings__skin--active': preferences.skin === skin.value,
                [`va-appearance-settings__skin--${skin.value}`]: true,
              }"
              role="radio"
              type="button"
              @click="setSkin(skin.value)"
            >
              <span class="va-appearance-settings__skin-preview" aria-hidden="true">
                <i class="va-appearance-settings__skin-nav" />
                <i class="va-appearance-settings__skin-header" />
                <i class="va-appearance-settings__skin-content" />
              </span>
              <strong>{{ skin.label }}</strong>
              <small>{{ skin.description }}</small>
            </button>
          </div>
        </section>

        <VDivider />

        <div class="va-appearance-settings__grid">
          <section class="va-appearance-settings__section">
            <div class="va-appearance-settings__heading">
              <h3>{{ locale.t('shell.appearance.density.title') }}</h3>
              <p>{{ locale.t('shell.appearance.density.description') }}</p>
            </div>
            <VBtnToggle
              class="va-appearance-settings__segments"
              color="primary"
              divided
              mandatory
              :model-value="preferences.density"
              variant="outlined"
              @update:model-value="setDensity"
            >
              <VBtn value="compact">{{ locale.t('shell.appearance.density.compact') }}</VBtn>
              <VBtn value="comfortable">
                {{ locale.t('shell.appearance.density.comfortable') }}
              </VBtn>
              <VBtn value="default">{{ locale.t('shell.appearance.density.default') }}</VBtn>
            </VBtnToggle>
          </section>

          <section class="va-appearance-settings__section">
            <div class="va-appearance-settings__heading">
              <h3>{{ locale.t('shell.appearance.radius.title') }}</h3>
              <p>{{ locale.t('shell.appearance.radius.description') }}</p>
            </div>
            <VBtnToggle
              class="va-appearance-settings__segments"
              color="primary"
              divided
              mandatory
              :model-value="preferences.radius"
              variant="outlined"
              @update:model-value="setRadius"
            >
              <VBtn value="compact">{{ locale.t('shell.appearance.radius.compact') }}</VBtn>
              <VBtn value="balanced">{{ locale.t('shell.appearance.radius.balanced') }}</VBtn>
              <VBtn value="soft">{{ locale.t('shell.appearance.radius.soft') }}</VBtn>
            </VBtnToggle>
          </section>
        </div>

        <VDivider />

        <section class="va-appearance-settings__section">
          <div class="va-appearance-settings__heading">
            <h3>{{ locale.t('shell.appearance.opacity.title') }}</h3>
            <p>{{ locale.t('shell.appearance.opacity.description') }}</p>
          </div>
          <VSlider
            :aria-label="locale.t('shell.appearance.opacity.title')"
            color="primary"
            hide-details
            :max="100"
            :min="72"
            :model-value="opacity"
            :step="1"
            thumb-label
            @update:model-value="setOpacity"
          />
        </section>
      </div>

      <div
        v-if="shellController && shellPreferences"
        v-show="activeTab === 'layout'"
        class="va-appearance-settings__pane"
      >
        <section class="va-appearance-settings__section">
          <div class="va-appearance-settings__heading">
            <h3>{{ locale.t('shell.appearance.layout.title') }}</h3>
            <p>{{ locale.t('shell.appearance.layout.description') }}</p>
          </div>
          <div
            :aria-label="locale.t('shell.appearance.layout.title')"
            class="va-appearance-settings__layouts"
            role="radiogroup"
          >
            <button
              v-for="layoutOption in layoutPresets"
              :key="layoutOption.value"
              :aria-checked="shellPreferences.layout === layoutOption.value"
              class="va-appearance-settings__layout"
              :class="[
                `va-appearance-settings__layout--${layoutOption.value}`,
                {
                  'va-appearance-settings__layout--active':
                    shellPreferences.layout === layoutOption.value,
                },
              ]"
              role="radio"
              type="button"
              @click="setLayout(layoutOption.value)"
            >
              <span class="va-appearance-settings__layout-preview" aria-hidden="true">
                <i class="va-appearance-settings__layout-nav" />
                <i class="va-appearance-settings__layout-header" />
                <i class="va-appearance-settings__layout-content" />
              </span>
              <strong>{{ layoutOption.label }}</strong>
              <small>{{ layoutOption.description }}</small>
            </button>
          </div>
        </section>

        <VDivider />

        <div class="va-appearance-settings__grid">
          <section class="va-appearance-settings__section">
            <div class="va-appearance-settings__heading">
              <h3>{{ locale.t('shell.appearance.contentWidth.title') }}</h3>
              <p>{{ locale.t('shell.appearance.contentWidth.description') }}</p>
            </div>
            <VBtnToggle
              class="va-appearance-settings__segments"
              color="primary"
              divided
              mandatory
              :model-value="shellPreferences.contentWidth"
              variant="outlined"
              @update:model-value="setContentWidth"
            >
              <VBtn value="boxed">{{ locale.t('shell.appearance.contentWidth.boxed') }}</VBtn>
              <VBtn value="fluid">{{ locale.t('shell.appearance.contentWidth.fluid') }}</VBtn>
            </VBtnToggle>
          </section>

          <section class="va-appearance-settings__section">
            <div class="va-appearance-settings__heading">
              <h3>{{ locale.t('shell.appearance.headerStyle.title') }}</h3>
              <p>{{ locale.t('shell.appearance.headerStyle.description') }}</p>
            </div>
            <VBtnToggle
              class="va-appearance-settings__segments"
              color="primary"
              divided
              mandatory
              :model-value="shellPreferences.headerStyle"
              variant="outlined"
              @update:model-value="setHeaderStyle"
            >
              <VBtn value="floating">{{ locale.t('shell.appearance.headerStyle.floating') }}</VBtn>
              <VBtn value="attached">{{ locale.t('shell.appearance.headerStyle.attached') }}</VBtn>
            </VBtnToggle>
          </section>

          <section class="va-appearance-settings__section">
            <div class="va-appearance-settings__heading">
              <h3>{{ locale.t('shell.appearance.contentSpacing.title') }}</h3>
              <p>{{ locale.t('shell.appearance.contentSpacing.description') }}</p>
            </div>
            <VBtnToggle
              class="va-appearance-settings__segments"
              color="primary"
              divided
              mandatory
              :model-value="shellPreferences.contentSpacing"
              variant="outlined"
              @update:model-value="setContentSpacing"
            >
              <VBtn value="compact">
                {{ locale.t('shell.appearance.contentSpacing.compact') }}
              </VBtn>
              <VBtn value="comfortable">
                {{ locale.t('shell.appearance.contentSpacing.comfortable') }}
              </VBtn>
              <VBtn value="spacious">
                {{ locale.t('shell.appearance.contentSpacing.spacious') }}
              </VBtn>
            </VBtnToggle>
          </section>
        </div>
      </div>

      <div v-show="activeTab === 'accessibility'" class="va-appearance-settings__pane">
        <div class="va-appearance-settings__grid">
          <section class="va-appearance-settings__section">
            <div class="va-appearance-settings__heading">
              <h3>{{ locale.t('shell.appearance.fontScale.title') }}</h3>
              <p>{{ locale.t('shell.appearance.fontScale.description') }}</p>
            </div>
            <VBtnToggle
              class="va-appearance-settings__segments"
              color="primary"
              divided
              mandatory
              :model-value="preferences.fontScale"
              variant="outlined"
              @update:model-value="setFontScale"
            >
              <VBtn value="small">{{ locale.t('shell.appearance.fontScale.small') }}</VBtn>
              <VBtn value="default">{{ locale.t('shell.appearance.fontScale.default') }}</VBtn>
              <VBtn value="large">{{ locale.t('shell.appearance.fontScale.large') }}</VBtn>
            </VBtnToggle>
          </section>

          <section class="va-appearance-settings__section">
            <div class="va-appearance-settings__heading">
              <h3>{{ locale.t('shell.appearance.contrast.title') }}</h3>
              <p>{{ locale.t('shell.appearance.contrast.description') }}</p>
            </div>
            <VBtnToggle
              class="va-appearance-settings__segments"
              color="primary"
              divided
              mandatory
              :model-value="preferences.contrast"
              variant="outlined"
              @update:model-value="setContrast"
            >
              <VBtn value="standard">{{ locale.t('shell.appearance.contrast.standard') }}</VBtn>
              <VBtn value="high">{{ locale.t('shell.appearance.contrast.high') }}</VBtn>
            </VBtnToggle>
          </section>
        </div>

        <VDivider />

        <section class="va-appearance-settings__section">
          <div class="va-appearance-settings__heading">
            <h3>{{ locale.t('shell.appearance.motion.title') }}</h3>
            <p>{{ locale.t('shell.appearance.motion.description') }}</p>
          </div>
          <VBtnToggle
            class="va-appearance-settings__segments"
            color="primary"
            divided
            mandatory
            :model-value="preferences.motion"
            variant="outlined"
            @update:model-value="setMotion"
          >
            <VBtn value="system">{{ locale.t('shell.appearance.motion.system') }}</VBtn>
            <VBtn value="full">{{ locale.t('shell.appearance.motion.full') }}</VBtn>
            <VBtn value="reduced">{{ locale.t('shell.appearance.motion.reduced') }}</VBtn>
          </VBtnToggle>
        </section>
      </div>
    </div>

    <template #footer>
      <VaButton appearance="text" intent="neutral" @click="reset">
        {{ locale.t('shell.appearance.reset') }}
      </VaButton>
      <VaButton @click="emit('update:modelValue', false)">{{ locale.t('common.done') }}</VaButton>
    </template>
  </VaModal>
</template>

<style>
.va-appearance-settings {
  display: grid;
  gap: var(--v-space-4);
}

.va-appearance-settings__tabs {
  margin-inline: calc(var(--v-space-1) * -1);
  background: rgba(var(--v-theme-surface-variant), var(--v-appearance-tabs-surface-opacity));
  border-radius: var(--v-radius-lg);
}

.va-appearance-settings__tabs .v-tab {
  min-block-size: var(--v-control-height-md);
  font-size: var(--v-font-size-sm);
  letter-spacing: 0;
  text-transform: none;
}

.va-appearance-settings__pane {
  display: grid;
  gap: var(--v-space-5);
}

.va-appearance-settings__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: var(--v-space-6);
}

.va-appearance-settings__section {
  display: grid;
  gap: var(--v-space-4);
  min-inline-size: 0;
}

.va-appearance-settings__heading h3,
.va-appearance-settings__heading p {
  margin: 0;
}

.va-appearance-settings__heading h3 {
  font-size: var(--v-font-size-md);
  font-weight: var(--v-font-weight-semibold);
}

.va-appearance-settings__heading p {
  margin-block-start: var(--v-space-1);
  color: rgb(var(--v-theme-on-surface));
  font-size: var(--v-font-size-sm);
}

.va-appearance-settings__segments {
  inline-size: fit-content;
  max-inline-size: 100%;
}

.va-appearance-settings__segments .v-btn {
  min-inline-size: 0;
  font-size: var(--v-font-size-sm);
}

.va-appearance-settings__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--v-space-3);
  align-items: center;
}

.va-appearance-settings__skins,
.va-appearance-settings__layouts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--v-space-3);
}

.va-appearance-settings__skin,
.va-appearance-settings__layout {
  display: grid;
  gap: var(--v-space-2);
  min-inline-size: 0;
  padding: var(--v-space-3);
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  transition:
    border-color var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    box-shadow var(--v-motion-duration-fast) var(--v-motion-easing-standard),
    transform var(--v-motion-duration-fast) var(--v-motion-easing-standard);
}

.va-appearance-settings__skin:hover,
.va-appearance-settings__layout:hover {
  border-color: rgba(var(--v-theme-primary), var(--v-appearance-hover-border-opacity));
  transform: translateY(calc(var(--v-space-1) * -0.5));
}

.va-appearance-settings__skin--active,
.va-appearance-settings__layout--active {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: var(--v-appearance-active-ring);
}

.va-appearance-settings__skin-preview {
  position: relative;
  display: block;
  block-size: 5rem;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-md);
}

.va-appearance-settings__skin-preview i {
  position: absolute;
  display: block;
}

.va-appearance-settings__skin-nav {
  inset: 0 auto 0 0;
  inline-size: var(--v-appearance-preview-nav-width);
  background: rgb(var(--v-theme-surface));
  border-inline-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-appearance-settings__skin-header {
  inset: var(--v-space-2) var(--v-space-2) auto
    calc(var(--v-appearance-preview-nav-width) + var(--v-space-2));
  block-size: var(--v-space-3);
  background: rgb(var(--v-theme-surface));
  border-radius: var(--v-radius-xs);
  box-shadow: var(--v-shadow-card);
}

.va-appearance-settings__skin-content {
  inset: calc(var(--v-space-6) + var(--v-space-1)) var(--v-space-2) var(--v-space-2)
    calc(var(--v-appearance-preview-nav-width) + var(--v-space-2));
  background: rgb(var(--v-theme-surface));
  border-radius: var(--v-radius-xs);
  box-shadow: var(--v-shadow-card);
}

.va-appearance-settings__skin--bordered .va-appearance-settings__skin-header,
.va-appearance-settings__skin--bordered .va-appearance-settings__skin-content {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: none;
}

.va-appearance-settings__skin--semi-dark .va-appearance-settings__skin-nav {
  background: rgb(var(--v-theme-navigation-dark));
}

.va-appearance-settings__skin strong,
.va-appearance-settings__skin small,
.va-appearance-settings__layout strong,
.va-appearance-settings__layout small {
  overflow: hidden;
  text-overflow: ellipsis;
}

.va-appearance-settings__skin strong,
.va-appearance-settings__layout strong {
  font-size: var(--v-font-size-sm);
  font-weight: var(--v-font-weight-semibold);
  white-space: nowrap;
}

.va-appearance-settings__skin small,
.va-appearance-settings__layout small {
  display: -webkit-box;
  min-block-size: calc(2 * var(--v-font-size-xs) * var(--v-line-height-body));
  color: rgb(var(--v-theme-on-surface));
  font-size: var(--v-font-size-xs);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.va-appearance-settings__layout-preview {
  position: relative;
  display: block;
  block-size: var(--v-appearance-layout-preview-height);
  overflow: hidden;
  background: rgb(var(--v-theme-background));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-md);
}

.va-appearance-settings__layout-preview i {
  position: absolute;
  display: block;
  border-radius: var(--v-radius-xs);
}

.va-appearance-settings__layout-nav {
  inset: 0 auto 0 0;
  inline-size: var(--v-appearance-preview-nav-width);
  background: linear-gradient(
    160deg,
    rgba(var(--v-theme-primary), 0.96),
    rgb(var(--v-theme-primary-darken-1))
  );
}

.va-appearance-settings__layout-header {
  inset: var(--v-space-2) var(--v-space-2) auto
    calc(var(--v-appearance-preview-nav-width) + var(--v-space-2));
  block-size: var(--v-space-3);
  background: rgb(var(--v-theme-surface));
  box-shadow: var(--v-shadow-card);
}

.va-appearance-settings__layout-content {
  inset: calc(var(--v-space-6) + var(--v-space-1)) var(--v-space-2) var(--v-space-2)
    calc(var(--v-appearance-preview-nav-width) + var(--v-space-2));
  background:
    linear-gradient(
      to right,
      rgba(var(--v-theme-primary), var(--v-selected-opacity))
        var(--v-appearance-preview-content-split),
      transparent var(--v-appearance-preview-content-split)
    ),
    rgb(var(--v-theme-surface));
  box-shadow: var(--v-shadow-card);
}

.va-appearance-settings__layout--compact .va-appearance-settings__layout-nav {
  inline-size: var(--v-appearance-preview-rail-width);
}

.va-appearance-settings__layout--compact .va-appearance-settings__layout-header {
  inset-inline-start: calc(var(--v-appearance-preview-rail-width) + var(--v-space-2));
}

.va-appearance-settings__layout--compact .va-appearance-settings__layout-content {
  inset-inline-start: calc(var(--v-appearance-preview-rail-width) + var(--v-space-2));
}

.va-appearance-settings__layout--topbar .va-appearance-settings__layout-nav {
  inset: 0;
  inline-size: auto;
  block-size: var(--v-appearance-preview-topbar-height);
  border-radius: 0;
}

.va-appearance-settings__layout--topbar .va-appearance-settings__layout-header {
  inset: var(--v-space-2) var(--v-space-3) auto var(--v-appearance-preview-topbar-indicator-start);
  block-size: var(--v-space-2);
  background: rgba(var(--v-theme-on-primary), var(--v-appearance-tabs-surface-opacity));
  box-shadow: none;
}

.va-appearance-settings__layout--topbar .va-appearance-settings__layout-content {
  inset: calc(var(--v-appearance-preview-topbar-height) + var(--v-space-2)) var(--v-space-2)
    var(--v-space-2);
}

.va-appearance-settings__swatch {
  position: relative;
  inline-size: var(--v-control-height-md);
  block-size: var(--v-control-height-md);
  cursor: pointer;
  background: var(--va-swatch);
  border: var(--v-space-1) solid rgb(var(--v-theme-surface));
  border-radius: var(--v-radius-pill);
  box-shadow: var(--v-appearance-swatch-ring);
}

.va-appearance-settings__swatch--active {
  box-shadow: var(--v-appearance-swatch-active-ring);
}

.va-appearance-settings__picker {
  inline-size: 100%;
  max-inline-size: 24rem;
}

@media (max-width: 599px) {
  .va-appearance-settings__skins,
  .va-appearance-settings__layouts {
    grid-template-columns: 1fr;
  }
}
</style>
