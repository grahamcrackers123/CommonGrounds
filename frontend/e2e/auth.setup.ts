import { test as setup, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { assertTestEnvConfigured, loadTestEnv } from './support/env';
import { resetTestUserData } from './support/seed';

const authFile = path.join(process.cwd(), 'e2e', '.auth', 'user.json');

const WARM_UP_ENDPOINTS = [
  '/api/rewards/balance',
  '/api/notifications',
  '/api/rooms/active',
  '/api/interventions/prompt',
  '/api/interventions/status',
  '/api/daily/status',
  '/api/streak',
  '/api/quests',
];

// Next dev compiles routes lazily. If the first authenticated specs fire
// immediately after startup, some routes can briefly answer 404. Hitting
// them once here makes the rest of the run deterministic.
async function warmUpRoutes(page: Page) {
  for (const endpoint of WARM_UP_ENDPOINTS) {
    let status = 0;

    for (let attempt = 0; attempt < 20; attempt++) {
      status = (await page.request.get(endpoint)).status();

      if (status !== 404) break;

      await page.waitForTimeout(500);
    }

    if (status === 404) {
      throw new Error(`Warm-up failed: ${endpoint} still returned 404.`);
    }
  }
}

setup('prepare the test account and sign in', async ({ page }) => {
  loadTestEnv();
  assertTestEnvConfigured();

  const user = await resetTestUserData();

  await page.goto('/access');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await warmUpRoutes(page);

  await page.goto('/dashboard');
  await expect(page.getByText("Today's Quests")).toBeVisible({
    timeout: 30_000,
  });

  await page.goto('/questcalendar');
  await expect(page.getByRole('button', { name: 'Add Quest' })).toBeVisible({
    timeout: 30_000,
  });

  await mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
