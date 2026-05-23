import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MachineLog — ระบบบันทึกการใช้เครื่อง',
  description: 'ระบบบันทึกการยืม-คืนเครื่อง',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  )
}
