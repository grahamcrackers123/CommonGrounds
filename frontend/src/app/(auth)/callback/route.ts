import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // not sure if san ireredirect after iclick yung confirmation link sa email
      // sa /setup sya tentatively
      return NextResponse.redirect(`${origin}/setup`)
    }
  }

  return NextResponse.redirect(`${origin}/access?error=confirmation_failed`)
}