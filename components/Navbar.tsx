'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import ClockBadge from './ClockBadge'
import ThemeToggle from './ThemeToggle'

interface NavbarProps {
  username: string
  role: string
}

export default function Navbar({ username, role }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard',  label: 'หน้าจอเครื่อง', icon: IconGrid,   match: (p: string) => p === '/dashboard' },
    { href: '/form',       label: 'ยืม',           icon: IconPlay,   match: (p: string) => p === '/form'      },
    ...(role === 'admin'
      ? [{ href: '/admin/dashboard', label: 'แอดมิน', icon: IconShield, match: (p: string) => p.startsWith('/admin') }]
      : []),
    ...(role === 'staff'
      ? [{ href: '/staff/dashboard', label: 'รายงาน', icon: IconReport, match: (p: string) => p.startsWith('/staff') }]
      : []),
  ]

  return (
    <>
      {/* Top bar — desktop + mobile head */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-[10px] bg-accent text-accent-ink
                            grid place-items-center font-mono font-bold text-base tracking-tight">
              M
            </div>
            <span className="font-display font-semibold text-light text-lg tracking-tight hidden sm:inline">
              MachineLog
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-6 flex-1">
            {navItems.map(n => {
              const active = n.match(pathname || '')
              const Icon = n.icon
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={[
                    'flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium transition-all',
                    active
                      ? 'bg-light text-ink'
                      : 'text-muted hover:text-light hover:bg-panel',
                  ].join(' ')}
                >
                  <Icon />
                  {n.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <ClockBadge />
            <div className="hidden sm:flex flex-col items-end leading-tight pl-3 border-l border-border ml-1">
              <span className="text-xs font-semibold text-light">{username}</span>
              <span className={`text-[10px] ${role === 'admin' ? 'text-accent' : 'text-muted'}`}>{role}</span>
            </div>
            <div
              className={[
                'w-9 h-9 rounded-full grid place-items-center font-semibold text-sm',
                role === 'admin' ? 'bg-accent text-accent-ink' : 'bg-panel text-light',
              ].join(' ')}
            >
              {username[0]?.toUpperCase() || '?'}
            </div>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-9 h-9 rounded-lg bg-surface border border-border text-muted
                         hover:text-accent2 hover:border-accent2 transition-colors
                         flex items-center justify-center"
              title="ออกจากระบบ"
            >
              {loggingOut ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <IconLogout />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                      bg-surface/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map(n => {
            const active = n.match(pathname || '')
            const Icon = n.icon
            return (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  'flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg',
                  active ? 'text-accent' : 'text-muted',
                ].join(' ')}
              >
                <Icon />
                <span className="text-[10px] font-medium">{n.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      <div className="md:hidden h-14" aria-hidden />
    </>
  )
}

/* Icons */
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3"  y="3"  width="7" height="7" rx="1.5"/>
      <rect x="14" y="3"  width="7" height="7" rx="1.5"/>
      <rect x="3"  y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
}
function IconPlay() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 6v6c0 4.5 3.5 8.5 8 10 4.5-1.5 8-5.5 8-10V6l-8-4Z" />
    </svg>
  )
}
function IconReport() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
