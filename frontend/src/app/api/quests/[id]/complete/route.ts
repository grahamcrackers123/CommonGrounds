import { xp_per_level } from '@/components/petgrowth'
import { recordBehavioralEvent } from '@/lib/interventions/events'
import { applyEnergyDecay, ENERGY_MAX } from '@/lib/pet-energy'
import { QUEST_ENERGY_REWARD } from '@/lib/quest-rewards'
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
      .select('id, level, xp, pet_energy, updated_at')
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

  // Quests are a source of pet energy. Decay is applied first so the reward
  // stacks on the up-to-date value, then the gain is capped at ENERGY_MAX.
  let energyGained = 0
  if (petBefore?.id) {
    const currentEnergy = await applyEnergyDecay(supabase, petBefore)
    const nextEnergy = Math.min(currentEnergy + QUEST_ENERGY_REWARD, ENERGY_MAX)
    energyGained = nextEnergy - currentEnergy

    if (energyGained > 0) {
      await supabase
        .from('pets')
        .update({
          pet_energy: nextEnergy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', petBefore.id)
    }
  }

  let xpGained = 0
  if (petBefore && result.pet_level != null && result.pet_xp != null) {
    xpGained = (result.pet_level - petBefore.level) * xp_per_level + (result.pet_xp - petBefore.xp)
    if (xpGained < 0) xpGained = 0
  }

  const coinsGained = questInfo?.reward_coins ?? 0

  if (questInfo && (coinsGained > 0 || xpGained > 0 || energyGained > 0)) {
    await recordBehavioralEvent(user.id, 'pet_quest', {
      quest_id: id,
      title: questInfo.title,
      coins: coinsGained,
      xp_gained: xpGained,
      energy_gained: energyGained,
      leveled_up: result.leveled_up ?? false,
    })
  }

  if (questInfo) {
    const rewards: string[] = []
    if (coinsGained > 0) rewards.push(`${coinsGained} coins`)
    if (xpGained > 0) rewards.push(`${xpGained} XP`)
    if (energyGained > 0) rewards.push(`${energyGained} energy`)

    await supabase.rpc('create_notification', {
      _user_id: user.id,
      // The notifications.type check constraint does not allow
      // 'quest_completed', so quests reuse the session type and the
      // notifications page relabels them from the title.
      _type: 'session_completed',
      _title: 'Quest completed!',
      _body:
        rewards.length > 0
          ? `You earned ${rewards.join(', ')} for "${questInfo.title}"`
          : `You completed "${questInfo.title}"`,
    })
  }

  return NextResponse.json({
    quest: { id: result.quest_id, status: result.status, completed_at: result.completed_at },
    coins: result.new_coin_balance,
    xp: xpGained,
    energy: energyGained,
    // level/xp/leveledUp are null/false if the user has no active pet yet
    pet: { level: result.pet_level, xp: result.pet_xp, leveledUp: result.leveled_up },
  })
}