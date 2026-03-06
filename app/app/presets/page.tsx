'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSubscription } from '@/components/subscription-provider'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Lock,
  Plus,
  Trash2,
  Gauge,
  Sparkles,
  AudioLines,
  SlidersHorizontal,
  Loader2,
  Check,
} from 'lucide-react'

interface Preset {
  id: string
  name: string
  speed: number
  reverb: number
  bass: number
  created_at: string
}

const proFeatures = [
  'Save and reuse remix presets',
  'Download as MP3',
  'Bass boost effect',
  'Create multiple remixes at once',
  'Trim remix start and end',
  'Set custom default settings',
]

function Paywall({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="max-w-sm text-center space-y-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Presets are a Pro feature
          </h1>
          <p className="text-muted-foreground text-sm">
            Save your favorite remix settings and apply them instantly.
          </p>
        </div>
        <ul className="text-left space-y-2">
          {proFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
        {isAuthenticated ? (
          <Button className="w-full" onClick={handleUpgrade} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Upgrade to Pro
          </Button>
        ) : (
          <Button className="w-full" asChild>
            <Link href="/login?redirectTo=/app/presets">Login</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function CreatePresetDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (preset: Preset) => void
}) {
  const [name, setName] = useState('')
  const [speed, setSpeed] = useState(1)
  const [reverb, setReverb] = useState(0)
  const [bass, setBass] = useState(0)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setSpeed(1)
    setReverb(0)
    setBass(0)
  }

  const handleSave = async () => {
    if (!name.trim() || name.trim().length > 32) return
    setSaving(true)
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), speed, reverb, bass }),
      })
      if (!res.ok) throw new Error()
      const preset = await res.json()
      onCreated(preset)
      reset()
      onOpenChange(false)
    } catch {
      // keep dialog open on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Preset</DialogTitle>
          <DialogDescription>
            Configure your remix settings and save them as a preset.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              maxLength={32}
              placeholder="e.g. Nightcore, Slowed + Reverb"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <span className="text-xs text-muted-foreground text-right">
              {name.length}/32
            </span>
          </div>

          {/* Speed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Speed / Pitch</label>
              </div>
              <span className="text-sm text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded">
                {speed.toFixed(2)}x
              </span>
            </div>
            <Slider
              value={[speed]}
              min={0.5}
              max={1.5}
              step={0.01}
              onValueChange={([val]) => setSpeed(val)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5x</span>
              <span>1.0x</span>
              <span>1.5x</span>
            </div>
          </div>

          {/* Reverb */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <label className="text-sm font-medium">Reverb</label>
              </div>
              <span className="text-sm text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded">
                {(reverb * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[reverb]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([val]) => setReverb(val)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Dry</span>
              <span>Wet</span>
            </div>
          </div>

          {/* Bass */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AudioLines className="w-4 h-4 text-orange-500" />
                <label className="text-sm font-medium">Bass Boost</label>
              </div>
              <span className="text-sm text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded">
                {bass.toFixed(1)} dB
              </span>
            </div>
            <Slider
              value={[bass]}
              min={0}
              max={12}
              step={0.5}
              onValueChange={([val]) => setBass(val)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 dB</span>
              <span>6</span>
              <span>12</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PresetsPage() {
  const { isPro, isAuthenticated } = useSubscription()
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchPresets = useCallback(async () => {
    try {
      const res = await fetch('/api/presets')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPresets(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPro) fetchPresets()
    else setLoading(false)
  }, [isPro, fetchPresets])

  const handleCreated = (preset: Preset) => {
    setPresets((prev) => [...prev, preset])
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setPresets((prev) => prev.filter((p) => p.id !== id))
    try {
      const res = await fetch('/api/presets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        fetchPresets()
      }
    } catch {
      fetchPresets()
    } finally {
      setDeletingId(null)
    }
  }

  if (!isPro) {
    return <Paywall isAuthenticated={isAuthenticated} />
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Presets</h1>
          <span className="text-sm text-muted-foreground">{presets.length}/10</span>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={presets.length >= 10}>
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {presets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-3">
            <SlidersHorizontal className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No presets yet</p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create your first preset
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium truncate">{preset.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(preset.id)}
                  disabled={deletingId === preset.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" />
                  {Number(preset.speed).toFixed(2)}x
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {(Number(preset.reverb) * 100).toFixed(0)}%
                </span>
                <span className="flex items-center gap-1">
                  <AudioLines className="w-3.5 h-3.5" />
                  {Number(preset.bass).toFixed(1)} dB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreatePresetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}
