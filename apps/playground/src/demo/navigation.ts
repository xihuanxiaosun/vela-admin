import {
  mdiAccountMultipleOutline,
  mdiCloudUploadOutline,
  mdiCashMultiple,
  mdiFormTextbox,
  mdiPaletteOutline,
  mdiShieldSearch,
  mdiTableColumnPlusAfter,
  mdiTableLarge,
  mdiViewDashboardOutline,
} from '@mdi/js'
import type { VelaLocaleController } from '@vela-admin/locale'
import type { NavigationItem } from '@vela-admin/shell'

export type PlaygroundPage =
  | 'overview'
  | 'components'
  | 'users'
  | 'data'
  | 'finance'
  | 'moderation'
  | 'wide-data'
  | 'forms'
  | 'upload'

type Translate = VelaLocaleController['t']

function keywords(t: Translate, key: string): readonly string[] {
  return t(key)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function createPlaygroundNavigation(t: Translate): readonly NavigationItem[] {
  return [
    {
      id: 'foundation',
      kind: 'section',
      label: t('playground.nav.foundation'),
      children: [
        {
          id: 'overview',
          label: t('playground.nav.overview'),
          icon: mdiViewDashboardOutline,
          href: '#overview',
          keywords: keywords(t, 'playground.nav.overviewKeywords'),
        },
        {
          id: 'components',
          label: t('playground.nav.components'),
          icon: mdiPaletteOutline,
          href: '#components',
          keywords: keywords(t, 'playground.nav.componentsKeywords'),
        },
      ],
    },
    {
      id: 'patterns',
      kind: 'section',
      label: t('playground.nav.patterns'),
      children: [
        {
          id: 'users',
          label: t('playground.nav.users'),
          icon: mdiAccountMultipleOutline,
          href: '#users',
          keywords: keywords(t, 'playground.nav.usersKeywords'),
          pageMode: 'workspace',
        },
        {
          id: 'data',
          label: t('playground.nav.data'),
          icon: mdiTableLarge,
          href: '#data',
          keywords: keywords(t, 'playground.nav.dataKeywords'),
          pageMode: 'workspace',
        },
        {
          id: 'finance',
          label: t('playground.nav.finance'),
          icon: mdiCashMultiple,
          href: '#finance',
          keywords: keywords(t, 'playground.nav.financeKeywords'),
          pageMode: 'workspace',
        },
        {
          id: 'moderation',
          label: t('playground.nav.moderation'),
          icon: mdiShieldSearch,
          href: '#moderation',
          keywords: keywords(t, 'playground.nav.moderationKeywords'),
          pageMode: 'workspace',
        },
        {
          id: 'wide-data',
          label: t('playground.nav.wideData'),
          icon: mdiTableColumnPlusAfter,
          href: '#wide-data',
          keywords: keywords(t, 'playground.nav.wideDataKeywords'),
          pageMode: 'workspace',
        },
        {
          id: 'forms',
          label: t('playground.nav.forms'),
          icon: mdiFormTextbox,
          href: '#forms',
          keywords: keywords(t, 'playground.nav.formsKeywords'),
        },
        {
          id: 'upload',
          label: t('playground.nav.upload'),
          icon: mdiCloudUploadOutline,
          href: '#upload',
          keywords: keywords(t, 'playground.nav.uploadKeywords'),
        },
      ],
    },
  ]
}

export function isPlaygroundPage(value: string): value is PlaygroundPage {
  return [
    'overview',
    'components',
    'users',
    'data',
    'finance',
    'moderation',
    'wide-data',
    'forms',
    'upload',
  ].includes(value)
}
