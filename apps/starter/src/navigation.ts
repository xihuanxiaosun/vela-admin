import type { NavigationItem } from '@vela-admin/shell'
import type { VelaLocaleController } from '@vela-admin/locale'

import { starterCapabilities } from './access-policy'

export function createStarterNavigation(t: VelaLocaleController['t']): readonly NavigationItem[] {
  return [
    {
      id: 'workspace',
      label: t('starter.nav.workspace'),
      kind: 'section',
      children: [
        { id: 'dashboard', label: t('starter.nav.dashboard'), icon: '$dashboard' },
        {
          id: 'users',
          label: t('starter.nav.users'),
          icon: '$account',
          capability: starterCapabilities.usersRead,
        },
        {
          id: 'settings',
          label: t('starter.nav.settings'),
          icon: '$settings',
          capability: starterCapabilities.settingsManage,
        },
      ],
    },
  ]
}
