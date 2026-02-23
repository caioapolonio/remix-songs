'use client'

import { useAudioPlayer } from '@/hooks/use-audio-player'
import { FileList } from '@/components/player/file-list'
import { WaveformDisplay } from '@/components/player/waveform-display'
import { EffectControls } from '@/components/player/effect-controls'
import { Controls } from '@/components/player/controls'
import { Button } from '@/components/ui/button'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'

export default function Home() {
  const player = useAudioPlayer()
  const { addFiles, currentFileId } = player

  // Main area dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: addFiles,
    accept: { 'audio/*': [] },
    noClick: true,
  })

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: File List */}
        <FileList player={player} />

        {/* Right Area: Waveform & Controls */}
        <div
          {...getRootProps()}
          className="flex-1 flex flex-col relative overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50"
        >
          <input {...getInputProps()} />

          {/* Drag Overlay */}
          {isDragActive && (
            <div className="absolute inset-0 z-50 bg-background/80 flex flex-col items-center justify-center backdrop-blur-sm border-4 border-primary border-dashed m-4 rounded-xl">
              <Upload className="w-16 h-16 text-primary mb-4 animate-bounce" />
              <p className="text-2xl font-bold text-primary">
                Drop audio file to load
              </p>
            </div>
          )}

          {/* Header / Top Bar (Optional, keeps layout clean) */}
          <div className="p-6 border-b bg-background/50 backdrop-blur sticky top-0 z-10">
            <h1 className="text-2xl font-bold tracking-tight">Studio</h1>
            <p className="text-muted-foreground">Slowed + Reverb Generator</p>
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
