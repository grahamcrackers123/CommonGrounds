import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/push/send';
import { computeRiskFlags, FLAG_TITLES } from '@/lib/interventions/notify'; // adjust path if needed

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const WELLNESS_UTC_HOUR = 1; // 01:00 UTC = 9:00 AM in the Philippines

// Monday's date (UTC) for the current week, used as a weekly dedup key
function weekKey(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() - day + 1);
  return t.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // what was actually sent
  const results = { deadlines: 0, focus: 0, wellness: 0 };
  // diagnostics: how many candidates each step found, and why some weren't sent
  const found = { deadlines: 0, focus: 0, wellnessUsersChecked: 0 };
  const skipped: Record<string, number> = {};
  const errors: string[] = [];

  const bump = (reason: string) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };

  // sendNotification wrapper: records skip reasons and never lets one failure stop the run
  async function send(...args: Parameters<typeof sendNotification>) {
    try {
      const r = await sendNotification(...args);
      if (r.skipped) bump(r.skipped);
      return r;
    } catch (e) {
      const message = (e as { message?: string })?.message ?? String(e);
      console.error('sendNotification failed:', message);
      errors.push(message);
      bump('error');
      return { sent: 0, skipped: 'error' } as { sent: number; skipped?: string };
    }
  }

  // ── 1. Deadline reminders: unfinished quests due within 24h ──────────────
  const { data: quests, error: questsError } = await admin
    .from('quests')
    .select('id, user_id, title, deadline')
    .in('status', ['pending', 'in_progress'])
    .gt('deadline', now.toISOString())
    .lte('deadline', new Date(now.getTime() + DAY).toISOString());
  if (questsError) errors.push(`quests query: ${questsError.message}`);
  found.deadlines = quests?.length ?? 0;

  for (const q of quests ?? []) {
    const hours = Math.max(1, Math.round((new Date(q.deadline).getTime() - now.getTime()) / HOUR));
    const r = await send(
      q.user_id,
      'quest_deadline',
      { title: 'Deadline coming up', body: `"${q.title}" is due in about ${hours}h.`, url: '/dashboard' },
      { dedupKey: `quest:${q.id}:24h` } // one reminder per quest
    );
    results.deadlines += r.sent;
  }

  // ── 2. Focus session reminders: schedule blocks starting within 15 min ───
  const { data: blocks, error: blocksError } = await admin
    .from('schedule_blocks')
    .select('id, user_id, starts_at, quests(title, status)')
    .gt('starts_at', now.toISOString())
    .lte('starts_at', new Date(now.getTime() + 15 * MIN).toISOString());
  if (blocksError) errors.push(`schedule_blocks query: ${blocksError.message}`);
  found.focus = blocks?.length ?? 0;

  for (const b of blocks ?? []) {
    const raw = b.quests as
      | { title: string; status: string | null }
      | { title: string; status: string | null }[]
      | null;
    const quest = Array.isArray(raw) ? raw[0] : raw;
    if (quest?.status === 'completed') {
      bump('quest-completed');
      continue; // don't remind for a finished quest
    }

    const mins = Math.max(1, Math.round((new Date(b.starts_at).getTime() - now.getTime()) / MIN));
    const r = await send(
      b.user_id,
      'focus_reminder',
      {
        title: 'Focus session starting soon',
        body: quest?.title
          ? `"${quest.title}" starts in about ${mins} min.`
          : `Your study block starts in about ${mins} min.`,
        url: '/dashboard',
      },
      { dedupKey: `block:${b.id}` } // one reminder per block
    );
    results.focus += r.sent;
  }

  // ── 3. Burnout & wellness nudges (reuses your existing risk evaluation) ──
  if (now.getUTCHours() === WELLNESS_UTC_HOUR) {
    const { data: profileRows, error: profilesError } = await admin.from('profiles').select('id');
    if (profilesError) errors.push(`profiles query: ${profilesError.message}`);
    const thisWeek = weekKey(now);

    for (const row of profileRows ?? []) {
      const userId = row.id as string;
      found.wellnessUsersChecked++;

      const { flags, error } = await computeRiskFlags(admin, userId);
      if (error) {
        console.error('Risk evaluation failed:', userId, error);
        errors.push(`risk evaluation: ${error}`);
        continue;
      }

      // inactivity is left for the later "come back" feature
      for (const flag of flags.filter((f) => f.type !== 'inactivity')) {
        const title = FLAG_TITLES[flag.type] ?? 'Workload check-in';

        // same rule as evaluateAndNotifyRisk: skip if an unread one with this title exists
        const { data: existing } = await admin
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'risk_flag')
          .eq('read', false)
          .eq('title', title)
          .limit(1);
        if (existing && existing.length > 0) {
          bump('unread-exists');
          continue;
        }

        const r = await send(
          userId,
          'risk_flag',
          { title, body: flag.message, url: '/dashboard' },
          { dedupKey: `wellness:${flag.type}:${thisWeek}` } // at most one per flag type per week
        );
        if (r.skipped !== 'duplicate') {
          results.wellness += r.sent;
          break; // at most one wellness push per user per run
        }
      }
    }
  }

  return NextResponse.json({ ...results, found, skipped, errors });
}