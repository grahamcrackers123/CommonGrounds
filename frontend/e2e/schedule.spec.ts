import { test, expect } from '@playwright/test';
import { loadTestEnv } from './support/env';
import {
  TEST_COURSEWORK_TYPE,
  TEST_SUBJECT,
  clearQuests,
  ensureTestUser,
  getAutoScheduleBlocks,
} from './support/seed';

let testUserId = '';

test.beforeAll(async () => {
  loadTestEnv();
  const user = await ensureTestUser();
  testUserId = user.userId;
  await clearQuests(testUserId);
});

test('regenerates an adaptive plan and persists auto blocks', async ({
  page,
}) => {
  const title = `E2E schedule ${Date.now()}`;
  const deadline = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  const createResponse = await page.request.post('/api/quests', {
    data: {
      title,
      subject: TEST_SUBJECT,
      coursework_type: TEST_COURSEWORK_TYPE,
      deadline: deadline.toISOString(),
      estimated_duration: 60,
    },
  });

  expect(createResponse.status()).toBe(201);

  const { quest } = await createResponse.json();

  await page.goto('/questcalendar');
  await page.getByRole('button', { name: 'Regenerate Plan' }).click();

  await expect(page.getByText(/Plan regenerated/)).toBeVisible({
    timeout: 30_000,
  });

  const blocks = await getAutoScheduleBlocks(testUserId);
  const block = blocks.find((entry) => entry.quest_id === quest.id);

  expect(block).toBeTruthy();

  const startsAt = new Date(block!.starts_at).getTime();
  const endsAt = new Date(block!.ends_at).getTime();

  expect(endsAt - startsAt).toBe(60 * 60 * 1000);
  expect(startsAt).toBeLessThan(deadline.getTime());
});
