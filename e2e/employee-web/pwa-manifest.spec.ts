import { test, expect } from '@playwright/test'

test('manifest is valid PWA', async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/manifest.webmanifest`)
  expect(res.ok()).toBeTruthy()
  const manifest = (await res.json()) as { display?: string; icons?: unknown[] }
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons?.length).toBeGreaterThan(0)
})
