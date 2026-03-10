import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Remix Songs - Free Online Audio Remixing Tool',
  description:
    'Create slowed, reverb, nightcore, and bass-boosted remixes of your songs. Free browser-based audio editor with real-time effects. No software needed.',
  keywords: [
    'remix',
    'audio',
    'music editor',
    'slowed',
    'reverb',
    'nightcore',
    'bass boost',
    'online',
    'free',
  ],
  openGraph: {
    title: 'Remix Songs - Online Audio Remixing Made Easy',
    description:
      'Apply slowed+reverb, nightcore, bass boost, and more effects to your music instantly. No software needed.',
    siteName: 'Remix Songs',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Remix Songs - Free Online Audio Remixing',
    description:
      'Create slowed, reverb, nightcore remixes online. No software needed.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
