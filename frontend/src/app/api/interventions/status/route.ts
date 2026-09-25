import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  detectMissedSessions,
  detectInactivity,
  detectOverdueQuests,
  detectHighScheduledWorkload,
  type BehavioralEvent,
  type QuestForRisk,
  type ScheduleBlockForRisk,
} from '@/lib/interventions/risk'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const [eventsResult, questsResult, blocksResult] =
    await Promise.all([
      supabase
        .from('behavioral_events')
        .select('type, occurred_at, metadata')
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false }),

      supabase
        .from('quests')
        .select('deadline, status')
        .eq('user_id', user.id)
        .neq('status', 'completed'),

      supabase
        .from('schedule_blocks')
        .select('starts_at, ends_at')
        .eq('user_id', user.id),
    ])

  if (eventsResult.error) {
    return NextResponse.json(
      { error: eventsResult.error.message },
      { status: 500 }
    )
  }

  if (questsResult.error) {
    return NextResponse.json(
      { error: questsResult.error.message },
      { status: 500 }
    )
  }

  if (blocksResult.error) {
    return NextResponse.json(
      { error: blocksResult.error.message },
      { status: 500 }
    )
  }

  const events = (eventsResult.data ?? []) as BehavioralEvent[]
  const quests = (questsResult.data ?? []) as QuestForRisk[]
  const blocks = (blocksResult.data ?? []) as ScheduleBlockForRisk[]

  const flags = [
    detectMissedSessions(events),
    detectInactivity(events),
    detectOverdueQuests(quests),
    ...detectHighScheduledWorkload(blocks),
  ].filter((flag): flag is NonNullable<typeof flag> => flag !== null)

  let summary = 'No workload risk indicators were detected.'

  if (flags.length > 0) {
    summary =
      'Some workload patterns may need attention based on recent study activity and scheduling.'
  }

  return NextResponse.json({
    flags,
    summary,
  })
}