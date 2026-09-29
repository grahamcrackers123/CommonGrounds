import { recordBehavioralEvent } from '@/lib/interventions/events'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { itemId, slot } = await req.json()
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!itemId || !['accessory', 'outfit'].includes(slot)) {
    return NextResponse.json({ error: 'Invalid item or slot' }, { status: 400 })
  }

  const [{ data: owned, error: ownedError }, { data: item }] = await Promise.all([
    supabase
      .from('user_items')
      .select('item_key')
      .eq('user_id', user.id)
      .eq('item_key', itemId)
      .maybeSingle(),
    supabase
      .from('reward_items')
      .select('name')
      .eq('id', itemId)
      .maybeSingle(),
  ])

  if (ownedError) return NextResponse.json({ error: ownedError.message }, { status: 500 })
  if (!owned) return NextResponse.json({ error: 'Item not owned' }, { status: 403 })

  const column = slot === 'accessory' ? 'equipped_accessory' : 'equipped_outfit'

  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('equipped_accessory, equipped_outfit')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (petError) return NextResponse.json({ error: petError.message }, { status: 500 })
  if (!pet) return NextResponse.json({ error: 'No pet found' }, { status: 404 })

  const currentlyEquipped = slot === 'accessory' ? pet.equipped_accessory : pet.equipped_outfit
  const nextValue = currentlyEquipped === itemId ? null : itemId

  const { data, error } = await supabase
    .from('pets')
    .update({ [column]: nextValue })
    .eq('owner_id', user.id)
    .select('equipped_accessory, equipped_outfit')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordBehavioralEvent(user.id, 'pet_equipped', {
    slot,
    item_key: itemId,
    item_name: item?.name ?? itemId,
    equipped: nextValue !== null,
  })

  return NextResponse.json({
    equipped: {
      accessory: data.equipped_accessory,
      outfit: data.equipped_outfit,
    },
  })
}