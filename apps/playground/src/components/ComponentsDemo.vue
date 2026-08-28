<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  mdiAccountMultipleOutline,
  mdiBellOutline,
  mdiChartLine,
  mdiPlus,
  mdiTrashCanOutline,
} from '@mdi/js'
import { VCard, VCardText, VCardTitle, VIcon } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import {
  VaAvatar,
  VaAvatarGroup,
  VaBadge,
  VaButton,
  VaChip,
  VaIconButton,
  VaLoadingOverlay,
  VaModal,
  VaSkeleton,
  VaStatCard,
  VaStateView,
  VaTag,
  useFeedback,
  type StateViewKind,
} from '@vela-admin/ui'

const emit = defineEmits<{
  confirm: []
  prompt: []
  message: [value: string]
}>()

const modalOpen = ref(false)
const feedback = useFeedback()
const locale = useVelaLocale()
const currentLocale = computed(() => locale.locale.value)
const chipSelected = ref(true)
const overlayActive = ref(false)
const stateKind = ref<StateViewKind>('empty')
const stateKinds: readonly StateViewKind[] = ['empty', 'error', 'forbidden', 'not-found', 'offline']

function stateLabel(kind: StateViewKind): string {
  const keys: Record<StateViewKind, string> = {
    empty: 'playground.components.state.empty',
    error: 'playground.components.state.error',
    forbidden: 'playground.components.state.forbidden',
    'not-found': 'playground.components.state.notFound',
    offline: 'playground.components.state.offline',
  }
  return locale.t(keys[kind])
}

function createWorkspace(): void {
  modalOpen.value = false
  emit('message', locale.t('playground.components.created'))
}

let loadingTimer: ReturnType<typeof setTimeout> | undefined

function previewLoading(): void {
  overlayActive.value = true
  if (loadingTimer) clearTimeout(loadingTimer)
  loadingTimer = setTimeout(() => {
    overlayActive.value = false
  }, 1200)
}

async function previewGlobalLoading(): Promise<void> {
  await feedback.loading.run(() => new Promise((resolve) => setTimeout(resolve, 1200)), {
    label: locale.t('playground.components.preparingWorkspace'),
    delay: 0,
  })
  feedback.toast.success(locale.t('playground.components.workspaceReady'))
}

onBeforeUnmount(() => {
  if (loadingTimer) clearTimeout(loadingTimer)
})
</script>

