import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/session-provider'
import { ConditionalNavigation } from '@/components/layout/conditional-navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Chat Platform',
  description: 'A full-stack AI-powered chat platform with project-based context',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ConditionalNavigation />
          <main className="flex-1">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
