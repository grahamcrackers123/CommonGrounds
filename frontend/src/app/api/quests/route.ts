import { createClient } from '@/lib/supabase/server'
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

  const { data, error } = await supabase
    .from('quests')
    .insert({
      user_id: user.id,
      title: body.title,
      subject: body.subject ?? null,
      description: body.description ?? null,
      deadline: body.deadline ?? null,
      priority: body.priority ?? 'medium',
      estimated_duration: body.estimated_duration ?? null,
      checklist: body.checklist ?? [],
      status: body.status ?? 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ quest: data }, { status: 201 })
}