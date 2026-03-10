'use client'

import { useEffect, useState } from 'react'
import { useSubscription } from '@/components/subscription-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Preset {
  id: string
  name: string
  speed: number
  reverb: number
  bass: number
  volume: number
}

interface PresetSelectorProps {
  speed: number
  reverb: number
  bass: number
  volume: number
  setSpeed: (v: number) => void
  setReverb: (v: number) => void
  setBass: (v: number) => void
  setVolume: (v: number) => void
}

export function PresetSelector({
  speed,
  reverb,
  bass,
  volume,
  setSpeed,
  setReverb,
  setBass,
  setVolume,
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

  const findActive = () => {
    const eps = 0.001
    const near = (a: number, b: number) => Math.abs(a - b) < eps
    const match = presets.find(
      (p) =>
        near(Number(p.speed), speed) &&
        near(Number(p.reverb), reverb) &&
        near(Number(p.bass), bass) &&
        near(Number(p.volume), volume),
    )
    return match?.id ?? ''
  }

  const apply = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    setSpeed(Number(preset.speed))
    setReverb(Number(preset.reverb))
    setBass(Number(preset.bass))
    setVolume(Number(preset.volume))
  }

  return (
    <Select value={findActive()} onValueChange={apply}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a preset" />
      </SelectTrigger>
      <SelectContent>
        {presets.map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
