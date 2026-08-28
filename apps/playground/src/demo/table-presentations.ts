import {
  mdiAlertCircleOutline,
  mdiCalendarClockOutline,
  mdiCashMultiple,
  mdiCheckCircleOutline,
  mdiClockOutline,
  mdiCloseCircleOutline,
  mdiCrownOutline,
  mdiLoginVariant,
  mdiShieldAlertOutline,
  mdiShieldCheckOutline,
  mdiTicketConfirmationOutline,
} from '@mdi/js'
import type {
  CurrencyColumnPresentation,
  NumberColumnPresentation,
  StatusColumnPresentation,
  TemporalColumnPresentation,
} from '@vela-admin/data'
import type { VelaLocaleController } from '@vela-admin/locale'

import { playgroundFormatLocale } from './localization'

type Translate = VelaLocaleController['t']

export interface DemoTablePresentations {
  readonly accountStatus: StatusColumnPresentation
  readonly plan: StatusColumnPresentation
  readonly risk: StatusColumnPresentation
  readonly sterling: CurrencyColumnPresentation
  readonly standardDate: TemporalColumnPresentation
  readonly standardDateTime: TemporalColumnPresentation
  readonly signIn: NumberColumnPresentation
  readonly ticket: NumberColumnPresentation
}

export function createDemoTablePresentations(t: Translate, locale: string): DemoTablePresentations {
  const formatLocale = playgroundFormatLocale(locale)
  return {
    accountStatus: {
      kind: 'status',
      values: {
        active: {
          label: t('playground.common.active'),
          tone: 'success',
          icon: mdiCheckCircleOutline,
        },
        invited: {
          label: t('playground.common.invited'),
          tone: 'warning',
          icon: mdiClockOutline,
        },
        suspended: {
          label: t('playground.common.suspended'),
          tone: 'danger',
          icon: mdiCloseCircleOutline,
        },
      },
    },
    plan: {
      kind: 'status',
      values: {
        Enterprise: {
          label: t('playground.common.enterprise'),
          tone: 'primary',
          icon: mdiCrownOutline,
        },
        Scale: { label: t('playground.common.scale'), tone: 'info' },
        Starter: { label: t('playground.common.starter'), tone: 'neutral' },
      },
    },
    risk: {
      kind: 'status',
      values: {
        low: {
          label: t('playground.common.low'),
          tone: 'success',
          icon: mdiShieldCheckOutline,
        },
        medium: {
          label: t('playground.common.medium'),
          tone: 'warning',
          icon: mdiShieldAlertOutline,
        },
        high: {
          label: t('playground.common.high'),
          tone: 'danger',
          icon: mdiAlertCircleOutline,
        },
      },
    },
    sterling: {
      kind: 'currency',
      currency: 'GBP',
      locale: formatLocale,
      icon: mdiCashMultiple,
      tone: 'primary',
      showCurrencyCode: true,
    },
    standardDate: {
      kind: 'date',
      locale: formatLocale,
      dateStyle: 'medium',
      icon: mdiCalendarClockOutline,
    },
    standardDateTime: {
      kind: 'datetime',
      locale: formatLocale,
      dateStyle: 'medium',
      timeStyle: 'short',
      relative: true,
      relativeTo: '2026-08-27T12:00:00.000Z',
      icon: mdiClockOutline,
    },
    signIn: {
      kind: 'number',
      locale: formatLocale,
      icon: mdiLoginVariant,
      tone: 'info',
    },
    ticket: {
      kind: 'number',
      locale: formatLocale,
      icon: mdiTicketConfirmationOutline,
      tone: 'warning',
    },
  }
}
