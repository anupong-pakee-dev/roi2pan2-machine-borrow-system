'use client'
import { useEffect, useState } from 'react'

/**
 * Floating Theme Toggle (Dark / Light).
 * Persists choice in localStorage. Sets <html class="theme-light|theme-dark">.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('ml-theme') as 'dark' | 'light' | null) || 'dark'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  function applyTheme(t: 'dark' | 'light') {
    const html = document.documentElement
    html.classList.remove('theme-dark', 'theme-light')
    html.classList.add(`theme-${t}`)
  }

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('ml-theme', next)
    applyTheme(next)
  }

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-lg bg-surface border border-border text-light
                 flex items-center justify-center
                 hover:bg-panel transition-colors"
      title={theme === 'dark' ? 'สลับเป็น Light' : 'สลับเป็น Dark'}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
