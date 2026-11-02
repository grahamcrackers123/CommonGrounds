import { createBrowserClient } from '@supabase/ssr'

import {
  cookieOptionsForCurrentSession,
  isSessionRemembered,
  readBrowserCookies,
  readRememberMePreference,
  writeBrowserCookie,
} from './cookies'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return readBrowserCookies()
        },
        setAll(cookiesToSet) {
          const remember = isSessionRemembered(
            readRememberMePreference()
          )

          cookiesToSet.forEach(({ name, value, options }) => {
            writeBrowserCookie(
              name,
              value,
              cookieOptionsForCurrentSession(
                options,
                remember,
                value
              )
            )
          })
        },
      },
    }
  )
}
