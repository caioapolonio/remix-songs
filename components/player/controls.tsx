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
    files,
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
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full flex flex-col shrink-0 z-50 transition-all duration-300">
      <div className="flex flex-col md:flex-row items-center md:px-6 justify-between md:h-20 w-full">

      {/* Playback Controls (Left on Desktop) */}
      <div className="relative flex items-center gap-4 flex-1 justify-center md:justify-start w-full md:w-auto py-4 md:py-0 px-6">
        <div className="flex items-center gap-4 md:gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={playPrev}
                disabled={!currentFileId || files.length <= 1}
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
                disabled={!currentFileId || files.length <= 1}
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
    </div>
  );
}
