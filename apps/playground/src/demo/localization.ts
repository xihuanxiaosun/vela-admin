import type { VelaLocaleController } from '@vela-admin/locale'

import type { PlaygroundMessageKey } from './messages'

type Translate = VelaLocaleController['t']

const demoLabelKeys = Object.freeze({
  active: 'playground.common.active',
  invited: 'playground.common.invited',
  suspended: 'playground.common.suspended',
  Owner: 'playground.common.owner',
  Administrator: 'playground.common.administrator',
  Analyst: 'playground.common.analyst',
  Editor: 'playground.common.editor',
  Operations: 'playground.common.operations',
  Growth: 'playground.common.growth',
  Finance: 'playground.common.finance',
  Content: 'playground.common.content',
  Enterprise: 'playground.common.enterprise',
  Scale: 'playground.common.scale',
  Starter: 'playground.common.starter',
  London: 'playground.common.london',
  Manchester: 'playground.common.manchester',
  Dublin: 'playground.common.dublin',
  Birmingham: 'playground.common.birmingham',
  'New York': 'playground.common.newYork',
  'Workspace member': 'playground.common.workspaceMember',
  'This deliberately long value demonstrates bounded ellipsis without forcing every row or column to become oversized.':
    'playground.common.longNote',
  'Home cleaning': 'playground.finance.service.homeCleaning',
  'Premium listing': 'playground.finance.service.premiumListing',
  'Featured post': 'playground.finance.service.featuredPost',
  Consultation: 'playground.finance.service.consultation',
  'Home services': 'playground.finance.group.homeServices',
  Marketplace: 'playground.finance.group.marketplace',
  'Professional services': 'playground.finance.group.professional',
  'Senior product designer in London': 'playground.moderation.title.designer',
  'Weekend home moving support': 'playground.moderation.title.moving',
  'A thoughtful guide to settling in': 'playground.moderation.title.guide',
  'Community reply requiring context': 'playground.moderation.title.reply',
  'Content awaiting review': 'playground.moderation.title.fallback',
  'This longer excerpt demonstrates a bounded content preview without sacrificing the operational columns.':
    'playground.moderation.excerpt.long',
  'Submitted content preview': 'playground.moderation.excerpt.short',
} as const satisfies Readonly<Record<string, PlaygroundMessageKey>>)

export function playgroundFormatLocale(locale: string): string {
  return locale.toLocaleLowerCase().startsWith('zh') ? 'zh-CN' : 'en-GB'
}

export function translateDemoLabel(t: Translate, value: unknown): string {
  const label =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : ''
  if (Object.hasOwn(demoLabelKeys, label)) {
    return t(demoLabelKeys[label as keyof typeof demoLabelKeys])
  }
  return label
}

export function localizedOption(
  t: Translate,
  value: string,
): Readonly<{ title: string; value: string }> {
  return { title: translateDemoLabel(t, value), value }
}
