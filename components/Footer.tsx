'use client'
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto border-t border-border bg-surface/50">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          <span className="font-display font-bold text-sm text-light tracking-wide">
            MachineLog
          </span>
        </div>
        <p className="text-xs text-muted">
          © {year} ระบบบันทึกการยืม-คืนเครื่อง — สงวนลิขสิทธิ์
        </p>
        <p className="text-xs text-muted font-mono">v1.0.0</p>
      </div>
    </footer>
  )
}
