import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { itemId } = await req.json()
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('purchase_reward_item', { p_item_id: itemId })

  if (error) {
    const status =
      error.message === 'insufficient balance' ? 400 :
      error.message === 'already owned' ? 409 :
      error.message === 'item not found' ? 404 :

      // pet coin/gem to be done
        // 'pet coin purchases not yet implemented' ? 501 

      500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ coins: data?.[0]?.new_coin_balance ?? null })
}