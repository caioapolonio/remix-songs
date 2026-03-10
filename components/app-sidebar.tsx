'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Music, SlidersHorizontal, Crown, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { useSubscription } from '@/components/subscription-provider'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const navItems = [
  { href: '/app', label: 'Remix', icon: Music },
  { href: '/app/presets', label: 'Presets', icon: SlidersHorizontal },
  { href: '/app/pro', label: 'Pro', icon: Crown },
]

function SidebarContent({
  layout,
  onNavigate,
}: {
  layout: 'desktop' | 'mobile'
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { isAuthenticated } = useSubscription()

  const handleSignOut = async () => {
    await fetch('/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  const isDesktop = layout === 'desktop'

  return (
    <>
      <nav
        className={cn(
          'flex gap-3 flex-1',
          isDesktop ? 'flex-col items-center' : 'flex-col',
        )}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/app' ? pathname === '/app' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground hover:border-foreground border border-transparent',
                isDesktop ? 'flex-col w-full' : 'flex-row gap-3 py-3',
                isActive && 'text-foreground bg-accent',
              )}
            >
              <Icon className="h-5 w-5" />
              <span
                className={cn(
                  'font-medium',
                  isDesktop ? 'text-[10px]' : 'text-sm',
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
      <div
        className={cn(
          'flex gap-3',
          isDesktop ? 'flex-col items-center' : 'flex-col',
        )}
      >
        {isAuthenticated && (
          <Button
            variant="link"
            onClick={() => {
              onNavigate?.()
              handleSignOut()
            }}
            className={cn(
              'h-auto gap-1 text-muted-foreground hover:text-destructive',
              isDesktop
                ? 'flex-col w-full px-3 py-2'
                : 'flex-row gap-3 px-3 py-3',
            )}
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
            <span
              className={cn(
                'font-medium',
                isDesktop ? 'text-[10px]' : 'text-sm',
              )}
            >
              Logout
            </span>
          </Button>
        )}
        <ModeToggle />
      </div>
    </>
  )
}

export function AppSidebar() {
  return (
    <aside className="hidden md:flex flex-col items-center border-r bg-background py-4 px-3 shrink-0">
      <SidebarContent layout="desktop" />
    </aside>
  )
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 flex flex-col p-4">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <SidebarContent
          layout="mobile"
          onNavigate={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
