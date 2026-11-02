import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import {
  cookieOptionsForCurrentSession,
  isSessionRemembered,
  REMEMBER_ME_COOKIE,
} from './cookies'

export async function createClient() {
  const cookieStore = await cookies()
  const remember = isSessionRemembered(
    cookieStore.get(REMEMBER_ME_COOKIE)?.value
  )

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                cookieOptionsForCurrentSession(
                  options,
                  remember,
                  value
                )
              )
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
