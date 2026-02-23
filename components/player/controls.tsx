import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Repeat1, 
  Volume2, 
  VolumeX,
  Volume1,
  Gauge,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlsProps {
  player: ReturnType<typeof useAudioPlayer>;
}

export function Controls({ player }: ControlsProps) {
  const { 
    state, 
    togglePlay, 
    playNext, 
    playPrev, 
    toggleMute, 
    setVolume, 
    cycleLoopMode,
    currentFileId,
    setSpeed,
    setReverb
  } = player;

  const getLoopIcon = () => {
    switch (state.loopMode) {
      case 'one': return <Repeat1 className="w-4 h-4 text-primary" />;
      case 'all': return <Repeat className="w-4 h-4 text-primary" />;
      default: return <Repeat className="w-4 h-4 text-muted-foreground/50" />;
    }
  };

  const getVolumeIcon = () => {
    if (state.isMuted || state.volume === 0) return <VolumeX className="w-5 h-5" />;
    if (state.volume < 0.5) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full flex flex-col md:flex-row items-center md:px-6 justify-between shrink-0 z-50 md:h-20 transition-all duration-300">
      
      {/* Mobile: Effect Sliders (Top of the bar) */}
      <div className="md:hidden w-full px-6 pt-4 pb-2 space-y-4 bg-background/50 border-b">
        {/* Speed */}
        <div className="space-y-2">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Gauge className="w-3.5 h-3.5 text-primary" />
               <span className="text-xs font-medium">Speed</span>
             </div>
             <span className="text-xs text-muted-foreground font-mono bg-accent px-1.5 py-0.5 rounded">
               {state.speed.toFixed(2)}x
             </span>
           </div>
           <Slider
             value={[state.speed]}
             min={0.5}
             max={1.5}
             step={0.01}
             onValueChange={([val]) => setSpeed(val)}
             className="h-4"
           />
        </div>

        {/* Reverb */}
        <div className="space-y-2">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Sparkles className="w-3.5 h-3.5 text-purple-500" />
               <span className="text-xs font-medium">Reverb</span>
             </div>
             <span className="text-xs text-muted-foreground font-mono bg-accent px-1.5 py-0.5 rounded">
               {(state.reverb * 100).toFixed(0)}%
             </span>
           </div>
           <Slider
             value={[state.reverb]}
             min={0}
             max={1}
             step={0.01}
             onValueChange={([val]) => setReverb(val)}
             className="h-4"
           />
        </div>
      </div>

      {/* Playback Controls (Middle on Mobile, Left on Desktop) */}
      <div className="relative flex items-center gap-4 flex-1 justify-center md:justify-start w-full md:w-auto py-4 md:py-0 px-6">
        <div className="flex items-center gap-4 md:gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={playPrev}
                disabled={!currentFileId}
                className="hover:bg-accent/50"
            >
                <SkipBack className="w-5 h-5" />
            </Button>

            <Button 
                size="icon" 
                onClick={togglePlay}
                disabled={!currentFileId}
                className="h-12 w-12 md:h-10 md:w-10 rounded-full shadow-md"
            >
                {state.isPlaying ? (
                    <Pause className="w-6 h-6 md:w-5 md:h-5 fill-current" />
                ) : (
                    <Play className="w-6 h-6 md:w-5 md:h-5 fill-current ml-0.5" />
                )}
            </Button>

            <Button 
                variant="ghost" 
                size="icon" 
                onClick={playNext}
                disabled={!currentFileId}
                className="hover:bg-accent/50"
            >
                <SkipForward className="w-5 h-5" />
            </Button>
        </div>

        <div className="h-6 w-px bg-border mx-2 hidden md:block" />

        <Button 
            variant="ghost" 
            size="icon" 
            onClick={cycleLoopMode}
            title={`Loop Mode: ${state.loopMode}`}
            className={cn(
                "transition-colors absolute right-4 md:static",
                state.loopMode !== 'off' && "bg-primary/10 hover:bg-primary/20"
            )}
        >
            {getLoopIcon()}
        </Button>
      </div>

      {/* Mobile: Volume (Bottom, Full Width) */}
      <div className="md:hidden w-full bg-accent/20 px-6 py-3 border-t">
         <div className="flex items-center gap-3">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0"
                onClick={toggleMute}
            >
                {getVolumeIcon()}
            </Button>
            <Slider
                value={[state.isMuted ? 0 : state.volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([val]) => setVolume(val)}
                className="w-full"
            />
         </div>
      </div>

      {/* Desktop: Volume (Right) */}
      <div className="hidden md:flex items-center gap-3 w-48 justify-end">
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMute}
            className="hover:bg-accent/50"
        >
            {getVolumeIcon()}
        </Button>
        <Slider
            value={[state.isMuted ? 0 : state.volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([val]) => setVolume(val)}
            className="w-28"
        />
      </div>
    </div>
  );
}
