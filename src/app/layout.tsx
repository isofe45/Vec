import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'CineVault',
  description: 'Movies & Series Streaming Starter',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="min-h-screen">
          <Navbar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
