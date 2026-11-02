
import { priorityForCourseworkType, rewardCoinsForPriority } from '@/lib/quest-rewards'
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
    'estimated_duration',
    'checklist',
    'status',
  ]

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if ('scheduled_date' in body) {
    const deadlinePassed =
      typeof body.deadline === 'string' &&
      new Date(body.deadline).getTime() < Date.now()

    updates.scheduled_date =
      deadlinePassed &&
      typeof body.scheduled_date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.scheduled_date)
        ? body.scheduled_date
        : null
  }

  if ('coursework_type' in body) {
    const courseworkType =
      typeof body.coursework_type === 'string' &&
      body.coursework_type.trim()
        ? body.coursework_type.trim()
        : null

    updates.coursework_type = courseworkType

    // Keep priority and Student Coin rewards derived from the coursework type.
    if (courseworkType) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('coursework_priorities')
        .eq('id', user.id)
        .maybeSingle()

      const priority = priorityForCourseworkType(
        courseworkType,
        profile?.coursework_priorities
      )

      updates.priority = priority
      updates.reward_coins = rewardCoinsForPriority(priority)
    }
  }

  let { data, error } = await supabase
    .from('quests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  // Remove this fallback once the new quest columns are migrated.
  if (error?.code === 'PGRST204') {
    const fallbackUpdates: Record<string, unknown> = {
      ...updates,
    }

    let removedColumn = false

    for (const column of ['coursework_type', 'scheduled_date']) {
      if (error.message.includes(column)) {
        delete fallbackUpdates[column]
        removedColumn = true
      }
    }

    if (removedColumn) {
      const fallback = await supabase
        .from('quests')
        .update(fallbackUpdates)
        .eq('id', id)
        .select()
        .single()

      data = fallback.data
      error = fallback.error
    }
  }

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
