import { test, expect } from '@playwright/test';
import { loadTestEnv } from './support/env';
import {
  clearInterventionState,
  ensureTestUser,
  seedInactiveEvent,
  setBurnoutNudges,
} from './support/seed';

let testUserId = '';

test.beforeAll(async () => {
  loadTestEnv();
  const user = await ensureTestUser();
  testUserId = user.userId;

  await setBurnoutNudges(testUserId, true);
  await clearInterventionState(testUserId);
  await seedInactiveEvent(testUserId);
});

test.afterAll(async () => {
  await setBurnoutNudges(testUserId, false);
  await clearInterventionState(testUserId);
});

test('detects inactivity, shows a restart prompt, and stores the dismissal', async ({
  page,
}) => {
  await page.goto('/dashboard');

  await expect(page.getByText('Workload needs attention')).toBeVisible({
    timeout: 30_000,
  });

  await expect(
    page.getByRole('heading', { name: 'Restart with 10 minutes' })
  ).toBeVisible({ timeout: 30_000 });

  await expect(
    page
      .getByRole('dialog')
      .getByText(/No study activity was recorded in the last 3 days/)
  ).toBeVisible();

  await page.getByRole('button', { name: 'Dismiss' }).click();

  await expect(
    page.getByRole('heading', { name: 'Restart with 10 minutes' })
  ).toBeHidden();

  const response = await page.request.get('/api/interventions/prompt');
  const body = await response.json();

  expect(body.prompt).toBeNull();
});