<template>
  <div class="playground-stack">
    <div class="playground-page-heading">
      <div>
        <p class="playground-eyebrow">{{ locale.t('playground.components.eyebrow') }}</p>
        <h1>{{ locale.t('playground.components.title') }}</h1>
        <p>{{ locale.t('playground.components.description') }}</p>
      </div>
    </div>

    <div class="playground-demo-grid">
      <VCard class="playground-panel">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.components.buttons') }}</strong
            ><span>{{ locale.t('playground.components.buttonsDescription') }}</span>
          </div>
        </VCardTitle>
        <VCardText class="playground-panel__body">
          <div class="playground-component-row">
            <VaButton :prepend-icon="mdiPlus">
              {{ locale.t('playground.components.createRecord') }}
            </VaButton>
            <VaButton appearance="tonal" intent="success">
              {{ locale.t('playground.components.approve') }}
            </VaButton>
            <VaButton appearance="outline" intent="neutral">
              {{ locale.t('playground.components.secondary') }}
            </VaButton>
            <VaButton appearance="text" intent="danger" :prepend-icon="mdiTrashCanOutline">
              {{ locale.t('playground.common.delete') }}
            </VaButton>
            <VaButton loading :loading-text="locale.t('playground.components.saving')">
              {{ locale.t('playground.components.save') }}
            </VaButton>
            <VaIconButton
              :icon="mdiBellOutline"
              :label="locale.t('playground.components.notifications')"
            />
          </div>
        </VCardText>
      </VCard>

      <VCard class="playground-panel">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.components.locale') }}</strong
            ><span>{{ locale.t('playground.components.localeDescription') }}</span>
          </div>
        </VCardTitle>
        <VCardText class="playground-panel__body">
          <div
            class="playground-component-row"
            role="group"
            :aria-label="locale.t('playground.locale.preview')"
          >
            <VaButton
              :appearance="currentLocale === 'en' ? 'solid' : 'outline'"
              data-testid="locale-en"
              @click="locale.setLocale('en')"
            >
              {{ locale.t('playground.locale.english') }}
            </VaButton>
            <VaButton
              :appearance="currentLocale === 'zh-CN' ? 'solid' : 'outline'"
              data-testid="locale-zh-CN"
              @click="locale.setLocale('zh-CN')"
            >
              {{ locale.t('playground.locale.chineseNative') }}
            </VaButton>
            <VaButton
              :appearance="currentLocale === 'ar' ? 'solid' : 'outline'"
              data-testid="locale-ar"
              @click="locale.setLocale('ar')"
            >
              {{ locale.t('playground.locale.arabic') }}
            </VaButton>
            <VaTag :tone="locale.direction.value === 'rtl' ? 'info' : 'neutral'">
              {{ locale.direction.value.toUpperCase() }}
            </VaTag>
          </div>
        </VCardText>
      </VCard>

      <VCard class="playground-panel">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.components.identity') }}</strong
            ><span>{{ locale.t('playground.components.identityDescription') }}</span>
          </div>
        </VCardTitle>
        <VCardText class="playground-panel__body">
          <div class="playground-component-row">
            <VaAvatar name="Maya Chen" />
            <VaAvatar name="Noah Williams" color="primary" />
            <VaAvatarGroup
              :items="[
                { id: 1, name: 'Maya Chen' },
                { id: 2, name: 'Noah Williams' },
                { id: 3, name: 'Amara Okafor' },
                { id: 4, name: 'Luca Rossi' },
                { id: 5, name: 'Sofia Hernández' },
              ]"
              :max="4"
            />
            <VaChip v-model:selected="chipSelected" closable tone="primary">
              {{ locale.t('playground.common.operations') }}
            </VaChip>
            <VaTag tone="success">{{ locale.t('playground.common.active') }}</VaTag>
            <VaTag tone="warning">{{ locale.t('playground.common.pending') }}</VaTag>
            <VaTag tone="danger">{{ locale.t('playground.common.blocked') }}</VaTag>
            <VaTag tone="info">{{ locale.t('playground.common.beta') }}</VaTag>
            <VaBadge :content="128" :label="locale.t('playground.components.unreadNotifications')">
              <VaIconButton
                :icon="mdiBellOutline"
                :label="locale.t('playground.components.notifications')"
              />
            </VaBadge>
          </div>
        </VCardText>
      </VCard>

      <VCard class="playground-panel">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.components.metrics') }}</strong
            ><span>{{ locale.t('playground.components.metricsDescription') }}</span>
          </div>
        </VCardTitle>
        <VCardText class="playground-panel__body">
          <div class="playground-stat-grid">
            <VaStatCard
              :caption="locale.t('playground.components.acrossWorkspaces')"
              :icon="mdiAccountMultipleOutline"
              :label="locale.t('playground.components.activeUsers')"
              :trend="{
                value: '+12.4%',
                label: locale.t('playground.overview.metric.days30'),
                direction: 'up',
              }"
              value="18,420"
            />
            <VaStatCard
              :icon="mdiChartLine"
              :label="locale.t('playground.components.conversion')"
              :trend="{
                value: '-0.8%',
                label: locale.t('playground.components.days7'),
                direction: 'down',
              }"
              value="8.7%"
            />
          </div>
        </VCardText>
      </VCard>

      <VCard class="playground-panel">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.components.overlays') }}</strong
            ><span>{{ locale.t('playground.components.overlaysDescription') }}</span>
          </div>
        </VCardTitle>
        <VCardText class="playground-panel__body">
          <div class="playground-component-row">
            <VaButton @click="modalOpen = true">
              {{ locale.t('playground.components.openModal') }}
            </VaButton>
            <VaButton appearance="outline" intent="danger" @click="emit('confirm')">
              {{ locale.t('playground.components.confirmDeletion') }}
            </VaButton>
            <VaButton appearance="outline" intent="neutral" @click="emit('prompt')">
              {{ locale.t('playground.components.openPrompt') }}
            </VaButton>
          </div>
        </VCardText>
      </VCard>

      <VCard class="playground-panel">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.components.feedback') }}</strong
            ><span>{{ locale.t('playground.components.feedbackDescription') }}</span>
          </div>
        </VCardTitle>
        <VCardText class="playground-panel__body">
          <div class="playground-component-row">
            <VaButton
              appearance="tonal"
              intent="success"
              @click="feedback.toast.success(locale.t('playground.components.savedToast'))"
            >
              {{ locale.t('playground.components.success') }}
            </VaButton>
            <VaButton
              appearance="tonal"
              intent="warning"
              @click="feedback.toast.warning(locale.t('playground.components.reviewToast'))"
            >
              {{ locale.t('playground.components.warning') }}
            </VaButton>
            <VaButton
              appearance="tonal"
              intent="danger"
              @click="feedback.toast.error(locale.t('playground.components.failedToast'))"
            >
              {{ locale.t('playground.components.error') }}
            </VaButton>
            <VaButton
              appearance="text"
              intent="primary"
              @click="feedback.toast.info(locale.t('playground.components.syncToast'))"
            >
              {{ locale.t('playground.components.information') }}
            </VaButton>
          </div>
        </VCardText>
      </VCard>

      <VCard class="playground-panel">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.components.loading') }}</strong
            ><span>{{ locale.t('playground.components.loadingDescription') }}</span>
          </div>
          <div class="playground-component-row">
            <VaButton appearance="text" intent="neutral" @click="previewLoading">
              {{ locale.t('playground.components.scoped') }}
            </VaButton>
            <VaButton appearance="text" intent="primary" @click="previewGlobalLoading">
              {{ locale.t('playground.components.globalApi') }}
            </VaButton>
          </div>
        </VCardTitle>
        <VCardText class="playground-panel__body playground-panel__body--flush">
          <VaLoadingOverlay
            :active="overlayActive"
            :label="locale.t('playground.components.refreshingWorkspace')"
          >
            <div class="playground-loading-preview">
              <VaSkeleton
                :label="locale.t('playground.components.loadingPreview')"
                preset="detail"
              />
            </div>
          </VaLoadingOverlay>
        </VCardText>
      </VCard>

      <VCard class="playground-panel">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.components.states') }}</strong
            ><span>{{ locale.t('playground.components.statesDescription') }}</span>
          </div>
        </VCardTitle>
        <VCardText class="playground-panel__body playground-panel__body--flush">
          <div
            class="playground-state-tabs"
            role="tablist"
            :aria-label="locale.t('playground.components.statePreview')"
          >
            <button
              v-for="kind in stateKinds"
              :key="kind"
              :aria-selected="stateKind === kind"
              role="tab"
              type="button"
              @click="stateKind = kind"
            >
              {{ stateLabel(kind) }}
            </button>
          </div>
          <VaStateView
            :action-text="stateKind === 'error' ? locale.t('common.retry') : undefined"
            :kind="stateKind"
          />
        </VCardText>
      </VCard>
    </div>

    <VaModal
      v-model="modalOpen"
      :description="locale.t('playground.components.modalDescription')"
      :title="locale.t('playground.components.modalTitle')"
    >
      <div class="playground-modal-preview">
        <VIcon color="primary" icon="$palette" size="32" />
        <div>
          <strong>{{ locale.t('playground.components.modalFlexible') }}</strong>
          <p>{{ locale.t('playground.components.modalFlexibleDescription') }}</p>
        </div>
      </div>
      <template #footer>
        <VaButton appearance="text" intent="neutral" @click="modalOpen = false">
          {{ locale.t('common.cancel') }}
        </VaButton>
        <VaButton @click="createWorkspace">
          {{ locale.t('playground.components.create') }}
        </VaButton>
      </template>
    </VaModal>
  </div>
</template>
