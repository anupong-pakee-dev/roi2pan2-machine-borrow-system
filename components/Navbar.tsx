'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

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

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-ink/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1" fill="#0f1117" />
                <rect x="9" y="1" width="6" height="6" rx="1" fill="#0f1117" />
                <rect x="1" y="9" width="6" height="6" rx="1" fill="#0f1117" />
                <rect x="9" y="9" width="6" height="6" rx="1" fill="#0f1117" />
              </svg>
            </div>
            <span className="font-display font-bold text-light text-base tracking-tight group-hover:text-accent transition-colors">
              MachineLog
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" active={pathname === '/dashboard'}>Dashboard</NavLink>
            <NavLink href="/form" active={pathname === '/form'}>บันทึกใหม่</NavLink>
            {role === 'admin' && (
              <NavLink href="/admin/dashboard" active={pathname?.startsWith('/admin')}>Admin</NavLink>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-light leading-tight">{username}</span>
              <span className={`text-[10px] ${role === 'admin' ? 'text-accent' : 'text-blue-400'}`}>{role}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn-danger text-xs py-1.5 px-3"
            >
              {loggingOut ? '...' : 'ออก'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-14 px-2">
          <MobileNavLink href="/dashboard" active={pathname === '/dashboard'} icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }>Dashboard</MobileNavLink>

          <MobileNavLink href="/form" active={pathname === '/form'} icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 8v8M8 12h8" />
            </svg>
          }>บันทึก</MobileNavLink>

          {role === 'admin' && (
            <MobileNavLink href="/admin/dashboard" active={pathname?.startsWith('/admin') ?? false} icon={
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" d="M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 18a7 7 0 0 1 14 0" />
              </svg>
            }>Admin</MobileNavLink>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex flex-col items-center gap-1 px-3 py-2 text-accent2 active:opacity-70 transition-opacity"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            <span className="text-[10px]">{loggingOut ? '...' : 'ออก'}</span>
          </button>
        </div>
      </nav>

      {/* Bottom nav spacer on mobile */}
      <div className="md:hidden h-14" aria-hidden />
    </>
  )
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm rounded-lg transition-all duration-150 ${
        active ? 'text-accent bg-accent/10' : 'text-muted hover:text-light hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, children, active, icon }: {
  href: string; children: React.ReactNode; active: boolean; icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
        active ? 'text-accent' : 'text-muted'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{children}</span>
    </Link>
  )
}
