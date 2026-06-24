import { test, expect } from '@playwright/test'

test('attendance export buttons are visible', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('admin@monorganisation.com')
  await page.getByLabel(/mot de passe/i).fill('ChangeMe123!')
  const sku = page.getByLabel(/sku|organisation/i)
  if (await sku.count()) {
    await sku.fill('SOTR')
  }
  await page.getByRole('button', { name: /connexion|se connecter/i }).click()
  await page.waitForURL('/')
  await page.goto('/attendance/days')
  await expect(page.getByRole('button', { name: /Exporter CSV/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Exporter PDF/i })).toBeVisible()
})
