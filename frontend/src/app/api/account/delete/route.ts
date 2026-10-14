import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// POST /api/account/delete
// Permanently deletes the signed-in user: their rows in all app tables
// and their auth user record. Requires SUPABASE_SERVICE_ROLE_KEY in env.
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    )
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Delete child rows first (service role bypasses RLS).
  const tables: { table: string; column: string }[] = [
    { table: 'notifications', column: 'user_id' },
    { table: 'user_items', column: 'user_id' },
    { table: 'user_badges', column: 'user_id' },
    { table: 'quests', column: 'user_id' },
    { table: 'pets', column: 'owner_id' },
    { table: 'profiles', column: 'id' },
  ]

  for (const { table, column } of tables) {
    const { error } = await admin.from(table).delete().eq(column, user.id)
    if (error) {
      return NextResponse.json(
        { error: `Could not delete ${table}: ${error.message}` },
        { status: 500 }
      )
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}