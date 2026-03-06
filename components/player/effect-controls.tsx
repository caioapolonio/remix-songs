'use client'

import { useState } from 'react'
import { useAudioPlayer } from '@/hooks/use-audio-player'
import { useSubscription } from '@/components/subscription-provider'
import { UpgradeModal } from '@/components/upgrade-modal'
import { Slider } from '@/components/ui/slider'
import { PresetSelector } from '@/components/player/preset-selector'
import { Gauge, Sparkles, AudioLines, Lock } from 'lucide-react'

interface EffectControlsProps {
  player: ReturnType<typeof useAudioPlayer>
}

export function EffectControls({ player }: EffectControlsProps) {
  const { state, setSpeed, setReverb, setBass } = player
  const { isPro } = useSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  return (
    <div className="flex flex-col gap-8 p-6 bg-card rounded-lg border shadow-sm w-full  mx-auto">
      <PresetSelector
        speed={state.speed}
        reverb={state.reverb}
        bass={state.bass}
        setSpeed={setSpeed}
        setReverb={setReverb}
        setBass={setBass}
      />

      {/* Speed Control */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            <label className="text-sm font-medium">Speed / Pitch</label>
          </div>
          <span className="text-sm text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded">
            {state.speed.toFixed(2)}x
          </span>
        </div>
        <Slider
          value={[state.speed]}
          min={0.5}
          max={1.5}
          step={0.01}
          onValueChange={([val]) => setSpeed(val)}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>0.5x (Slowed)</span>
          <span>1.0x</span>
          <span>1.5x (Nightcore)</span>
        </div>
      </div>

      {/* Reverb Control */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <label className="text-sm font-medium">Reverb</label>
          </div>
          <span className="text-sm text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded">
            {(state.reverb * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          value={[state.reverb]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={([val]) => setReverb(val)}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Dry</span>
          <span>Wet</span>
        </div>
      </div>

      {/* Bass Boost Control */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AudioLines className="w-5 h-5 text-orange-500" />
            <label className="text-sm font-medium">Bass Boost</label>
          </div>
          <span className="text-sm text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded">
            {state.bass.toFixed(1)} dB
          </span>
        </div>
        {isPro ? (
          <>
            <Slider
              value={[state.bass]}
              min={0}
              max={12}
              step={0.5}
              onValueChange={([val]) => setBass(val)}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>0 dB</span>
              <span>6</span>
              <span>12</span>
            </div>
          </>
        ) : (
          <div
            className="relative cursor-pointer"
            onClick={() => setUpgradeOpen(true)}
          >
            <Slider
              value={[0]}
              min={0}
              max={12}
              step={0.5}
              disabled
              className="py-2"
            />
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Pro</span>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  )
}
