import { useAudioPlayer } from "@/hooks/use-audio-player";

interface WaveformDisplayProps {
  player: ReturnType<typeof useAudioPlayer>;
}

export function WaveformDisplay({ player }: WaveformDisplayProps) {
  return (
    <div className="w-full flex-1 flex flex-col justify-center relative p-8 bg-black/5 rounded-lg border shadow-inner">
      <div 
        ref={player.containerRef} 
        className="w-full h-32" 
      />
      
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
