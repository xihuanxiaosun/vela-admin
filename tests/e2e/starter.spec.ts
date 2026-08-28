import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('ships clean routing, appearance, and feedback wiring without playground content', async ({
  page,
}) => {
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Your workspace is ready')).toBeVisible()
  await expect(page.getByText('Components with intent')).toBeHidden()

  await page.locator('.va-app-shell__navigation').getByText('Settings', { exact: true }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.getByText('简体中文', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
  await expect(page.getByText('请将设置模块作为相互独立的功能边界接入。')).toBeVisible()
  await expect(page.getByLabel('主导航').getByText('工作区', { exact: true })).toBeVisible()

  await page.locator('.va-app-shell__header-action[aria-label="设置"]').click()
  const appearanceDialog = page.getByRole('dialog', { name: '工作区设置' })
  await expect(appearanceDialog).toBeVisible()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
  await expect
    .poll(() =>
      appearanceDialog.evaluate((element) => {
        const overlayContent = element.closest('.v-overlay__content') ?? element
        return (
          window.getComputedStyle(overlayContent).opacity === '1' &&
          overlayContent.getAnimations().every((animation) => animation.playState !== 'running')
        )
      }),
    )
    .toBe(true)
  const dialogResults = await new AxeBuilder({ page }).include('.va-modal').analyze()
  expect(
    dialogResults.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
  await page.keyboard.press('Escape')
  await expect(appearanceDialog).toBeHidden()

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)

  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
  await expect(page).toHaveScreenshot('starter-settings.png', { fullPage: true })
})

test('provides a replaceable user CRUD reference workflow', async ({ page }) => {
  await page.goto('/users')

  await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Search users' })).toBeVisible()
  await expect(page.getByText('1–8 of 24')).toBeVisible()
  const results = await new AxeBuilder({ page }).include('main').analyze()
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
  await expect(page).toHaveScreenshot('starter-users.png', { fullPage: true })

  await page.getByRole('textbox', { name: 'Search users' }).fill('Maya')
  await expect(page.getByText('1–4 of 4')).toBeVisible()
  await expect(page.getByText('Maya Chen', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'New user' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Create user' })
  await expect(createDialog).toBeVisible()
  await createDialog.getByRole('textbox', { name: 'Display name' }).fill('Elena Price')
  await createDialog.getByRole('textbox', { name: 'Email address' }).fill('elena.price@example.dev')
  await createDialog.getByRole('button', { name: 'Save' }).click()
  await expect(createDialog).toBeHidden()
  await expect(page.getByText('Elena Price was created')).toBeVisible()

  await page.getByRole('textbox', { name: 'Search users' }).fill('Elena')
  await expect(page.getByText('1–1 of 1')).toBeVisible()
  const userRow = page.locator('tbody tr').filter({ hasText: 'Elena Price' })
  await expect(userRow).toBeVisible()
  await userRow.getByRole('button', { name: 'Edit' }).click()

  const editDialog = page.getByRole('dialog', { name: 'Edit user' })
  await expect(editDialog).toBeVisible()
  await editDialog.getByRole('textbox', { name: 'Display name' }).fill('Elena Price Updated')
  await editDialog.getByRole('button', { name: 'Save' }).click()
  await expect(editDialog).toBeHidden()
  await expect(page.getByText('Elena Price Updated was updated')).toBeVisible()
  await expect(page.getByText('Elena Price Updated', { exact: true })).toBeVisible()

  const updatedRow = page.locator('tbody tr').filter({ hasText: 'Elena Price Updated' })
  await updatedRow.getByRole('button', { name: 'Delete' }).click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete user?' })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Delete user' }).click()
  await expect(deleteDialog).toBeHidden()
  await expect(page.getByText('Elena Price Updated was deleted')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No users found' })).toBeVisible()
})

test('enforces role capabilities across routes, navigation, actions, and HTTP requests', async ({
  page,
}) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.locator('.va-app-shell__user').click()
  await page.locator('.v-overlay--active').getByText('Editor', { exact: true }).click()
  await expect(page).toHaveURL(/\/forbidden\?from=\/settings$/)
  await expect(page.getByRole('heading', { name: 'This role cannot open the page' })).toBeVisible()
  await expect(
    page.locator('.va-app-shell__navigation').getByText('Settings', { exact: true }),
  ).toBeHidden()

  await page.locator('.va-app-shell__user').click()
  await page.locator('.v-overlay--active').getByText('Administrator', { exact: true }).click()
  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await page.locator('.va-app-shell__navigation').getByText('User management').click()
  await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible()

  await page.locator('.va-app-shell__user').click()
  await page.locator('.v-overlay--active').getByText('Editor', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'New user' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeHidden()
  await expect(page.locator('.va-app-shell__navigation').getByText('Settings')).toBeHidden()

  await page.locator('.va-app-shell__user').click()
  await page.locator('.v-overlay--active').getByText('Viewer', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'New user' })).toBeHidden()
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeHidden()
  await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeHidden()
  await expect(page.getByText('1–8 of 24')).toBeVisible()
})
