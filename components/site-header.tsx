import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'
import { Music } from 'lucide-react'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">
            Remix Songs
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
