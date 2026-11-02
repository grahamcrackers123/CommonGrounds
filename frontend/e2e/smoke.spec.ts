import { test, expect } from '@playwright/test';

const protectedRoutes = [
  '/dashboard',
  '/askwasi',
  '/questcalendar',
  '/focusroom',
  '/petgarden',
  '/rewardshop',
  '/progressmap',
  '/help',
  '/settings',
  '/profile',
  '/notification',
];

for (const route of protectedRoutes) {
  test(`loads ${route} for a signed-in user`, async ({ page }) => {
    const response = await page.goto(route);

    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('body')).not.toContainText(
      'This page could not be found'
    );
  });
}
