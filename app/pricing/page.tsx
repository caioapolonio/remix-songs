import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { Check } from 'lucide-react'

const freeFeatures = [
  'Upload and play audio files',
  'Download as WAV',
  'Adjust speed and pitch',
  'Apply reverb effect',
  'Dark/light theme',
]

const proFeatures = [
  'Everything in Free',
  'Download as MP3',
  'Bass boost effect',
  'Create multiple remixes at once',
  'Save custom presets',
  'Trim remix start and end',
]

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />

      {/* Pricing */}
      <section className="flex flex-1 flex-col items-center px-4 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start for free, upgrade when you need more.
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
          {/* Free Plan */}
          <div className="flex flex-col rounded-lg border bg-background p-8 shadow-sm">
            <h2 className="text-xl font-bold">Free</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Perfect for trying out remixes.
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-8" asChild>
              <Link href="/app">Get started</Link>
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="flex flex-col rounded-lg border-2 border-primary bg-background p-8 shadow-sm">
            <h2 className="text-xl font-bold">Pro</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$5</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              For serious remixers who want it all.
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="mt-8" asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Remix Songs. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
