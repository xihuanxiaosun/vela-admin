<script setup lang="ts">
import { computed } from 'vue'
import {
  mdiAccountGroupOutline,
  mdiArrowUpRight,
  mdiCalendarMonthOutline,
  mdiCashMultiple,
  mdiChartLine,
  mdiCheckCircleOutline,
  mdiClockFast,
  mdiCreditCardOutline,
  mdiDatabaseCheckOutline,
  mdiLightningBoltOutline,
  mdiServerOutline,
} from '@mdi/js'
import { VCard, VCardText, VIcon, VProgressLinear } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaStatCard, VaTag } from '@vela-admin/ui'

const locale = useVelaLocale()

const metrics = computed(
  () =>
    [
      {
        label: locale.t('playground.overview.metric.netRevenue'),
        value: '£48.2k',
        caption: locale.t('playground.overview.metric.netRevenueCaption'),
        icon: mdiCashMultiple,
        tone: 'primary',
        trend: {
          direction: 'up',
          value: '+12.4%',
          label: locale.t('playground.overview.metric.days30'),
        },
      },
      {
        label: locale.t('playground.overview.metric.customers'),
        value: '8,420',
        caption: locale.t('playground.overview.metric.customersCaption'),
        icon: mdiAccountGroupOutline,
        tone: 'info',
        trend: {
          direction: 'up',
          value: '+8.1%',
          label: locale.t('playground.overview.metric.days30'),
        },
      },
      {
        label: locale.t('playground.overview.metric.conversion'),
        value: '6.84%',
        caption: locale.t('playground.overview.metric.conversionCaption'),
        icon: mdiChartLine,
        tone: 'success',
        trend: {
          direction: 'up',
          value: '+1.6%',
          label: locale.t('playground.overview.metric.days30'),
        },
      },
      {
        label: locale.t('playground.overview.metric.response'),
        value: '184 ms',
        caption: locale.t('playground.overview.metric.responseCaption'),
        icon: mdiClockFast,
        tone: 'warning',
        trend: {
          direction: 'flat',
          value: locale.t('playground.overview.metric.stable'),
          label: locale.t('playground.overview.metric.hours24'),
        },
      },
    ] as const,
)

const channels = computed(
  () =>
    [
      {
        label: locale.t('playground.overview.channel.direct'),
        value: '£18,620',
        share: 72,
        tone: 'primary',
      },
      {
        label: locale.t('playground.overview.channel.marketplace'),
        value: '£14,980',
        share: 58,
        tone: 'info',
      },
      {
        label: locale.t('playground.overview.channel.partners'),
        value: '£9,760',
        share: 38,
        tone: 'success',
      },
    ] as const,
)

const activity = computed(
  () =>
    [
      {
        icon: mdiCreditCardOutline,
        title: locale.t('playground.overview.activity.renewed'),
        detail: locale.t('playground.overview.activity.renewedDetail'),
        time: locale.t('playground.overview.activity.renewedTime'),
        tone: 'success',
      },
      {
        icon: mdiLightningBoltOutline,
        title: locale.t('playground.overview.activity.automation'),
        detail: locale.t('playground.overview.activity.automationDetail'),
        time: locale.t('playground.overview.activity.automationTime'),
        tone: 'primary',
      },
      {
        icon: mdiDatabaseCheckOutline,
        title: locale.t('playground.overview.activity.backup'),
        detail: locale.t('playground.overview.activity.backupDetail'),
        time: locale.t('playground.overview.activity.backupTime'),
        tone: 'info',
      },
    ] as const,
)

const health = computed(
  () =>
    [
      {
        label: locale.t('playground.overview.health.api'),
        value: '99.99%',
        status: locale.t('playground.overview.health.operational'),
      },
      {
        label: locale.t('playground.overview.health.jobs'),
        value: '1,248/min',
        status: locale.t('playground.overview.health.operational'),
      },
      {
        label: locale.t('playground.overview.health.database'),
        value: '42 ms',
        status: locale.t('playground.overview.health.healthy'),
      },
    ] as const,
)

const targetCompletion = 78
</script>

