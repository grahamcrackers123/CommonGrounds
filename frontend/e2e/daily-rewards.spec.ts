import { test, expect } from '@playwright/test';
import { loadTestEnv } from './support/env';
import { ensureTestUser, resetDailyLogin } from './support/seed';

test.beforeAll(async () => {
  loadTestEnv();
  const { userId } = await ensureTestUser();
  await resetDailyLogin(userId);
});

test('claims the daily login reward and persists the claim', async ({
  page,
}) => {
  await page.goto('/dashboard');

  await expect(page.getByText('Daily Login', { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  const claimButton = page.getByRole('button', {
    name: /Claim day \d+ reward/,
  });

  await expect(claimButton).toBeVisible({ timeout: 30_000 });
  await claimButton.click();

  await expect(page.getByText('Claimed today')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Reward claimed!')).toBeVisible({
    timeout: 15_000,
  });

  await page.reload();
  await expect(page.getByText('Claimed today')).toBeVisible({
    timeout: 30_000,
  });

  const response = await page.request.get('/api/daily/status');
  expect(response.ok()).toBeTruthy();

  const state = await response.json();
  expect(state.login.claimed).toBe(true);
});
