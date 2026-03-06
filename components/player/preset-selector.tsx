'use client'

import { useEffect, useState } from 'react'
import { useSubscription } from '@/components/subscription-provider'
import { cn } from '@/lib/utils'
import { SlidersHorizontal } from 'lucide-react'

interface Preset {
  id: string
  name: string
  speed: number
  reverb: number
  bass: number
}

interface PresetSelectorProps {
  speed: number
  reverb: number
  bass: number
  setSpeed: (v: number) => void
  setReverb: (v: number) => void
  setBass: (v: number) => void
}

export function PresetSelector({
  speed,
  reverb,
  bass,
  setSpeed,
  setReverb,
  setBass,
}: PresetSelectorProps) {
  const { isPro } = useSubscription()
  const [presets, setPresets] = useState<Preset[]>([])

  useEffect(() => {
    if (!isPro) return
    fetch('/api/presets')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPresets(data))
      .catch(() => {})
  }, [isPro])

  if (!isPro || presets.length === 0) return null

  const isActive = (p: Preset) =>
    Number(p.speed) === speed &&
    Number(p.reverb) === reverb &&
    Number(p.bass) === bass

  const apply = (p: Preset) => {
    setSpeed(Number(p.speed))
    setReverb(Number(p.reverb))
    setBass(Number(p.bass))
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => apply(preset)}
          className={cn(
            'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
            isActive(preset)
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent text-accent-foreground hover:bg-accent/80',
          )}
        >
          {preset.name}
        </button>
      ))}
    </div>
  )
}
