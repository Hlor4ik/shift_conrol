import { test, expect } from '@playwright/test';

test.describe('ShiftControl smoke', () => {
  test('API health endpoint responds', async ({ request }) => {
    const base = process.env.E2E_BASE_URL ?? 'https://shiftcontrol.atmosgrbot.ru';
    const res = await request.get(`${base}/api/v1/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('Login page loads', async ({ page }) => {
    const base = process.env.E2E_BASE_URL ?? 'https://shiftcontrol.atmosgrbot.ru';
    await page.goto(`${base}/login`);
    await expect(page.getByRole('heading', { name: /вход|login/i })).toBeVisible();
  });

  test('Miniapp index loads', async ({ page }) => {
    const base = process.env.E2E_BASE_URL ?? 'https://shiftcontrol.atmosgrbot.ru';
    await page.goto(`${base}/`);
    await expect(page.locator('body')).toBeVisible();
  });
});
