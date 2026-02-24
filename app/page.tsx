'use client'

import { useAudioPlayer } from '@/hooks/use-audio-player'
import { FileList } from '@/components/player/file-list'
import { WaveformDisplay } from '@/components/player/waveform-display'
import { EffectControls } from '@/components/player/effect-controls'
import { Controls } from '@/components/player/controls'
import { ModeToggle } from '@/components/mode-toggle'

export default function Home() {
  const player = useAudioPlayer()

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: File List */}
        <FileList player={player} />

        {/* Right Area: Waveform & Controls */}
        <div className="flex-1 flex flex-col relative overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50">
          {/* Header / Top Bar (Optional, keeps layout clean) */}
          <div className="p-6 border-b bg-background/50 backdrop-blur sticky top-0 z-10 flex flex-row items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Studio</h1>

            <ModeToggle />
          </div>

          {/* Content */}
          <div className="flex-1 p-8 flex flex-col items-center gap-8 max-w-5xl mx-auto w-full">
            {/* Waveform Visualization */}
            <WaveformDisplay player={player} />

            {/* Effect Controls */}
            <div className="w-full hidden md:block">
              <EffectControls player={player} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Player Controls */}
      <Controls player={player} />
    </div>
  )
}
