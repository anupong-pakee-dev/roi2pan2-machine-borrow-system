import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MachineLog — ระบบบันทึกการยืม-คืนเครื่อง',
  description: 'POS-style internet café machine borrow / return tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="theme-dark">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
