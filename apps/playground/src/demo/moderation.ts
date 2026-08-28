export type DemoModerationStatus = 'queued' | 'reviewing' | 'approved' | 'rejected'

export interface DemoModerationRecord {
  readonly [key: string]: unknown
  readonly id: number
  readonly title: string
  readonly excerpt: string
  readonly author: string
  readonly authorRegion: string
  readonly contentType: 'listing' | 'post' | 'comment'
  readonly automated: boolean
  readonly riskScore: number
  readonly signalCount: number
  readonly reports: number
  readonly reportChange: number
  readonly status: DemoModerationStatus
  readonly submittedAt: string
}

const titles = [
  'Senior product designer in London',
  'Weekend home moving support',
  'A thoughtful guide to settling in',
  'Community reply requiring context',
] as const
const authors = ['Maya Chen', 'Noah Williams', 'Amara Okafor', 'Luca Rossi'] as const
const regions = ['London', 'Manchester', 'Dublin', 'Birmingham'] as const
const contentTypes: readonly DemoModerationRecord['contentType'][] = ['listing', 'post', 'comment']
const statuses: readonly DemoModerationStatus[] = ['queued', 'reviewing', 'approved', 'rejected']

export const demoModerationRecords: readonly DemoModerationRecord[] = Array.from(
  { length: 96 },
  (_, index) => {
    const id = index + 1
    const riskScore = (index * 17 + 13) % 101
    return {
      id,
      title: titles[index % titles.length] ?? 'Content awaiting review',
      excerpt:
        index % 3 === 0
          ? 'This longer excerpt demonstrates a bounded content preview without sacrificing the operational columns.'
          : 'Submitted content preview',
      author: authors[index % authors.length] ?? 'Vela member',
      authorRegion: regions[index % regions.length] ?? 'London',
      contentType: contentTypes[index % contentTypes.length] ?? 'post',
      automated: index % 4 !== 0,
      riskScore,
      signalCount: Math.max(1, Math.ceil(riskScore / 18)),
      reports: index % 8,
      reportChange: ((index % 7) - 3) * 3.2,
      status: statuses[index % statuses.length] ?? 'queued',
      submittedAt: new Date(Date.UTC(2026, 7, 27 - (index % 8), 9 + (index % 9), 30)).toISOString(),
    }
  },
)
