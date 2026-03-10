'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSubscription } from '@/components/subscription-provider'
import { Button } from '@/components/ui/button'
import { Check, Crown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const proFeatures = [
  'Everything in Free',
  'Download as MP3',
  'Bass boost effect',
  'Create multiple remixes at once',
  'Save custom presets',
  'Trim remix start and end',
]

export default function ProPage() {
  const { isAuthenticated, isPro } = useSubscription()
  const [loading, setLoading] = useState(false)

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

  const handlePortal = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      const { url } = await res.json()
      if (!res.ok || !url) {
        toast.error('Failed to open billing portal. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = url
    } catch {
      toast.error('Failed to open billing portal. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <Crown className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            {(isPro && "You're already Pro!") || 'Pro'}
          </h1>
          <p className="text-muted-foreground">
            For serious remixers who want it all.
          </p>
        </div>

        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">$5</span>
          <span className="text-muted-foreground">/month</span>
        </div>

        <ul className="space-y-3">
          {proFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>

        {isPro ? (
          <div className="space-y-3 text-center">
            <Button
              className="w-full"
              variant="outline"
              onClick={handlePortal}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Manage subscription
            </Button>
          </div>
        ) : isAuthenticated ? (
          <Button className="w-full" onClick={handleUpgrade} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Upgrade to Pro
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button className="flex-1" asChild>
              <Link href="/login?redirectTo=/app/pro">Login</Link>
            </Button>
            <Button className="flex-1" variant="outline" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
