import { useAudioPlayer } from "@/hooks/use-audio-player";

interface WaveformDisplayProps {
  player: ReturnType<typeof useAudioPlayer>;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function WaveformDisplay({ player }: WaveformDisplayProps) {
  const { currentTime, duration } = player.state;

  return (
    <div className="w-full md:flex-1 flex flex-col justify-center relative p-4 md:p-8 bg-black/5 rounded-lg border shadow-inner">
      <div
        ref={player.containerRef}
        className="w-full h-32"
      />
      
      {/* Time display: current time (left) and duration (right) */}
      {player.currentFileId && (
        <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
          <span className="font-mono">{formatTime(currentTime)}</span>
          <span className="font-mono">{formatTime(duration)}</span>
        </div>
      )}
      
      {!player.currentFileId && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
          <span className="bg-background/80 px-4 py-2 rounded-full shadow-sm border">
            No track selected
          </span>
        </div>
      )}
    </div>
  );
}
