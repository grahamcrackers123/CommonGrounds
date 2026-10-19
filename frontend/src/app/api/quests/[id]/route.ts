
import { isQuestPriority, rewardCoinsForPriority } from '@/lib/quest-rewards'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/quests/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  const allowedFields = [
    'title',
    'subject',
    'description',
    'deadline',
    'priority',
    'estimated_duration',
    'checklist',
    'status',
  ]

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  // Keep Student Coin rewards synchronized with priority.
  if ('priority' in body) {
    const priority = body.priority

    if (!isQuestPriority(priority)) {
      return NextResponse.json(
        { error: 'Invalid quest priority' },
        { status: 400 }
      )
    }

    updates.reward_coins = rewardCoinsForPriority(priority)
  }

  const { data, error } = await supabase
    .from('quests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // RLS prevents access to quests the user does not own.
    return NextResponse.json(
      { error: 'Quest not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ quest: data })
}

// DELETE /api/quests/:id
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { data, error } = await supabase
    .from('quests')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Quest not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ quest: data })
}

// POST /api/quests/:id
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { data, error } = await supabase.rpc(
    'complete_quest',
    { p_quest_id: id }
  )

  if (error) {
    const message = error.message.toLowerCase()

    if (message.includes('already completed')) {
      return NextResponse.json(
        { error: 'This quest has already been completed.' },
        { status: 409 }
      )
    }

    if (message.includes('quest not found')) {
      return NextResponse.json(
        { error: 'Quest not found.' },
        { status: 404 }
      )
    }

    console.error('Quest completion failed:', error)

    return NextResponse.json(
      { error: 'Failed to complete quest.' },
      { status: 500 }
    )
  }

  const result = Array.isArray(data) ? data[0] : data

  if (!result) {
    return NextResponse.json(
      { error: 'No completion result was returned.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    quest: {
      id: result.quest_id,
      status: result.status,
      completed_at: result.completed_at,
    },
    student_coins: result.new_coin_balance,
    pet: {
      level: result.pet_level,
      xp: result.pet_xp,
      leveledUp: result.leveled_up,
    },
  })
}
