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
    <div className="flex flex-col h-dvh bg-background text-foreground overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left Sidebar: File List */}
        <FileList player={player} />

        {/* Right Area: Waveform & Controls */}
        <div className="flex flex-col bg-zinc-50 dark:bg-zinc-950/50 shrink-0 md:flex-1 md:relative md:overflow-y-auto">
          {/* Header / Top Bar (desktop only) */}
          <div className="hidden md:flex p-6 border-b bg-background/50 backdrop-blur sticky top-0 z-10 flex-row items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Studio</h1>

            <ModeToggle />
          </div>

          {/* Content */}
          <div className="p-4 md:flex-1 md:p-8 flex flex-col items-center gap-4 md:gap-8 max-w-5xl mx-auto w-full">
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
