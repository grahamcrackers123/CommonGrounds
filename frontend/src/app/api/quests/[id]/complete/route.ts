import { xp_per_level } from '@/components/petgrowth'
import { recordBehavioralEvent } from '@/lib/interventions/events'
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

  // fetched before completion so we have the notif title/reward and the pet's
  // pre-completion XP, letting us log exactly how much the pet gained
  const [{ data: questInfo }, { data: petBefore }] = await Promise.all([
    supabase
      .from('quests')
      .select('title, reward_coins')
      .eq('id', id)
      .single(),
    supabase
      .from('pets')
      .select('level, xp')
      .eq('owner_id', user.id)
      .maybeSingle(),
  ])

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
      _type: 'session_completed', // quest or focus session completed
      _title: 'Quest completed!',
      _body: `You earned ${questInfo.reward_coins} coins for "${questInfo.title}"`,
    })
  }

  let xpGained = 0
  if (petBefore && result.pet_level != null && result.pet_xp != null) {
    xpGained = (result.pet_level - petBefore.level) * xp_per_level + (result.pet_xp - petBefore.xp)
    if (xpGained < 0) xpGained = 0
  }

  if (questInfo && xpGained > 0) {
    await recordBehavioralEvent(user.id, 'pet_quest', {
      quest_id: id,
      title: questInfo.title,
      coins: questInfo.reward_coins ?? 0,
      xp_gained: xpGained,
      leveled_up: result.leveled_up ?? false,
    })
  }

  return NextResponse.json({
    quest: { id: result.quest_id, status: result.status, completed_at: result.completed_at },
    coins: result.new_coin_balance,
    // level/xp/leveledUp are null/false if the user has no active pet yet
    pet: { level: result.pet_level, xp: result.pet_xp, leveledUp: result.leveled_up },
  })
}