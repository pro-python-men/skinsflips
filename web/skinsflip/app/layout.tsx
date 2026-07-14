import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { AuthStateProvider } from "@/components/auth-context"

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  title: 'CS2 Skin Flipper - Track Your Trades',
  description: 'Track your CS2 skin flips, view Steam inventory and calculate ROI from trading skins',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
      },
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} font-sans antialiased`}>
        <AuthStateProvider>{children}</AuthStateProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
