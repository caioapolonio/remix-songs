'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Music, SlidersHorizontal, Crown } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/app', label: 'Remix', icon: Music },
  { href: '/app/presets', label: 'Presets', icon: SlidersHorizontal },
  { href: '/app/pro', label: 'Pro', icon: Crown },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col items-center border-r bg-background py-4 px-3 shrink-0">
      <nav className="flex flex-col items-center gap-3 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/app' ? pathname === '/app' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground hover:border-foreground border border-transparent w-full',
                isActive && 'text-foreground bg-accent',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
      <ModeToggle />
    </aside>
  )
}
