import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-ink">
      {/* Hero aside */}
      <aside className="relative overflow-hidden bg-light text-ink px-8 md:px-12 py-10 md:py-16
                        flex flex-col justify-between min-h-[260px]">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full
                        bg-accent opacity-30 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3 font-semibold text-xl">
          <span className="w-11 h-11 rounded-xl bg-accent text-accent-ink
                           grid place-items-center font-mono font-bold tracking-tight">
            M
          </span>
          MachineLog
        </div>

        <h1 className="relative z-10 text-4xl md:text-6xl font-semibold leading-[0.95]
                       tracking-tight max-w-[16ch]">
          ระบบยืม-คืน<br />
          <span className="text-accent">เครื่องร้านครูหนึ่ง</span><br />
          เร็วเหมือน POS
        </h1>

        <div className="relative z-10 flex justify-between items-end
                        text-[11px] uppercase tracking-[0.12em] text-ink/60">
          <span>ROI 2 PAN 2</span>
          <span className="font-mono">v0.0.1</span>
        </div>
      </aside>

      {/* Form column */}
      <main className="grid place-items-center px-6 md:px-12 py-10 md:py-16">
        <div className="w-full max-w-[380px] space-y-6">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">เข้าสู่ระบบ</h2>
            <p className="text-muted text-sm mt-1.5">ใช้สำหรับพนักงานหน้าร้านเท่านั้น</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  )
}
