import { createClient } from '@/lib/supabase/server'
import { priorityForCourseworkType, rewardCoinsForPriority } from '@/lib/quest-rewards'
import { NextResponse } from 'next/server'

// GET /api/quests?status=pending&...
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('quests')
    .select('*')
    .order('deadline', { ascending: true, nullsFirst: false })

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('deadline', from)
  if (to) query = query.lte('deadline', to)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ quests: data })
}

// POST /api/quests
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const courseworkType =
    typeof body.coursework_type === 'string' &&
    body.coursework_type.trim()
      ? body.coursework_type.trim()
      : null

  const { data: profile } = await supabase
    .from('profiles')
    .select('coursework_priorities')
    .eq('id', user.id)
    .maybeSingle()

  const priority = priorityForCourseworkType(
    courseworkType,
    profile?.coursework_priorities
  )

  const insertPayload = {
    user_id: user.id,
    title: body.title,
    subject: body.subject ?? null,
    description: body.description ?? null,
    coursework_type: courseworkType,
    deadline: body.deadline ?? null,
    priority,
    estimated_duration: body.estimated_duration ?? null,
    checklist: body.checklist ?? [],
    status: body.status ?? 'pending',
    reward_coins: rewardCoinsForPriority(priority),
  }

  let { data, error } = await supabase
    .from('quests')
    .insert(insertPayload)
    .select()
    .single()

  // Remove this fallback once the coursework_type column is migrated.
  if (
    error?.code === 'PGRST204' &&
    error.message.includes('coursework_type')
  ) {
    const fallbackPayload: Record<string, unknown> = {
      ...insertPayload,
    }

    delete fallbackPayload.coursework_type

    const fallback = await supabase
      .from('quests')
      .insert(fallbackPayload)
      .select()
      .single()

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ quest: data }, { status: 201 })
}