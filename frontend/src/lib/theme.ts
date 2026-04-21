import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

export type Theme = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'revaport-theme'

/** Read the persisted theme choice. 'auto' if none/invalid/inaccessible. */
function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/** Apply the theme choice to <html data-theme="…">.
 *  'auto' clears the attribute so the system preference takes over. */
function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
}

/** Inject a stylesheet that disables every CSS transition + animation,
 *  then return a cleanup that restores them after the next paint.
 *
 *  Without this, the dozen-or-so `transition-colors` utilities scattered
 *  through tables, navlinks, segmented filters, etc. all interpolate
 *  between the old and new palette for ~150ms — visible as a "flash" of
 *  intermediate non-palette colors when the user toggles the theme.
 *  This is the same trick `next-themes` ships. */
function suppressTransitionsThisFrame(): void {
  if (typeof document === 'undefined') return
  const css = document.createElement('style')
  css.appendChild(
    document.createTextNode(
      '*,*::before,*::after{transition:none !important;animation-duration:0s !important;animation-delay:0s !important}',
    ),
  )
  document.head.appendChild(css)
  // Force a synchronous style recalc so the no-transition rule is in
  // effect *before* we change `data-theme`.
  void window.getComputedStyle(document.body).color
  // Remove on the next tick — by then the new palette has painted with
  // no transition, and subsequent interactions get their normal hover
  // transitions back.
  setTimeout(() => {
    if (css.parentNode) css.parentNode.removeChild(css)
  }, 0)
}

/* ------------------------------------------------------------------ */
/* Resolved theme — what the app is ACTUALLY rendering as right now.  */
/* Used by anything that can't read CSS custom properties (e.g.       */
/* Recharts, which takes hex strings as JS props).                    */
/* ------------------------------------------------------------------ */

function getResolvedTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light'
  const override = document.documentElement.getAttribute('data-theme')
  if (override === 'light' || override === 'dark') return override
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function subscribeResolvedTheme(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  // 1. Watch the override flipping on <html data-theme="…">
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  // 2. Watch the OS pref changing while we're on 'auto'
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', cb)
  return () => {
    obs.disconnect()
    mq.removeEventListener('change', cb)
  }
}

/** Subscribe to the resolved 'light' | 'dark' value. Re-renders when either
 *  the user toggles the override or the OS preference changes. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribeResolvedTheme,
    getResolvedTheme,
    () => 'light',
  )
}

/** React hook for the theme toggle. Returns the current choice + a setter. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readStored)

  // Keep <html> in sync if React hydration ran before our inline boot script
  // (e.g. in tests). In production the inline script in index.html already did this.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    suppressTransitionsThisFrame()
    applyTheme(t)
    setThemeState(t)
    try {
      if (t === 'auto') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* private mode / disabled — non-fatal */
    }
  }, [])

  return [theme, setTheme]
}
