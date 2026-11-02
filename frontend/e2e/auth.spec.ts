import { test, expect } from '@playwright/test';
import { loadTestEnv } from './support/env';
import { ensureTestUser } from './support/seed';

test.describe('authentication', () => {
  test('redirects unauthenticated users away from protected pages', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/access$/);
    await expect(
      page.getByRole('heading', { name: 'Welcome back!' })
    ).toBeVisible();
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/access');

    await page
      .getByLabel('Email')
      .fill(`missing-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page.getByText('Incorrect email or password.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/access$/);
  });

  test('signs in with valid credentials', async ({ page }) => {
    loadTestEnv();
    const { email, password } = await ensureTestUser();

    await page.goto('/access');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByText("Today's Quests")).toBeVisible({
      timeout: 30_000,
    });
  });
});
