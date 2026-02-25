'use client'
import { useAudioPlayer } from '@/hooks/use-audio-player'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  ChevronDown,
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
  Sparkles,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobilePlayerSheetProps {
  player: ReturnType<typeof useAudioPlayer>
  isOpen: boolean
  onClose: () => void
  onWaveformMount: (el: HTMLDivElement | null) => void
}

export function MobilePlayerSheet({
  player,
  isOpen,
  onClose,
  onWaveformMount,
}: MobilePlayerSheetProps) {
  const {
    state,
    currentFileId,
    files,
    togglePlay,
    playNext,
    playPrev,
    setSpeed,
    setReverb,
    setVolume,
    toggleMute,
    cycleLoopMode,
    downloadWithEffects,
  } = player

  const currentFile = files.find((f) => f.id === currentFileId)

  const getVolumeIcon = () => {
    if (state.isMuted || state.volume === 0)
      return <VolumeX className="w-5 h-5" />
    if (state.volume < 0.5) return <Volume1 className="w-5 h-5" />
    return <Volume2 className="w-5 h-5" />
  }

  return (
    <div
      className={cn(
        'md:hidden fixed inset-0 z-50 bg-background flex flex-col',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      {/* Header: close button + track name */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-accent"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold truncate px-2 flex-1 text-center">
          {currentFile?.name ?? 'No track'}
        </span>
        <div className="w-9" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-7 px-4 py-4">
        {/* Waveform slot — portal target */}
        <div ref={onWaveformMount} className="w-full" />

        {/* Speed slider */}
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
          />
        </div>

        {/* Reverb slider */}
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
          />
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-6">
          <div className="w-9 h-9"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={playPrev}
            disabled={!currentFileId || files.length <= 1}
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            onClick={togglePlay}
            disabled={!currentFileId}
            className="h-14 w-14 rounded-full shadow-md"
          >
            {state.isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            disabled={!currentFileId || files.length <= 1}
          >
            <SkipForward className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleLoopMode}
            className={cn(
              'shrink-0',
              state.loopMode !== 'off' && 'bg-primary/10',
            )}
          >
            {state.loopMode === 'one' ? (
              <Repeat1 className="w-4 h-4 text-primary" />
            ) : (
              <Repeat
                className={cn(
                  'w-4 h-4',
                  state.loopMode === 'all'
                    ? 'text-primary'
                    : 'text-muted-foreground/50',
                )}
              />
            )}
          </Button>
        </div>

        {/* Loop + Volume */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
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
            className="flex-1"
          />
        </div>

        {/* Download */}
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!currentFileId || state.isDownloading}
            onClick={downloadWithEffects}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {state.isDownloading ? 'Rendering...' : 'Download Remix'}
          </Button>
        </div>
      </div>
    </div>
  )
}
