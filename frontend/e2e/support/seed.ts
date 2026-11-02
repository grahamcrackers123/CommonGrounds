import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertTestEnvConfigured, requireEnv } from './env';

export const TEST_DISPLAY_NAME = 'Playwright Student';
export const TEST_SUBJECT = 'Mathematics';
export const TEST_COURSEWORK_TYPE = 'Homework';

function notificationPrefs(burnoutNudges: boolean) {
  return {
    deadlineReminders: false,
    focusReminders: false,
    burnoutNudges,
    rewardAlerts: false,
    friendInvites: false,
  };
}

const WEEKLY_AVAILABILITY = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
].map((day) => ({ day, start: '09:00', end: '17:00' }));

let admin: SupabaseClient | undefined;

function adminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  }

  return admin;
}

export type TestUser = {
  userId: string;
  email: string;
  password: string;
};

export async function ensureTestUser(
  options: { syncPassword?: boolean } = {}
): Promise<TestUser> {
  assertTestEnvConfigured();

  const supabase = adminClient();
  const email = requireEnv('TEST_USER_EMAIL');
  const password = requireEnv('TEST_USER_PASSWORD');

  let userId: string | undefined;
  let userExisted = false;

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: TEST_DISPLAY_NAME },
  });

  if (created.error) {
    if (!/already|registered|exists/i.test(created.error.message)) {
      throw created.error;
    }

    userExisted = true;

    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) throw error;

    const existing = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existing) {
      throw new Error(
        `Test user ${email} already exists but could not be found in the user list.`
      );
    }

    userId = existing.id;
  } else {
    userId = created.data.user.id;
  }

  // Supabase revokes existing sessions when a password changes. Only sync
  // the password once, before the setup login, so storageState stays valid.
  if (userExisted && options.syncPassword) {
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      userId,
      { password, email_confirm: true }
    );

    if (passwordError) throw passwordError;
  }

  const userCode = `E2E${userId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    user_code: userCode,
    display_name: TEST_DISPLAY_NAME,
    level: 'College',
    school: 'CommonGrounds Test',
    program: 'QA',
    enrollment_status: 'Full-time',
    focus_length: 25,
    subjects: [TEST_SUBJECT],
    weekly_availability: WEEKLY_AVAILABILITY,
    coursework_priorities: { [TEST_COURSEWORK_TYPE]: 'high' },
    notification_prefs: notificationPrefs(false),
    setup_complete: true,
    new_user_reward_claimed: true,
    tutorial_completed: true,
  });

  if (profileError) throw profileError;

  await ensurePet(userId);

  return { userId, email, password };
}

async function ensurePet(userId: string) {
  const supabase = adminClient();

  const { data: pet, error: readError } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  if (readError) throw readError;

  if (pet) {
    const { error } = await supabase
      .from('pets')
      .update({
        name: 'Test Sprout',
        species: 'bunny',
        level: 1,
        xp: 0,
        pet_energy: 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pet.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('pets').insert({
    owner_id: userId,
    name: 'Test Sprout',
    species: 'bunny',
    level: 1,
    xp: 0,
    pet_energy: 100,
  });

  if (error) throw error;
}

async function deleteForUser(table: string, userId: string) {
  const { error } = await adminClient()
    .from(table)
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

export async function resetTestUserData(): Promise<TestUser> {
  const user = await ensureTestUser({ syncPassword: true });

  await deleteForUser('schedule_blocks', user.userId);
  await deleteForUser('quests', user.userId);
  await deleteForUser('focus_sessions', user.userId);
  await deleteForUser('recovery_events', user.userId);
  await deleteForUser('intervention_prompts', user.userId);
  await deleteForUser('notifications', user.userId);
  await deleteForUser('behavioral_events', user.userId);

  const { error } = await adminClient()
    .from('profiles')
    .update({ student_coins: 100 })
    .eq('id', user.userId);

  if (error) throw error;

  return user;
}

export async function resetDailyLogin(userId: string) {
  const { error } = await adminClient()
    .from('behavioral_events')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'daily_login');

  if (error) throw error;
}

export async function clearQuests(userId: string) {
  await deleteForUser('schedule_blocks', userId);
  await deleteForUser('quests', userId);
}

export async function setBurnoutNudges(userId: string, enabled: boolean) {
  const { error } = await adminClient()
    .from('profiles')
    .update({ notification_prefs: notificationPrefs(enabled) })
    .eq('id', userId);

  if (error) throw error;
}

export async function clearInterventionState(userId: string) {
  await deleteForUser('recovery_events', userId);
  await deleteForUser('intervention_prompts', userId);
  await deleteForUser('notifications', userId);
  await deleteForUser('behavioral_events', userId);
}

export async function seedInactiveEvent(userId: string) {
  const occurredAt = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await adminClient().from('behavioral_events').insert({
    user_id: userId,
    type: 'daily_login',
    occurred_at: occurredAt,
    metadata: {},
  });

  if (error) throw error;
}

export async function getAutoScheduleBlocks(userId: string) {
  const { data, error } = await adminClient()
    .from('schedule_blocks')
    .select('id, quest_id, starts_at, ends_at, source')
    .eq('user_id', userId)
    .eq('source', 'auto');

  if (error) throw error;

  return (data ?? []) as Array<{
    id: string;
    quest_id: string | null;
    starts_at: string;
    ends_at: string;
    source: string;
  }>;
}
