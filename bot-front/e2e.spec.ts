import { test, expect } from '@playwright/test';

test('home loads', async ({ page }) => {
  await page.goto('http://localhost');
  await expect(page).toHaveTitle(/.*/);
});
