import { test, expect } from '@playwright/test'

test('employee can open profile page', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('patrick.mukendi@sotrafer.cg')
  await page.getByLabel(/mot de passe/i).fill('ChangeMe123!')
  await page.getByRole('button', { name: /connexion|se connecter/i }).click()
  await page.waitForURL('/')
  await page.goto('/profile')
  await expect(page.getByText(/Mon profil|Sécurité/i)).toBeVisible()
})
