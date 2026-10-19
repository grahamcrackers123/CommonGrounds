import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordMissedSessions } from '@/lib/interventions/missed-sessions'
import { computeRiskFlags, evaluateAndNotifyRisk } from '@/lib/interventions/notify'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Record blocks that passed without a focus session so the
  // missed_sessions flag sees them in this same evaluation.
  const missed = await recordMissedSessions(supabase, user.id)
  if (missed.error) {
    console.error('Missed session scan failed:', missed.error)
  }

  const { flags, error } = await computeRiskFlags(supabase, user.id)
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  // don't block the response on notification writes
  await evaluateAndNotifyRisk(supabase, user.id)

  let summary = 'No workload risk indicators were detected.'
  if (flags.length > 0) {
    summary =
      'Some workload patterns may need attention based on recent study activity and scheduling.'
  }

  return NextResponse.json({ flags, summary })
}