import { test, expect } from '@playwright/test'

test('admin can open profile page', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('admin@monorganisation.com')
  await page.getByLabel(/mot de passe/i).fill('ChangeMe123!')
  const sku = page.getByLabel(/sku|organisation/i)
  if (await sku.count()) {
    await sku.fill('SOTR')
  }
  await page.getByRole('button', { name: /connexion|se connecter/i }).click()
  await page.waitForURL('/')
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: /profil/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Mot de passe/i })).toBeVisible()
})
