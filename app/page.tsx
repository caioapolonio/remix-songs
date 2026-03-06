import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import {
  Zap,
  Download,
  Sliders,
  Scissors,
  Layers,
  Settings,
} from 'lucide-react'

const features = [
  {
    icon: Layers,
    title: 'Batch Remixing',
    description: 'Create multiple remixes at once with different settings.',
  },
  {
    icon: Sliders,
    title: 'Custom Presets',
    description:
      'Save and reuse your favorite speed, reverb, and bass settings.',
  },
  {
    icon: Download,
    title: 'MP3 Download',
    description: 'Download your remixes as MP3. WAV is available for free.',
  },
  {
    icon: Zap,
    title: 'Bass Boost',
    description: 'Add punchy bass to your remixes with a low-shelf EQ filter.',
  },
  {
    icon: Scissors,
    title: 'Trim & Cut',
    description: 'Trim the start and end of your remix before exporting.',
  },
  {
    icon: Settings,
    title: 'Default Settings',
    description: 'Set your preferred speed, reverb, and volume as defaults.',
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            Remix any song.
            <br />
            <span className="text-muted-foreground">
              Slowed, reverb, and more.
            </span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Upload your music, apply effects in real-time, and download your
            remixes. No software to install — everything runs in your browser.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="lg" asChild>
            <Link href="/app">Start remixing — it&apos;s free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t bg-zinc-50 dark:bg-zinc-950/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Upgrade to Pro
            </h2>
            <p className="mt-2 text-muted-foreground">
              Unlock powerful features for $5/month.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-background p-6 shadow-sm"
              >
                <feature.icon className="mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-1 font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
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
