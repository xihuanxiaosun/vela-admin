import { expect, test } from '@playwright/test'

const testImage = {
  name: 'mobile-cover.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAASUlEQVR4nO3PQQ0AIBDAsAP/nuGNAvZoFSzZOjNnyNi1dwfgUQCeBeBZAJ4F4FkAngXgWQCeBeBZAJ4F4FkAngXgWQCeBeBZAJ4F4FkA3gC2owJ/0xZ6qQAAAABJRU5ErkJggg==',
    'base64',
  ),
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#overview')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('uses a temporary navigation drawer without horizontal page overflow', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Good morning, Maya.' })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)

  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible()
  await expect(page).toHaveScreenshot('playground-mobile.png', { fullPage: true })

  await page.getByRole('link', { name: 'Components' }).click()
  await expect(page).toHaveURL(/#components$/)
  await expect(page.locator('.va-app-shell__drawer')).not.toHaveClass(/v-navigation-drawer--active/)
})

test('keeps centered modal actions usable at phone width', async ({ page }) => {
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Components' }).click()
  await page.getByRole('button', { name: 'Open modal' }).click()

  const dialog = page.getByRole('dialog', { name: 'Create workspace' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Create' })).toBeVisible()
})

test('keeps workspace settings scroll-safe at large text scale', async ({ page }) => {
  await page.locator('.va-app-shell__header-action[aria-label="Settings"]').click()
  const dialog = page.getByRole('dialog', { name: 'Workspace settings' })
  await dialog.getByRole('tab', { name: 'Accessibility' }).click()
  await dialog.getByRole('button', { name: 'Large' }).click()
  await dialog.getByRole('button', { name: 'High' }).click()

  await expect(page.locator('html')).toHaveAttribute('data-vela-font-scale', 'large')
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeVisible()
  const dimensions = await dialog.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})

test('moves secondary data filters into a touch-friendly sheet and contains table overflow', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Adaptive data page' }).click()

  await expect(page.getByRole('textbox', { name: 'Search' })).toBeVisible()
  await page.getByRole('button', { name: 'Filters' }).click()
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  await expect(sheet).toBeVisible()
  const status = sheet.getByRole('combobox', { name: 'Status' })
  await status.focus()
  await status.press('ArrowDown')
  await page.getByRole('option', { name: 'Active' }).click()
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toBeHidden()

  await expect(page.getByText('Status: Active')).toBeVisible()
  const tableDimensions = await page.locator('.v-table__wrapper').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(tableDimensions.scrollWidth).toBeGreaterThan(tableDimensions.clientWidth)
  await expect(page.locator('.v-data-table-column--fixed-end').first()).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)
})

test('keeps semantic finance rows readable while containing horizontal overflow', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Finance operations' }).click()

  const workspace = page.locator('.playground-data-workspace')
  await expect(workspace.locator('.va-table-cell--media').first()).toBeVisible()
  await expect(workspace.locator('.va-table-cell--money').first()).toBeVisible()
  await expect(workspace.locator('.v-data-table-column--fixed-end').first()).toBeVisible()
  const tableDimensions = await workspace.locator('.v-table__wrapper').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(tableDimensions.scrollWidth).toBeGreaterThan(tableDimensions.clientWidth)
  const documentDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(documentDimensions.scrollWidth).toBe(documentDimensions.clientWidth)
})

test('keeps the user editor full-screen and operable on a phone', async ({ page }) => {
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'User management' }).click()
  await page.getByRole('button', { name: 'Edit' }).first().click()

  const dialog = page.getByRole('dialog', { name: 'Edit user' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('.v-dialog--fullscreen')).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Display name' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeVisible()

  const dimensions = await dialog.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})

test('stacks image-upload surfaces and keeps crop controls usable on a phone', async ({ page }) => {
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Upload queue' }).click()

  const cards = page.locator('.playground-upload-card')
  await expect(cards).toHaveCount(3)
  const gridColumns = await page
    .locator('.playground-upload-grid')
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns)
  expect(gridColumns.split(' ')).toHaveLength(1)

  await cards.nth(1).locator('input[type="file"]').setInputFiles(testImage)
  const cropDialog = page.getByRole('dialog', { name: 'Crop image' })
  await expect(cropDialog).toBeVisible()
  await expect(cropDialog.getByRole('button', { name: 'Apply crop' })).toBeVisible()
  const dimensions = await cropDialog.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  await expect(cropDialog).toHaveScreenshot('upload-crop-mobile.png')
})
