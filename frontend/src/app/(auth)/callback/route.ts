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
      // return NextResponse.redirect(`${origin}/setup`)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: profile } = await supabase
        .from('profiles')
        .select('setup_complete')
        .eq('id', user?.id ?? '')
        .maybeSingle();

      return NextResponse.redirect(
        new URL(profile?.setup_complete ? '/dashboard' : '/setup', origin)
      )
    }
  }

  return NextResponse.redirect(`${origin}/access?error=confirmation_failed`)
}