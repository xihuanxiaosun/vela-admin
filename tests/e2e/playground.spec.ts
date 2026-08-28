import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

function seriousViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    .map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        summary: node.failureSummary,
        target: node.target,
      })),
    }))
}

async function openCleanPlayground(page: Page, hash = 'overview') {
  await page.goto(`/#${hash}`)
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.locator('.va-app-shell')).toBeVisible()
}

async function switchToSimplifiedChinese(page: Page) {
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.getByText('简体中文', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
}

test.beforeEach(async ({ page }) => {
  await openCleanPlayground(page)
})

test('renders a stable, responsive Materio-inspired shell', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Good morning, Maya.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
  await expect(page).toHaveScreenshot('playground-light.png', { fullPage: true })
})

test('navigates, opens centered overlays, and exposes feedback through one API host', async ({
  page,
}) => {
  await page.getByRole('link', { name: 'Components' }).click()
  await expect(page).toHaveURL(/#components$/)

  await page.getByRole('button', { name: 'Open modal' }).click()
  await expect(page.getByRole('dialog', { name: 'Create workspace' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog', { name: 'Create workspace' })).toBeHidden()

  await page.clock.install()
  await page.getByRole('button', { name: 'Success', exact: true }).click()
  const toast = page.locator('.v-snackbar__wrapper').filter({ hasText: 'Record saved' })
  await expect(toast).toBeVisible()
  await page.addStyleTag({
    content: '.v-snackbar__timer { visibility: hidden !important; }',
  })
  await expect(toast).toHaveScreenshot('success-toast.png')
  await toast.getByRole('button').click()

  await page.getByRole('button', { name: 'Global API' }).click()
  const loadingStatus = page.locator('.va-global-loading-host__status')
  await expect(loadingStatus).toBeVisible()
  await expect(loadingStatus).toContainText('Preparing your workspace')
  await expect(loadingStatus).toHaveScreenshot('global-loading-status.png')
  await page.clock.fastForward(1_200)
  await expect(loadingStatus).toBeHidden()
})

test('persists dark and semi-dark appearance without application-specific wiring', async ({
  page,
}) => {
  await page.locator('.va-app-shell__header-action[aria-label="Settings"]').click()
  const dialog = page.getByRole('dialog', { name: 'Workspace settings' })
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Dark' }).click()
  await dialog.getByRole('radio', { name: /Semi-dark/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-vela-skin', 'semi-dark')
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('vela-playground:vela.appearance')))
    .toContain('"mode":"dark"')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveScreenshot('playground-dark-semi-dark.png', { fullPage: true })
})

test('persists Shell layout independently of navigation and permissions', async ({ page }) => {
  await expect(page.locator('.va-app-shell__header-surface')).toHaveCSS('max-width', '1440px')
  await expect(page.locator('.va-app-shell__tabs')).toHaveCSS('max-width', '1440px')
  await expect(page.locator('.va-app-shell__content')).toHaveCSS('max-width', '1440px')

  await page.locator('.va-app-shell__header-action[aria-label="Settings"]').click()
  const dialog = page.getByRole('dialog', { name: 'Workspace settings' })
  await dialog.getByRole('tab', { name: 'Layout' }).click()
  await dialog.getByRole('radio', { name: /Top navigation/ }).click()
  await dialog.getByRole('button', { name: 'Full width' }).click()
  await dialog.getByRole('button', { name: 'Attached' }).click()
  await dialog.getByRole('button', { name: 'Spacious' }).click()

  await expect(page.locator('.va-app-shell')).toHaveClass(/va-app-shell--layout-topbar/)
  await expect(page.locator('.va-app-shell')).toHaveClass(/va-app-shell--content-fluid/)
  await expect(page.locator('.va-app-shell')).toHaveClass(/va-app-shell--header-attached/)
  await expect(page.locator('.va-app-shell')).toHaveClass(/va-app-shell--spacing-spacious/)
  await expect(page.locator('.va-app-shell__header-surface')).toHaveCSS('max-width', 'none')
  await expect(page.locator('.va-app-shell__tabs')).toHaveCSS('max-width', 'none')
  await expect(page.locator('.va-app-shell__content')).toHaveCSS('max-width', 'none')
  await expect(page.getByRole('tab', { name: 'Adaptive data page' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('vela-playground:vela.shell')))
    .toContain('"layout":"topbar"')
})

test('persists accessible text scale and contrast as independent preferences', async ({ page }) => {
  await page.locator('.va-app-shell__header-action[aria-label="Settings"]').click()
  const dialog = page.getByRole('dialog', { name: 'Workspace settings' })
  await dialog.getByRole('tab', { name: 'Accessibility' }).click()
  await dialog.getByRole('button', { name: 'Large' }).click()
  await dialog.getByRole('button', { name: 'High' }).click()

  await expect(page.locator('html')).toHaveAttribute('data-vela-font-scale', 'large')
  await expect(page.locator('html')).toHaveAttribute('data-vela-contrast', 'high')
  await expect(page.locator('html')).toHaveCSS('font-size', '17px')
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('vela-playground:vela.appearance')))
    .toContain('"contrast":"high"')

  const results = await new AxeBuilder({ page }).include('.va-appearance-settings').analyze()
  expect(seriousViolations(results)).toEqual([])
})

test('switches the complete workspace to RTL without horizontal overflow', async ({ page }) => {
  await page.getByRole('link', { name: 'Components' }).click()
  await page.getByTestId('locale-ar').click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByText('RTL', { exact: true })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)

  const results = await new AxeBuilder({ page }).analyze()
  expect(seriousViolations(results)).toEqual([])
  await expect(page).toHaveScreenshot('playground-rtl.png', { fullPage: true })

  await page.getByRole('link', { name: 'Adaptive data page' }).click()
  await page.getByRole('checkbox', { name: 'Overflow stress test' }).check()
  await expect(page.locator('.va-data-table')).toHaveClass(/va-data-table--overflowing/)
  await expect(page.locator('.v-data-table-column--fixed-end').first()).toBeVisible()
})

test('switches every Playground surface and framework control to Simplified Chinese', async ({
  page,
}) => {
  await switchToSimplifiedChinese(page)

  await expect(page.getByLabel('主导航').getByText('基础能力', { exact: true })).toBeVisible()
  await expect(page.getByLabel('主导航').getByText('后台模式', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '早上好，Maya。' })).toBeVisible()
  await expect(page.getByRole('link', { name: '概览', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.getByRole('button', { name: /Maya Chen.*框架预览/ }).click()
  await page.getByText('个人资料', { exact: true }).click()
  await expect(
    page.locator('.v-snackbar__wrapper').filter({ hasText: '已打开个人资料' }),
  ).toBeVisible()
  await page.keyboard.press('Control+k')
  const commandPalette = page.getByRole('dialog', { name: '搜索导航' })
  await expect(commandPalette.getByRole('textbox', { name: '搜索页面和操作' })).toBeFocused()
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: '组件', exact: true }).click()
  await expect(page.getByRole('heading', { name: '以意图组织组件' })).toBeVisible()
  await expect(page.getByRole('button', { name: '新建记录' })).toBeVisible()
  await expect(page.getByText('空状态', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '打开弹窗' }).click()
  const exampleDialog = page.getByRole('dialog', { name: '创建工作区' })
  await expect(exampleDialog.getByRole('button', { name: '取消' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(exampleDialog).toBeHidden()
  await page.getByRole('button', { name: '成功', exact: true }).click()
  await expect(page.locator('.v-snackbar__wrapper').filter({ hasText: '记录已保存' })).toBeVisible()

  await page.getByRole('link', { name: '用户管理', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '搜索用户' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: '账号状态' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '用户' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '最近活跃' })).toBeVisible()
  await expect(page.getByText('第 1–15 条，共 36 条', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '编辑' }).first().click()
  const userDialog = page.getByRole('dialog', { name: '编辑用户' })
  await expect(userDialog.getByText('身份信息', { exact: true })).toBeVisible()
  await expect(userDialog.getByRole('button', { name: '保存修改' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: '自适应数据页', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '搜索' })).toBeVisible()
  const stressMode = page.getByRole('checkbox', { name: '宽表压力模式' })
  await expect(stressMode).toBeVisible()
  await stressMode.check()
  await expect(page.getByRole('columnheader', { name: /登录次数/ })).toBeVisible()
  await expect(page.getByRole('button', { name: '列设置' })).toBeVisible()

  await page.getByRole('link', { name: '财务运营', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '搜索支付记录' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '交易总额' })).toBeVisible()
  await expect(page.getByText('上门保洁', { exact: true }).first()).toBeVisible()

  await page.getByRole('link', { name: '内容审核', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '搜索审核队列' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '预审方式' })).toBeVisible()
  await expect(page.getByRole('button', { name: '审核' }).first()).toBeVisible()

  await page.getByRole('link', { name: '宽表格', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '搜索账号' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '机构' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '月收入' })).toBeVisible()
  await expect(page.getByText('第 1–25 条，共 1280 条', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: '表单构建器', exact: true }).click()
  await expect(page.getByRole('heading', { name: '解耦业务的表单校验' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '显示名称' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: '默认角色' })).toBeVisible()
  await expect(page.getByRole('button', { name: '保存资料' })).toBeVisible()

  await page.getByRole('link', { name: '上传队列', exact: true }).click()
  await expect(page.getByRole('heading', { name: '让每个上传状态都有清晰反馈' })).toBeVisible()
  await expect(page.getByText('选择活动封面', { exact: true })).toBeVisible()
  await expect(page.getByText('添加商品图片', { exact: true })).toBeVisible()

  await page.locator('.va-app-shell__header-action[aria-label="设置"]').click()
  const settings = page.getByRole('dialog', { name: '工作区设置' })
  await expect(settings.getByText('颜色模式', { exact: true })).toBeVisible()
  await expect(settings.getByRole('button', { name: '浅色' })).toBeVisible()
  await expect(settings.getByText('界面密度', { exact: true })).toBeVisible()
})

test('opens command search from the keyboard and restores focus', async ({ page }) => {
  const searchButton = page.getByRole('button', { name: 'Search' })
  await searchButton.focus()
  await page.keyboard.press('Control+k')

  const palette = page.getByRole('dialog', { name: 'Search navigation' })
  await expect(palette).toBeVisible()
  await expect(palette.getByRole('textbox')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(palette).toBeHidden()
})

test('drives filters, column preferences, selection, paging, and stable action pinning', async ({
  page,
}) => {
  await page.getByRole('link', { name: 'Adaptive data page' }).click()
  await expect(page.getByRole('tab', { name: 'Adaptive data page' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator('.va-data-table')).not.toHaveClass(/va-data-table--overflowing/)
  await expect(page.locator('.v-data-table-column--fixed-end').first()).toBeVisible()

  await page.getByRole('textbox', { name: 'Search' }).fill('maya')
  await expect(page.getByText('Search: maya')).toBeVisible()
  await expect(page.getByText('1–8 of 8')).toBeVisible()
  await expect(page).toHaveURL(/accounts\.filter\.keyword=maya/)

  await page.getByRole('button', { name: 'Saved views' }).click()
  await page
    .locator('.va-saved-views__footer')
    .getByRole('button', { name: 'Save as new', exact: true })
    .click()
  const saveViewDialog = page.getByRole('dialog', { name: 'Save current view' })
  await saveViewDialog.getByRole('textbox', { name: 'View name' }).fill('Maya accounts')
  await saveViewDialog.getByRole('button', { name: 'Save view' }).click()
  await expect(saveViewDialog).toBeHidden()
  await page.keyboard.press('Escape')

  await page.getByRole('textbox', { name: 'Search' }).fill('noah')
  await expect(page.getByText('Search: noah')).toBeVisible()
  await page.getByRole('button', { name: 'Saved views' }).click()
  await page.getByText('Maya accounts', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search' })).toHaveValue('maya')
  await expect(page.getByText('1–8 of 8')).toBeVisible()

  await page.getByRole('button', { name: 'Columns' }).click()
  await page.getByRole('checkbox', { name: 'Email' }).uncheck()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('columnheader', { name: 'Email' })).toBeHidden()

  const accountHeader = page.getByRole('columnheader', { name: 'Account' })
  const initialWidth = await accountHeader.evaluate(
    (element) => element.getBoundingClientRect().width,
  )
  const resizedWidth = Math.round(initialWidth + 16)
  await page.getByRole('separator', { name: 'Resize Account column' }).press('ArrowRight')
  await expect
    .poll(() => accountHeader.evaluate((element) => element.getBoundingClientRect().width))
    .toBe(resizedWidth)
  await page.reload()
  await expect(page.getByRole('columnheader', { name: 'Account' })).toHaveCSS(
    'width',
    `${resizedWidth}px`,
  )
  await expect(page.getByRole('textbox', { name: 'Search' })).toHaveValue('maya')
  await expect(page.getByText('1–8 of 8')).toBeVisible()

  await page.locator('tbody input[type="checkbox"]').first().check()
  await expect(page.getByText('1 selected')).toBeVisible()
  await page.getByRole('button', { name: 'Select all 8' }).click()
  await expect(page.getByText('8 selected')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Overflow stress test' }).check()
  await expect(page.locator('.va-data-table')).toHaveClass(/va-data-table--overflowing/)
  await expect(page.locator('.v-data-table-column--fixed-end').first()).toBeVisible()
  const tableDimensions = await page.locator('.v-table__wrapper').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(tableDimensions.scrollWidth).toBeGreaterThan(tableDimensions.clientWidth)

  const workspaceDimensions = await page.evaluate(() => ({
    pageHeight: document.documentElement.scrollHeight,
    viewportHeight: document.documentElement.clientHeight,
    pagerBottom: document.querySelector('.va-pager')?.getBoundingClientRect().bottom ?? Infinity,
  }))
  expect(workspaceDimensions.pageHeight).toBe(workspaceDimensions.viewportHeight)
  expect(workspaceDimensions.pagerBottom).toBeLessThanOrEqual(workspaceDimensions.viewportHeight)
})

test('renders semantic table cells and a stable pinned action surface', async ({ page }) => {
  await page.getByRole('link', { name: 'User management' }).click()
  const userWorkspace = page.locator('.playground-data-workspace')
  await expect(userWorkspace.locator('.va-table-cell--identity').first()).toBeVisible()
  await expect(userWorkspace.locator('.va-tag').first()).toBeVisible()
  const userActionCell = userWorkspace.locator('tbody td.v-data-table-column--fixed-end').first()
  await expect(userActionCell).toHaveCSS('position', 'sticky')
  await expect(userWorkspace).toHaveScreenshot('user-management-data-page.png')

  await page.getByRole('link', { name: 'Wide data table' }).click()
  const wideWorkspace = page.locator('.playground-data-workspace')
  const scroller = wideWorkspace.locator('.v-table__wrapper')
  await scroller.evaluate((element) => element.scrollTo({ left: 1_550, behavior: 'instant' }))
  const actionHeader = wideWorkspace.locator('thead th.v-data-table-column--fixed-end').first()
  const actionCell = wideWorkspace.locator('tbody td.v-data-table-column--fixed-end').first()
  const pinnedEdges = await Promise.all([
    actionHeader.evaluate((element) => element.getBoundingClientRect().right),
    actionCell.evaluate((element) => element.getBoundingClientRect().right),
  ])
  expect(Math.abs(pinnedEdges[0] - pinnedEdges[1])).toBeLessThanOrEqual(1)
  await expect(actionCell).toHaveCSS('position', 'sticky')
  await expect(wideWorkspace.locator('.va-table-cell--metric').first()).toBeVisible()
  await expect(wideWorkspace.locator('.va-table-cell--money').first()).toBeVisible()
  await expect(wideWorkspace.locator('.va-table-cell--time').first()).toBeVisible()
  await expect(wideWorkspace).toHaveScreenshot('wide-data-semantic-columns.png')
})

test('composes finance and moderation records from reusable semantic cells', async ({ page }) => {
  await page.getByRole('link', { name: 'Finance operations' }).click()
  const finance = page.locator('.playground-data-workspace')
  await expect(finance.locator('.va-table-cell--media').first()).toBeVisible()
  await expect(finance.locator('.va-table-cell--money').first()).toBeVisible()
  await expect(finance.locator('.va-table-cell--trend').first()).toBeVisible()
  await expect(finance.locator('.va-table-cell--progress').first()).toBeVisible()
  await expect(finance.getByText('-£73.3', { exact: true }).first()).toBeVisible()

  const financeScroller = finance.locator('.v-table__wrapper')
  await financeScroller.evaluate((element) =>
    element.scrollTo({ left: 2_000, behavior: 'instant' }),
  )
  const financeActionHeader = finance.locator('thead th.v-data-table-column--fixed-end').first()
  const financeActionCell = finance.locator('tbody td.v-data-table-column--fixed-end').first()
  const financePinnedEdges = await Promise.all([
    financeActionHeader.evaluate((element) => element.getBoundingClientRect().right),
    financeActionCell.evaluate((element) => element.getBoundingClientRect().right),
  ])
  expect(Math.abs(financePinnedEdges[0] - financePinnedEdges[1])).toBeLessThanOrEqual(1)
  await expect(finance).toHaveScreenshot('finance-semantic-workspace.png')

  await page.getByRole('link', { name: 'Moderation queue' }).click()
  const moderation = page.locator('.playground-data-workspace')
  await expect(moderation.locator('.va-table-cell--boolean').first()).toBeVisible()
  await expect(moderation.locator('.va-table-cell--progress').first()).toBeVisible()
  await expect(moderation.locator('.va-table-cell--trend').first()).toBeVisible()
  await expect(moderation.getByRole('button', { name: 'Review' }).first()).toBeVisible()

  await page.locator('.va-app-shell__header-action[aria-label="Settings"]').click()
  const settings = page.getByRole('dialog', { name: 'Workspace settings' })
  await settings.getByRole('button', { name: 'Dark' }).click()
  await page.keyboard.press('Escape')
  await expect(moderation).toHaveScreenshot('moderation-semantic-workspace-dark.png')

  const results = await new AxeBuilder({ page }).include('main').analyze()
  expect(seriousViolations(results)).toEqual([])
})

test('edits a user through the shared centered schema-form workflow', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.getByRole('link', { name: 'User management' }).click()
  await expect(page.getByRole('tab', { name: 'User management' })).toHaveAttribute(
    'aria-selected',
    'true',
  )

  const search = page.getByRole('textbox', { name: 'Search users' })
  await search.focus()
  expect(await search.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none')
  const status = page.getByRole('combobox', { name: 'Account status' })
  await status.focus()
  expect(await status.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none')
  await page.keyboard.press('Escape')

  const firstHeaderWidth = await page
    .getByRole('columnheader', { name: /User/ })
    .evaluate((element) => element.getBoundingClientRect().width)
  const firstRowHeight = await page
    .locator('.va-data-table tbody tr')
    .first()
    .evaluate((element) => element.getBoundingClientRect().height)
  expect(firstHeaderWidth).toBeGreaterThanOrEqual(220)
  expect(firstHeaderWidth).toBeLessThanOrEqual(320)
  expect(firstRowHeight).toBeGreaterThanOrEqual(50)

  await page.clock.install({ time: new Date('2026-08-27T12:00:00.000Z') })
  const refresh = page.getByRole('button', { name: 'Refresh' })
  const refreshWidth = await refresh.evaluate((element) => element.getBoundingClientRect().width)
  await refresh.click()
  const loadingButton = page.locator('button.va-button--loading')
  await expect(loadingButton).toBeDisabled()
  await expect(loadingButton).toHaveAttribute('aria-busy', 'true')
  const loadingMetrics = await loadingButton.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    keepsIntentColor: element.classList.contains('bg-primary'),
  }))
  expect(loadingMetrics).toMatchObject({
    clientWidth: expect.any(Number),
    scrollWidth: expect.any(Number),
    keepsIntentColor: false,
  })
  expect(loadingMetrics.width).toBeGreaterThanOrEqual(refreshWidth)
  expect(loadingMetrics.scrollWidth).toBeLessThanOrEqual(loadingMetrics.clientWidth)
  await page.clock.fastForward(600)
  await expect(loadingButton).toBeHidden()
  await page.clock.resume()

  await page.getByRole('button', { name: 'Edit' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Edit user' })
  await expect(dialog).toBeVisible()

  const displayName = dialog.getByRole('textbox', { name: 'Display name' })
  await displayName.focus()
  expect(
    await displayName.evaluate((element) => {
      const field = element.closest('.v-field')
      return field ? getComputedStyle(field).boxShadow : undefined
    }),
  ).toBe('none')
  expect(await displayName.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
    'none',
  )
  const originalName = await displayName.inputValue()
  await displayName.fill(`${originalName} Updated`)
  await dialog.getByRole('button', { name: 'Save changes' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText(`${originalName} Updated`, { exact: true }).first()).toBeVisible()
  await expect(page.getByText(`${originalName} Updated was updated`)).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('restores an interrupted schema form from the injected draft store', async ({ page }) => {
  await page.getByRole('link', { name: 'Form builder' }).click()
  const displayName = page.getByRole('textbox', { name: 'Display name' })
  await displayName.fill('Recoverable workspace')
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem('vela-playground:workspace-profile.draft')),
    )
    .toContain('Recoverable workspace')

  await page.reload()
  const draftNotice = page.getByText('Unsaved draft available', { exact: true })
  await expect(draftNotice).toBeVisible()
  await page.getByRole('button', { name: 'Restore draft' }).click()
  await expect(page.getByRole('textbox', { name: 'Display name' })).toHaveValue(
    'Recoverable workspace',
  )
  await expect(draftNotice).toBeHidden()
})

test('uploads, previews and preprocesses images through the shared media surfaces', async ({
  page,
}) => {
  const consoleWarnings: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'warning') consoleWarnings.push(message.text())
  })

  const image = {
    name: 'campaign.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAASUlEQVR4nO3PQQ0AIBDAsAP/nuGNAvZoFSzZOjNnyNi1dwfgUQCeBeBZAJ4F4FkAngXgWQCeBeBZAJ4F4FkAngXgWQCeBeBZAJ4F4FkA3gC2owJ/0xZ6qQAAAABJRU5ErkJggg==',
      'base64',
    ),
  }

  await page.getByRole('link', { name: 'Upload queue' }).click()
  const cards = page.locator('.playground-upload-card')
  await expect(cards).toHaveCount(3)

  const existingTile = cards
    .nth(2)
    .locator('.va-file-upload__tile')
    .filter({ hasText: 'existing-cover.svg' })
  await expect(existingTile).toBeVisible()
  const removeExisting = existingTile.getByRole('button', { name: 'Remove file' })
  await removeExisting.click()
  await expect(removeExisting).toBeDisabled()
  await expect(removeExisting).toHaveAttribute('aria-busy', 'true')
  await expect(existingTile).toBeVisible()
  await expect(existingTile).toBeHidden()
  await expect(cards.nth(2).getByText('1 complete', { exact: true })).toBeVisible()

  await cards.nth(2).locator('input[type="file"]').setInputFiles(image)
  const campaignTile = cards
    .nth(2)
    .locator('.va-file-upload__tile')
    .filter({ hasText: 'campaign.png' })
  await expect(campaignTile).toBeVisible()
  await expect(campaignTile.getByText('Uploaded', { exact: true })).toBeVisible()
  await campaignTile.getByRole('button', { name: /Preview image/ }).click()
  const previewDialog = page.getByRole('dialog', { name: 'campaign.png' })
  await expect(previewDialog).toBeVisible()
  await previewDialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(previewDialog).toBeHidden()

  await cards.nth(1).locator('input[type="file"]').setInputFiles(image)
  const cropDialog = page.getByRole('dialog', { name: 'Crop image' })
  await expect(cropDialog).toBeVisible()
  await expect(cropDialog.getByRole('toolbar', { name: 'Image editing tools' })).toBeVisible()
  await expect(cropDialog.getByRole('button', { name: 'Zoom in' })).toBeVisible()
  await cropDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(cropDialog).toBeHidden()

  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.getByText('简体中文', { exact: true }).click()
  await expect(campaignTile.getByText('上传成功', { exact: true })).toBeVisible()
  await expect(campaignTile.getByRole('button', { name: '移除文件' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')

  await page.locator('.va-app-shell__header-action[aria-label="设置"]').click()
  const appearance = page.getByRole('dialog', { name: '工作区设置' })
  await appearance.getByRole('button', { name: '深色' }).click()
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(page).toHaveScreenshot('upload-workflows-dark-zh.png', { fullPage: true })

  const results = await new AxeBuilder({ page }).include('main').analyze()
  expect(seriousViolations(results)).toEqual([])
  expect(consoleWarnings).toEqual([])
})

test('contains a 1,280-row, 19-column dataset and keeps actions pinned under real overflow', async ({
  page,
}) => {
  await page.getByRole('link', { name: 'Wide data table' }).click()
  await expect(page.getByRole('tab', { name: 'Wide data table' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByText('1–25 of 1280')).toBeVisible()

  const jump = page.getByRole('spinbutton', { name: 'Jump to page' })
  await jump.fill('52')
  await jump.press('Enter')
  await expect(page.getByText('1276–1280 of 1280')).toBeVisible()

  const table = page.locator('.va-data-table')
  await expect(table).toHaveClass(/va-data-table--overflowing/)
  await expect(page.locator('.v-data-table-column--fixed-end').first()).toBeVisible()

  const wrapper = page.locator('.v-table__wrapper')
  const dimensions = await wrapper.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth)

  const initialScrollLeft = await wrapper.evaluate((element) => element.scrollLeft)
  await wrapper.evaluate((element) => element.scrollTo({ left: element.scrollWidth }))
  await expect
    .poll(() => wrapper.evaluate((element) => element.scrollLeft))
    .not.toBe(initialScrollLeft)

  const results = await new AxeBuilder({ page }).include('main').analyze()
  expect(seriousViolations(results)).toEqual([])
})

test('has no serious or critical axe violations on the shell and component gallery', async ({
  page,
}) => {
  const overviewResults = await new AxeBuilder({ page }).analyze()
  expect(seriousViolations(overviewResults)).toEqual([])

  await page.getByRole('link', { name: 'Components' }).click()
  const componentResults = await new AxeBuilder({ page }).analyze()
  expect(seriousViolations(componentResults)).toEqual([])
})

test('honours reduced-motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  const transitionDuration = await page.locator('.va-app-shell__drawer').evaluate((element) => {
    return window.getComputedStyle(element).transitionDuration
  })
  const seconds = transitionDuration
    .split(',')
    .map((duration) => duration.trim())
    .map((duration) =>
      duration.endsWith('ms') ? Number.parseFloat(duration) / 1_000 : Number.parseFloat(duration),
    )
  expect(Math.max(...seconds)).toBeLessThanOrEqual(0.000_01)
})
