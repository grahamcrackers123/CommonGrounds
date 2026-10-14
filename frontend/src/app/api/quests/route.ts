
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Student Coin rewards based on quest priority.
const REWARD_BY_PRIORITY = {
  low: 10,
  medium: 25,
  high: 50,
} as const

type QuestPriority = keyof typeof REWARD_BY_PRIORITY

function isQuestPriority(value: unknown): value is QuestPriority {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(REWARD_BY_PRIORITY, value)
  )
}

// GET /api/quests?status=pending&from=...&to=...
export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('quests')
    .select('*')
    .order('deadline', {
      ascending: true,
      nullsFirst: false,
    })

  if (status) {
    query = query.eq('status', status)
  }

  if (from) {
    query = query.gte('deadline', from)
  }

  if (to) {
    query = query.lte('deadline', to)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ quests: data })
}

// POST /api/quests
export async function POST(request: Request) {
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

  let body: Record<string, unknown>

  try {
    const parsedBody: unknown = await request.json()

    if (
      typeof parsedBody !== 'object' ||
      parsedBody === null ||
      Array.isArray(parsedBody)
    ) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    body = parsedBody as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (
    typeof body.title !== 'string' ||
    !body.title.trim()
  ) {
    return NextResponse.json(
      { error: 'A quest title is required' },
      { status: 400 }
    )
  }

  const priority = body.priority ?? 'medium'

  if (!isQuestPriority(priority)) {
    return NextResponse.json(
      { error: 'Priority must be low, medium, or high' },
      { status: 400 }
    )
  }

  // The server determines the reward; the client cannot set it.
  const rewardCoins = REWARD_BY_PRIORITY[priority]

  const { data, error } = await supabase
    .from('quests')
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      subject: body.subject ?? null,
      description: body.description ?? null,
      deadline: body.deadline ?? null,
      priority,
      reward_coins: rewardCoins,
      estimated_duration: body.estimated_duration ?? null,
      checklist: body.checklist ?? [],
      status: body.status ?? 'pending',
      reward_coins: clampRewardCoins(body.reward_coins),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { quest: data },
    { status: 201 }
  )
}