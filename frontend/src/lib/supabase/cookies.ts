import type { CookieOptions } from '@supabase/ssr'

export const REMEMBER_ME_COOKIE = 'cg-remember-me'
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30

export function isSessionRemembered(value: string | null | undefined) {
  return value !== '0'
}

export function persistSessionPreference(remember: boolean) {
  if (typeof document === 'undefined') return

  const secure =
    window.location.protocol === 'https:' ? '; Secure' : ''

  document.cookie = remember
    ? `${REMEMBER_ME_COOKIE}=1; Path=/; Max-Age=${REMEMBER_ME_MAX_AGE}; SameSite=Lax${secure}`
    : `${REMEMBER_ME_COOKIE}=0; Path=/; Max-Age=${REMEMBER_ME_MAX_AGE}; SameSite=Lax${secure}`
}

export function readBrowserCookies() {
  if (typeof document === 'undefined') return []

  return document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf('=')

      if (separator === -1) {
        return { name: entry, value: '' }
      }

      const value = entry.slice(separator + 1)

      try {
        return {
          name: entry.slice(0, separator),
          value: decodeURIComponent(value),
        }
      } catch {
        return {
          name: entry.slice(0, separator),
          value,
        }
      }
    })
}

export function readRememberMePreference() {
  return readBrowserCookies().find(
    (cookie) => cookie.name === REMEMBER_ME_COOKIE
  )?.value
}

export function cookieOptionsForCurrentSession(
  options: CookieOptions,
  remember: boolean,
  value: string
): CookieOptions {
  if (remember || !value) {
    return options
  }

  const sessionOptions = { ...options }
  delete sessionOptions.maxAge
  delete sessionOptions.expires
  return sessionOptions
}

export function writeBrowserCookie(
  name: string,
  value: string,
  options: CookieOptions
) {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.path) parts.push(`Path=${options.path}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`)
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }
  if (options.secure) parts.push('Secure')
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.sameSite) {
    const sameSite =
      options.sameSite === true
        ? 'Strict'
        : options.sameSite[0].toUpperCase() +
          options.sameSite.slice(1)
    parts.push(`SameSite=${sameSite}`)
  }

  document.cookie = parts.join('; ')
}
