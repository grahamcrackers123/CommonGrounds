import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// POST /api/account/delete
// Permanently deletes the signed-in user: their rows in all app tables,
// their uploaded material files, and their auth user record.
// Requires SUPABASE_SERVICE_ROLE_KEY in env.
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

  // Delete child rows first (service role bypasses RLS). Failures are
  // logged but do not abort the deletion: the goal is to remove the
  // account itself, and any leftover rows are unreachable afterwards.
  const tables: { table: string; column: string }[] = [
    { table: 'material_chunks', column: 'user_id' },
    { table: 'materials', column: 'user_id' },
    { table: 'recovery_events', column: 'user_id' },
    { table: 'intervention_prompts', column: 'user_id' },
    { table: 'behavioral_events', column: 'user_id' },
    { table: 'focus_sessions', column: 'user_id' },
    { table: 'schedule_blocks', column: 'user_id' },
    { table: 'user_streaks', column: 'user_id' },
    { table: 'chat_messages', column: 'user_id' },
    { table: 'room_participants', column: 'user_id' },
    { table: 'rooms', column: 'owner_id' },
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
      console.error(`Account deletion: could not clear ${table}:`, error.message)
    }
  }

  const { error: friendshipsError } = await admin
    .from('friendships')
    .delete()
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

  if (friendshipsError) {
    console.error('Account deletion: could not clear friendships:', friendshipsError.message)
  }

  // Remove the user's uploaded material files from storage.
  try {
    const { data: files, error: listError } = await admin.storage
      .from('materials')
      .list(user.id, { limit: 1000 })

    if (listError) {
      console.error('Account deletion: could not list materials:', listError.message)
    } else if (files && files.length > 0) {
      const paths = files.map((file) => `${user.id}/${file.name}`)
      const { error: removeError } = await admin.storage.from('materials').remove(paths)

      if (removeError) {
        console.error('Account deletion: could not remove materials:', removeError.message)
      }
    }
  } catch (storageError) {
    console.error('Account deletion: storage cleanup failed:', storageError)
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
