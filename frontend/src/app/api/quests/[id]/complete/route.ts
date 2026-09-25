import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  // fetched before completion so we have the notif title/reward
  const { data: questInfo } = await supabase
    .from('quests')
    .select('title, reward_coins')
    .eq('id', id)
    .single()

  const { data, error } = await supabase.rpc('complete_quest', { p_quest_id: id })

  if (error) {
    const status =
      error.message === 'quest not found' ? 404 :
      error.message === 'quest already completed' ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  const result = data?.[0]

  if (questInfo) {
    await supabase.rpc('create_notification', {
      _user_id: user.id,
      _type: 'session_completed',
      _title: 'Quest completed!',
      _body: `You earned ${questInfo.reward_coins} coins for "${questInfo.title}"`,
    })
  }

  return NextResponse.json({
    quest: { id: result.quest_id, status: result.status, completed_at: result.completed_at },
    coins: result.new_coin_balance,
    // level/xp/leveledUp are null/false if the user has no active pet yet
    pet: { level: result.pet_level, xp: result.pet_xp, leveledUp: result.leveled_up },
  })
}