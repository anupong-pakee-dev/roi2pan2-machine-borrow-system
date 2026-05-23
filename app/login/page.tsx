import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LoginForm from './LoginForm'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-accent2/5 blur-3xl" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-6">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="2" y="2" width="10" height="10" rx="2" fill="#f5a623" />
                <rect x="16" y="2" width="10" height="10" rx="2" fill="#f5a623" opacity="0.5" />
                <rect x="2" y="16" width="10" height="10" rx="2" fill="#f5a623" opacity="0.5" />
                <rect x="16" y="16" width="10" height="10" rx="2" fill="#f5a623" />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-bold text-light mb-2 tracking-tight">
              MachineLog
            </h1>
            <p className="text-muted text-sm">ระบบบันทึกการยืม-คืนเครื่อง</p>
          </div>

          {/* Form card */}
          <div className="card shadow-2xl shadow-black/50">
            <h2 className="font-display text-xl font-semibold text-light mb-6">
              เข้าสู่ระบบ
            </h2>
            <LoginForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
