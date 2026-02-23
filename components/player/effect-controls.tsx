import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Slider } from "@/components/ui/slider";
import { Gauge, Sparkles } from "lucide-react";

interface EffectControlsProps {
  player: ReturnType<typeof useAudioPlayer>;
}

export function EffectControls({ player }: EffectControlsProps) {
  const { state, setSpeed, setReverb } = player;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-card rounded-lg border shadow-sm w-full max-w-4xl mx-auto">
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
    </div>
  );
}
