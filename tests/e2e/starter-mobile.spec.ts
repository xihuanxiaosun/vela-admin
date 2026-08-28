import { expect, test } from '@playwright/test'

test('keeps the Starter user workflow usable at phone width', async ({ page }) => {
  await page.goto('/users')

  await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible()
  await expect(page.locator('.va-app-shell__user')).toBeVisible()
  await page.locator('.va-app-shell__user').click()
  await expect(
    page.locator('.v-overlay--active').getByText('Viewer', { exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible()
  const documentDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(documentDimensions.scrollWidth).toBe(documentDimensions.clientWidth)

  await page.getByRole('button', { name: 'Filters' }).click()
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('combobox', { name: 'Account status' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toBeHidden()

  await page.getByRole('button', { name: 'New user' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create user' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('.v-dialog--fullscreen')).toBeVisible()
  const dialogDimensions = await dialog.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dialogDimensions.scrollWidth).toBeLessThanOrEqual(dialogDimensions.clientWidth)
  await expect(dialog.getByRole('textbox', { name: 'Display name' })).toBeVisible()
  await expect(page).toHaveScreenshot('starter-users-mobile.png', { fullPage: true })
})
