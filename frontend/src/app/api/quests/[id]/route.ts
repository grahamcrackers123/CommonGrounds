import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/quests/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Only pass through fields were provided

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
    if (field in body) updates[field] = body[field]
  }

  if ('priority' in body) {
    const rewardByPriority = {
      low: 10,
      medium: 25,
      high: 50,
    } as const

    const priority = body.priority

    if (
      typeof priority !== 'string' ||
      !Object.prototype.hasOwnProperty.call(rewardByPriority, priority)
    ) {
      return NextResponse.json(
        { error: 'Invalid quest priority' },
        { status: 400 }
      )
    }

    updates.reward_coins =
      rewardByPriority[priority as keyof typeof rewardByPriority]
  }

  // Keep the reward synchronized with the quest's priority.
  if ('priority' in body) {
    const rewardByPriority = {
      low: 10,
      medium: 25,
      high: 50,
    } as const

    const priority = body.priority

    if (
      typeof priority !== 'string' ||
      !(priority in rewardByPriority)
    ) {
      return NextResponse.json(
        { error: 'Invalid quest priority' },
        { status: 400 }
      )
    }

    updates.reward_coins =
      rewardByPriority[priority as keyof typeof rewardByPriority]
  }

  const { data, error } = await supabase
    .from('quests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // RLS filters out rows you don't own
    // don't leak whether the quest exists but belongs to someone else
    return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
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
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('quests')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
  }

  return NextResponse.json({ quest: data })
}