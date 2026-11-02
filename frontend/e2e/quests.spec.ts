import { test, expect } from '@playwright/test';
import { loadTestEnv } from './support/env';
import {
  TEST_COURSEWORK_TYPE,
  TEST_SUBJECT,
  clearQuests,
  ensureTestUser,
} from './support/seed';

function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T');
}

test.beforeAll(async () => {
  loadTestEnv();
  const { userId } = await ensureTestUser();
  await clearQuests(userId);
});

test('creates a quest and completes it from the dashboard', async ({
  page,
}) => {
  const title = `E2E quest ${Date.now()}`;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 2);
  deadline.setHours(12, 0, 0, 0);

  await page.goto('/questcalendar');

  await page.getByRole('button', { name: 'Add Quest' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByLabel('Quest Title').fill(title);

  await page.getByRole('combobox', { name: 'Subject' }).click();
  await page.getByRole('option', { name: TEST_SUBJECT }).click();

  await page.getByRole('combobox', { name: 'Coursework Type' }).click();
  await page
    .getByRole('option', { name: new RegExp(TEST_COURSEWORK_TYPE) })
    .click();

  await page.getByLabel('Deadline').fill(toDateTimeLocal(deadline));
  await page.getByLabel('Estimated Duration').fill('30');

  await page.getByRole('button', { name: 'Create Quest' }).click();

  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });

  await page.getByRole('tab', { name: 'Quest List' }).click();
  await expect(
    page
      .getByRole('tabpanel', { name: 'Quest List' })
      .getByText(title)
  ).toBeVisible({
    timeout: 15_000,
  });

  await page.goto('/dashboard');

  const completeButton = page.getByRole('button', {
    name: `Mark "${title}" as complete`,
  });

  await expect(completeButton).toBeVisible({ timeout: 30_000 });
  await completeButton.click();

  await expect(page.getByText('Quest completed!')).toBeVisible({
    timeout: 15_000,
  });

  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          '/api/quests?status=completed'
        );

        if (!response.ok()) return false;

        const body = await response.json();
        return body.quests.some(
          (quest: { title: string }) => quest.title === title
        );
      },
      { timeout: 15_000 }
    )
    .toBe(true);

  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          '/api/quests?status=pending'
        );

        if (!response.ok()) return true;

        const body = await response.json();
        return body.quests.some(
          (quest: { title: string }) => quest.title === title
        );
      },
      { timeout: 15_000 }
    )
    .toBe(false);
});
