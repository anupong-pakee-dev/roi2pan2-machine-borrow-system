'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label">Username</label>
        <input
          className="input-field"
          type="text"
          placeholder="เช่น admin"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label">Password</label>
        <input
          className="input-field"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                        bg-accent2/10 border border-accent2/30 text-accent2 text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !username || !password}
        className="btn-primary btn-lg w-full"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            กำลังเข้าระบบ…
          </>
        ) : 'เข้าสู่ระบบ'}
      </button>
    </form>
  )
}
