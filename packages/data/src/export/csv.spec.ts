import { describe, expect, it } from 'vitest'

import { createCsvDocument } from './csv'
import type { DataColumn } from '../table/types'

interface AccountRow extends Record<string, unknown> {
  readonly name: string
  readonly profile: { readonly email: string }
  readonly revenue: number
  readonly note: string
}

const columns: readonly DataColumn<AccountRow>[] = [
  { key: 'name', title: 'Account' },
  { key: 'profile.email', title: 'Email' },
  {
    key: 'revenue',
    title: 'Revenue',
    export: { format: (value) => `GBP ${String(value)}` },
  },
  { key: 'note', title: 'Note' },
  { key: 'actions', title: 'Actions', role: 'actions' },
]

describe('createCsvDocument', () => {
  it('exports visible data, nested paths, formatting, and quoted cells', () => {
    const csv = createCsvDocument({
      columns,
      rows: [
        {
          name: 'Ada',
          profile: { email: 'ada@example.com' },
          revenue: 42,
          note: 'Quoted, "value"',
        },
      ],
    })

    expect(csv).toBe(
      '\uFEFFAccount,Email,Revenue,Note\r\nAda,ada@example.com,GBP 42,"Quoted, ""value"""',
    )
  })

  it('protects spreadsheet formulas and supports an explicit trusted opt-out', () => {
    const row: AccountRow = {
      name: '=HYPERLINK("https://example.com")',
      profile: { email: 'safe@example.com' },
      revenue: -5,
      note: '@SUM(A1:A2)',
    }
    const safe = createCsvDocument({ columns, rows: [row], includeBom: false })
    const trusted = createCsvDocument({
      columns,
      rows: [row],
      includeBom: false,
      formulaPolicy: 'allow',
    })

    expect(safe).toContain("'=HYPERLINK")
    expect(safe).toContain("'@SUM")
    expect(safe).toContain('GBP -5')
    expect(trusted).toContain('"=HYPERLINK')
  })

  it('allows columns to opt out and validates delimiter safety', () => {
    expect(
      createCsvDocument({
        columns: columns.map((column) =>
          column.key === 'note' ? { ...column, export: false as const } : column,
        ),
        rows: [],
        includeBom: false,
      }),
    ).toBe('Account,Email,Revenue')
    expect(() => createCsvDocument({ columns, rows: [], delimiter: '\n' })).toThrow(TypeError)
  })

  it('preserves an intentionally empty column formatter result', () => {
    const csv = createCsvDocument({
      columns: [
        {
          key: 'name',
          title: 'Account',
          export: { format: () => null },
        },
        { key: 'note', title: 'Note' },
      ],
      rows: [
        {
          name: 'Sensitive name',
          profile: { email: 'safe@example.com' },
          revenue: 0,
          note: 'Visible',
        },
      ],
      includeBom: false,
      formatValue: (value) => `fallback:${String(value)}`,
    })

    expect(csv).toBe('Account,Note\r\n,fallback:Visible')
  })
})
