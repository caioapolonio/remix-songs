'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAudioPlayer } from '@/hooks/use-audio-player'
import { useMediaQuery } from '@/hooks/use-media-query'
import { FileList } from '@/components/player/file-list'
import { WaveformDisplay } from '@/components/player/waveform-display'
import { EffectControls } from '@/components/player/effect-controls'
import { Controls } from '@/components/player/controls'
import { MobilePlayerSheet } from '@/components/player/mobile-player-sheet'
import { ModeToggle } from '@/components/mode-toggle'
import { ChevronUp } from 'lucide-react'

export default function Home() {
  const player = useAudioPlayer()
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  const [desktopMount, setDesktopMount] = useState<HTMLDivElement | null>(null)
  const [mobileMount, setMobileMount] = useState<HTMLDivElement | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const activeMount = isMobile ? mobileMount : desktopMount

  // Auto-open sheet when a file is selected for the first time
  const prevFileIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (player.currentFileId && prevFileIdRef.current !== player.currentFileId) {
      // This is intentional: we sync UI state when external state changes
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMobileSheetOpen(true)
    }
    prevFileIdRef.current = player.currentFileId
  }, [player.currentFileId])

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* FileList: full screen on mobile, sidebar on desktop */}
        <FileList player={player} />

        {/* Right Area: desktop only */}
        <div className="hidden md:flex flex-col bg-zinc-50 dark:bg-zinc-950/50 flex-1 relative overflow-y-auto">
          {/* Header desktop */}
          <div className="flex p-6 border-b bg-background/50 backdrop-blur sticky top-0 z-10 flex-row items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Studio</h1>
            <ModeToggle />
          </div>
          <div className="p-4 md:flex-1 md:p-8 flex flex-col items-center gap-4 md:gap-8 max-w-5xl mx-auto w-full">
            <div ref={setDesktopMount} className="w-full" />
            <EffectControls player={player} />
          </div>
        </div>
      </div>

      {/* Controls bar: desktop only */}
      <div className="hidden md:block">
        <Controls player={player} />
      </div>

      {/* Mobile: Mini-bar (visible when sheet is closed and a file is loaded) */}
      {player.currentFileId && !isMobileSheetOpen && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-4 flex items-center justify-between cursor-pointer"
          onClick={() => setIsMobileSheetOpen(true)}
        >
          <span className="text-sm font-medium truncate">
            {player.files.find((f) => f.id === player.currentFileId)?.name ??
              ''}
          </span>
          <ChevronUp className="w-5 h-5 shrink-0 text-muted-foreground" />
        </div>
      )}

      {/* Mobile: Full-height player sheet */}
      <MobilePlayerSheet
        player={player}
        isOpen={isMobileSheetOpen}
        onClose={() => setIsMobileSheetOpen(false)}
        onWaveformMount={setMobileMount}
      />

      {/* Portal: WaveformDisplay mounted once, teleported to active slot */}
      {activeMount && createPortal(<WaveformDisplay player={player} />, activeMount)}
    </div>
  )
}
