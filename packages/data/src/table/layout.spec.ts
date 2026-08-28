import { describe, expect, it } from 'vitest'

import {
  chooseFillColumn,
  inferColumnAlignment,
  isColumnResizable,
  isMeaningfulOverflow,
  resolveColumnResizeBounds,
  resolveTableHeaders,
} from './layout'
import type { DataColumn } from './types'

interface Row {
  id: number
  name: string
  amount: number
}

const columns: readonly DataColumn<Row>[] = [
  { key: 'id', title: 'ID', dataType: 'number', sizing: { mode: 'content', min: 72, max: 96 } },
  { key: 'name', title: 'Name', role: 'identity', overflow: 'ellipsis' },
  { key: 'amount', title: 'Amount', dataType: 'currency' },
  { key: 'actions', title: 'Actions', role: 'actions', pin: 'auto-end' },
]

describe('adaptive table layout', () => {
  it('infers semantic alignment', () => {
    expect(inferColumnAlignment('data', 'currency')).toBe('end')
    expect(inferColumnAlignment('status', 'text')).toBe('center')
    expect(inferColumnAlignment('identity', 'text')).toBe('start')
  })

  it('chooses a primary text column to absorb surplus space', () => {
    expect(chooseFillColumn(columns)).toBe('name')
    const headers = resolveTableHeaders(columns, {
      hasHorizontalOverflow: false,
      presentation: 'table',
    })
    expect(headers.find((header) => header.key === 'name')?.width).toBe(384)
    expect(headers.find((header) => header.key === 'amount')?.align).toBe('end')
  })

  it('prefers an identity column over an earlier auxiliary text column', () => {
    const identityColumns: readonly DataColumn<Row>[] = [
      { key: 'note', title: 'Note' },
      { key: 'name', title: 'Name', role: 'identity' },
    ]

    expect(chooseFillColumn(identityColumns)).toBe('name')
  })

  it('uses semantic bounds instead of stretching every short column equally', () => {
    const headers = resolveTableHeaders(
      [
        { key: 'name', title: 'Name', role: 'identity' },
        { key: 'amount', title: 'Amount', dataType: 'currency' },
        { key: 'createdAt', title: 'Created', dataType: 'datetime' },
        { key: 'state', title: 'State', role: 'status' },
      ],
      { hasHorizontalOverflow: false, presentation: 'table' },
    )

    expect(headers.find((header) => header.key === 'name')).toMatchObject({
      width: 384,
      minWidth: 160,
      maxWidth: 384,
    })
    expect(headers.find((header) => header.key === 'amount')).toMatchObject({
      minWidth: 120,
      maxWidth: 184,
      align: 'end',
    })
    expect(headers.find((header) => header.key === 'createdAt')).toMatchObject({
      minWidth: 168,
      maxWidth: 208,
    })
    expect(headers.find((header) => header.key === 'state')).toMatchObject({
      minWidth: 96,
      maxWidth: 144,
      align: 'center',
    })
  })

  it('derives role, width, alignment, and tabular styling from presentation metadata', () => {
    const headers = resolveTableHeaders(
      [
        { key: 'person', title: 'Person', presentation: { kind: 'identity' } },
        {
          key: 'revenue',
          title: 'Revenue',
          presentation: { kind: 'currency', currency: 'GBP' },
        },
        { key: 'enabled', title: 'Enabled', presentation: { kind: 'boolean' } },
        { key: 'momentum', title: 'Momentum', presentation: { kind: 'trend' } },
      ],
      { hasHorizontalOverflow: false, presentation: 'table' },
    )

    expect(headers.find((header) => header.key === 'person')).toMatchObject({
      minWidth: 160,
      maxWidth: 384,
      align: 'start',
    })
    expect(headers.find((header) => header.key === 'revenue')).toMatchObject({
      minWidth: 120,
      maxWidth: 184,
      align: 'end',
    })
    expect(headers.find((header) => header.key === 'enabled')).toMatchObject({
      minWidth: 96,
      maxWidth: 144,
      align: 'center',
    })
    expect(
      (headers.find((header) => header.key === 'momentum')?.cellProps as { class?: string[] })
        .class,
    ).toContain('va-data-table__cell--tabular')
  })

  it('keeps action pinning structurally stable while presenting it only on overflow', () => {
    const fit = resolveTableHeaders(columns, {
      hasHorizontalOverflow: false,
      presentation: 'table',
    })
    const overflowing = resolveTableHeaders(columns, {
      hasHorizontalOverflow: true,
      presentation: 'table',
    })
    const cards = resolveTableHeaders(columns, {
      hasHorizontalOverflow: true,
      presentation: 'cards',
    })

    expect(fit.find((header) => header.key === 'actions')?.fixed).toBe('end')
    expect(overflowing.find((header) => header.key === 'actions')?.fixed).toBe('end')
    expect(cards.find((header) => header.key === 'actions')?.fixed).toBeUndefined()
  })

  it('auto-pins an action role without page-level pin configuration', () => {
    const automaticColumns: readonly DataColumn<Row>[] = [
      { key: 'name', title: 'Name', role: 'identity' },
      { key: 'actions', title: 'Actions', role: 'actions' },
    ]
    const overflowing = resolveTableHeaders(automaticColumns, {
      hasHorizontalOverflow: true,
      presentation: 'table',
    })
    const optedOut = resolveTableHeaders(
      automaticColumns.map((column) =>
        column.key === 'actions' ? { ...column, pin: 'none' as const } : column,
      ),
      { hasHorizontalOverflow: true, presentation: 'table' },
    )

    expect(overflowing.find((header) => header.key === 'actions')?.fixed).toBe('end')
    expect(optedOut.find((header) => header.key === 'actions')?.fixed).toBeUndefined()
  })

  it('honors one explicit fill column in content mode and degrades extra fills safely', () => {
    const headers = resolveTableHeaders(
      [
        { key: 'name', title: 'Name', sizing: { mode: 'fill', min: 160 } },
        { key: 'note', title: 'Note', sizing: { mode: 'fill', min: 120 } },
      ],
      { hasHorizontalOverflow: false, presentation: 'table' },
      { mode: 'content' },
    )

    expect(headers.find((header) => header.key === 'name')?.width).toBe(384)
    expect(headers.find((header) => header.key === 'note')?.width).toBeUndefined()
  })

  it('uses a tolerance to avoid sub-pixel pinning oscillation', () => {
    expect(isMeaningfulOverflow(1001.5, 1000, 2)).toBe(false)
    expect(isMeaningfulOverflow(1003, 1000, 2)).toBe(true)
  })

  it('never pins ordinary edge columns merely because the table overflows', () => {
    const headers = resolveTableHeaders(
      [
        { key: 'first', title: 'First' },
        { key: 'middle', title: 'Middle' },
        { key: 'last', title: 'Last' },
      ],
      { hasHorizontalOverflow: true, presentation: 'table' },
    )

    expect(headers.every((header) => header.fixed === undefined)).toBe(true)
    expect(chooseFillColumn([{ key: 'count', title: 'Count', dataType: 'number' }])).toBeUndefined()
  })

  it('applies bounded user widths without changing the default pinning policy', () => {
    const headers = resolveTableHeaders(
      columns,
      { hasHorizontalOverflow: true, presentation: 'table' },
      { columnWidths: { name: 412, amount: 8 } },
    )

    const name = headers.find((header) => header.key === 'name')
    expect(name).toMatchObject({
      width: 412,
      minWidth: 412,
      maxWidth: 412,
    })
    expect(name?.fixed).toBeUndefined()
    expect(headers.find((header) => header.key === 'amount')).toMatchObject({
      width: 64,
      minWidth: 64,
      maxWidth: 64,
    })
    expect(headers.find((header) => header.key === 'actions')?.fixed).toBe('end')
  })

  it('resolves resize capability and column-specific bounds explicitly', () => {
    expect(resolveColumnResizeBounds({ key: 'name', title: 'Name', resize: { min: 120 } })).toEqual(
      { min: 120, max: 720 },
    )
    expect(isColumnResizable({ key: 'selection', title: '', role: 'selection' })).toBe(false)
    expect(isColumnResizable({ key: 'actions', title: 'Actions', role: 'actions' })).toBe(false)
    expect(isColumnResizable({ key: 'name', title: 'Name' })).toBe(true)
    expect(isColumnResizable({ key: 'name', title: 'Name' }, { resizable: false })).toBe(false)
    expect(
      isColumnResizable({ key: 'name', title: 'Name', resizable: true }, { resizable: false }),
    ).toBe(true)
  })

  it('honors explicit logical pinning and exact fixed sizing', () => {
    const headers = resolveTableHeaders(
      [
        {
          key: 'id',
          title: 'ID',
          sizing: { mode: 'fixed', size: 72 },
          pin: 'start',
          align: 'end',
          headerAlign: 'center',
        },
        { key: 'name', title: 'Name', sizing: { mode: 'fill', max: 320 } },
        { key: 'menu', title: 'Menu', sizing: { mode: 'fixed', size: 64 }, pin: 'end' },
      ],
      { hasHorizontalOverflow: false, presentation: 'table' },
    )

    expect(headers[0]).toMatchObject({
      width: 72,
      minWidth: 72,
      maxWidth: 72,
      fixed: 'start',
      align: 'end',
    })
    expect(headers[0]?.headerProps?.class).toContain('text-center')
    expect(headers[2]).toMatchObject({ width: 64, fixed: 'end' })
  })

  it('supports disabling automatic action pinning at table level', () => {
    const headers = resolveTableHeaders(
      [
        { key: 'name', title: 'Name', role: 'identity' },
        { key: 'actions', title: 'Actions', role: 'actions' },
      ],
      { hasHorizontalOverflow: true, presentation: 'table' },
      { autoPinActions: false, actionWidth: 164 },
    )

    const actions = headers.find((header) => header.key === 'actions')
    expect(actions).toMatchObject({ width: 164 })
    expect(actions?.fixed).toBeUndefined()
  })

  it('removes hidden columns and derives overflow classes from sizing intent', () => {
    const headers = resolveTableHeaders(
      [
        { key: 'hidden', title: 'Hidden', visible: false },
        { key: 'description', title: 'Description', overflow: 'wrap' },
        { key: 'enabled', title: 'Enabled', dataType: 'boolean' },
      ],
      { hasHorizontalOverflow: false, presentation: 'table' },
      { mode: 'content' },
    )

    expect(headers.map((header) => header.key)).toEqual(['description', 'enabled'])
    expect(headers[0]?.width).toBeUndefined()
    expect(headers[0]?.nowrap).toBe(false)
    expect((headers[0]?.cellProps as { class?: string[] } | undefined)?.class).toContain(
      'va-data-table__cell--wrap',
    )
    expect(headers[1]?.align).toBe('center')
  })
})
