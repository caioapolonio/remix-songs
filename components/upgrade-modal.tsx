'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSubscription } from '@/components/subscription-provider'

const proFeatures = [
  'Everything in Free',
  'Download as MP3',
  'Bass boost effect',
  'Create multiple remixes at once',
  'Save custom presets',
  'Trim remix start and end',
]

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const { isAuthenticated } = useSubscription()

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const { url } = await res.json()
      if (!res.ok || !url) {
        toast.error('Failed to start checkout. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = url
    } catch {
      toast.error('Failed to start checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Pro</DialogTitle>
          <DialogDescription>
            For serious remixers who want it all.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-4xl font-bold">$5</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <ul className="mt-4 space-y-3">
          {proFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
        {isAuthenticated ? (
          <Button className="mt-6 w-full" onClick={handleUpgrade} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Upgrade to Pro
          </Button>
        ) : (
          <div className="mt-6 flex gap-3">
            <Button className="flex-1" asChild>
              <Link href="/signup">Create account</Link>
            </Button>
            <Button className="flex-1" variant="outline" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