<template>
  <div class="playground-stack playground-dashboard">
    <header class="playground-page-heading">
      <div>
        <p class="playground-eyebrow">{{ locale.t('playground.overview.eyebrow') }}</p>
        <h1>{{ locale.t('playground.overview.title') }}</h1>
        <p>{{ locale.t('playground.overview.description') }}</p>
      </div>
      <div class="playground-page-actions">
        <VaButton :prepend-icon="mdiCalendarMonthOutline" appearance="tonal" intent="neutral">
          {{ locale.t('playground.overview.period') }}
        </VaButton>
        <VaButton :append-icon="mdiArrowUpRight">
          {{ locale.t('playground.overview.openReports') }}
        </VaButton>
      </div>
    </header>

    <section :aria-label="locale.t('playground.overview.kpiAria')" class="playground-metric-grid">
      <VaStatCard
        v-for="metric in metrics"
        :key="metric.label"
        :caption="metric.caption"
        :icon="metric.icon"
        :label="metric.label"
        :tone="metric.tone"
        :trend="metric.trend"
        :value="metric.value"
      />
    </section>

    <section class="playground-dashboard__primary-grid">
      <VCard class="playground-panel playground-revenue-card">
        <VCardText class="playground-panel__body">
          <div class="playground-section-heading">
            <div>
              <p class="playground-eyebrow">{{ locale.t('playground.overview.revenue') }}</p>
              <h2>{{ locale.t('playground.overview.performance') }}</h2>
            </div>
            <VaTag dot tone="success">{{ locale.t('playground.overview.onTrack') }}</VaTag>
          </div>

          <div class="playground-chart-summary">
            <div>
              <strong>£48,240</strong>
              <span
                ><VIcon :icon="mdiArrowUpRight" />
                {{ locale.t('playground.overview.fromLastPeriod') }}</span
              >
            </div>
            <div
              class="playground-chart-legend"
              :aria-label="locale.t('playground.overview.chartLegend')"
            >
              <span><i />{{ locale.t('playground.overview.revenue') }}</span>
              <span><i />{{ locale.t('playground.overview.previousPeriod') }}</span>
            </div>
          </div>

          <div
            class="playground-chart"
            role="img"
            :aria-label="locale.t('playground.overview.chartAria')"
          >
            <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 720 240">
              <g class="playground-chart__grid">
                <line x1="0" x2="720" y1="36" y2="36" />
                <line x1="0" x2="720" y1="96" y2="96" />
                <line x1="0" x2="720" y1="156" y2="156" />
                <line x1="0" x2="720" y1="216" y2="216" />
              </g>
              <path
                class="playground-chart__previous"
                d="M0 181 C70 172 94 190 154 162 S254 129 308 145 S418 169 472 122 S582 113 630 90 S690 91 720 64"
              />
              <path
                class="playground-chart__area"
                d="M0 196 C70 183 95 160 154 169 S252 120 310 134 S420 102 474 116 S582 70 632 83 S690 38 720 46 L720 240 L0 240 Z"
              />
              <path
                class="playground-chart__line"
                d="M0 196 C70 183 95 160 154 169 S252 120 310 134 S420 102 474 116 S582 70 632 83 S690 38 720 46"
              />
              <circle class="playground-chart__point" cx="632" cy="83" r="5" />
            </svg>
            <div class="playground-chart__axis" aria-hidden="true">
              <span v-for="week in 4" :key="week">
                {{ locale.t('playground.overview.week', { number: week }) }}
              </span>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VCard class="playground-panel playground-target-card">
        <VCardText class="playground-panel__body">
          <div class="playground-section-heading">
            <div>
              <p class="playground-eyebrow">{{ locale.t('playground.overview.monthlyTarget') }}</p>
              <h2>{{ locale.t('playground.overview.goal') }}</h2>
            </div>
            <VaTag tone="primary">{{ locale.t('playground.overview.complete78') }}</VaTag>
          </div>

          <div class="playground-target">
            <div
              class="playground-target__ring"
              role="img"
              :aria-label="locale.t('playground.overview.completeAria')"
              :style="{ '--playground-target-progress': `${targetCompletion}%` }"
            >
              <div>
                <strong>78%</strong><small>{{ locale.t('playground.overview.complete') }}</small>
              </div>
            </div>
            <div>
              <strong>{{ locale.t('playground.overview.remaining') }}</strong>
              <p>{{ locale.t('playground.overview.pace') }}</p>
            </div>
          </div>

          <div class="playground-channel-list">
            <article v-for="channel in channels" :key="channel.label">
              <div>
                <strong>{{ channel.label }}</strong
                ><span>{{ channel.value }}</span>
              </div>
              <VProgressLinear
                :aria-label="
                  locale.t('playground.overview.channelAria', {
                    channel: channel.label,
                    share: channel.share,
                  })
                "
                :color="channel.tone"
                :model-value="channel.share"
                rounded
              />
            </article>
          </div>
        </VCardText>
      </VCard>
    </section>

    <section class="playground-overview-grid">
      <VCard class="playground-panel">
        <VCardText class="playground-panel__body">
          <div class="playground-section-heading">
            <div>
              <p class="playground-eyebrow">{{ locale.t('playground.overview.liveActivity') }}</p>
              <h2>{{ locale.t('playground.overview.latestEvents') }}</h2>
            </div>
            <VaButton appearance="text" size="small">
              {{ locale.t('playground.overview.viewAll') }}
            </VaButton>
          </div>
          <div class="playground-activity-list">
            <article v-for="event in activity" :key="event.title">
              <span :class="`playground-tone playground-tone--${event.tone}`">
                <VIcon :icon="event.icon" />
              </span>
              <div>
                <strong>{{ event.title }}</strong>
                <p>{{ event.detail }}</p>
              </div>
              <time>{{ event.time }}</time>
            </article>
          </div>
        </VCardText>
      </VCard>

      <VCard class="playground-panel">
        <VCardText class="playground-panel__body">
          <div class="playground-section-heading">
            <div>
              <p class="playground-eyebrow">{{ locale.t('playground.overview.health') }}</p>
              <h2>{{ locale.t('playground.overview.healthTitle') }}</h2>
            </div>
            <span class="playground-tone playground-tone--success">
              <VIcon :icon="mdiServerOutline" />
            </span>
          </div>
          <div class="playground-health-list">
            <article v-for="item in health" :key="item.label">
              <span><VIcon :icon="mdiCheckCircleOutline" /></span>
              <div>
                <strong>{{ item.label }}</strong
                ><small>{{ item.status }}</small>
              </div>
              <b>{{ item.value }}</b>
            </article>
          </div>
        </VCardText>
      </VCard>
    </section>
  </div>
</template>
