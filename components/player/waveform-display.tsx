import { useEffect, useRef } from 'react'
import { useAudioPlayer } from '@/hooks/use-audio-player'
import { useSubscription } from '@/components/subscription-provider'
import { Scissors, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

interface WaveformDisplayProps {
  player: ReturnType<typeof useAudioPlayer>
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function styleRegionHandles(container: HTMLElement) {
  const handles = container.querySelectorAll<HTMLElement>('[data-resize]')
  handles.forEach((handle) => {
    handle.style.width = '10px'
    handle.style.borderRadius = '4px'
    handle.style.background = 'rgba(45, 212, 191, 0.7)'
    handle.style.border = 'none'
    handle.style.transition = 'background 150ms'

    handle.addEventListener('pointerenter', () => {
      handle.style.background = 'rgba(45, 212, 191, 1)'
    })
    handle.addEventListener('pointerleave', () => {
      handle.style.background = 'rgba(45, 212, 191, 0.7)'
    })
  })
}

export function WaveformDisplay({ player }: WaveformDisplayProps) {
  const { currentTime, duration, isCropping, cropStart, cropEnd } = player.state
  const { isPro } = useSubscription()
  const regionsRef = useRef<RegionsPlugin | null>(null)
  // Track whether the region update came from a user drag (skip re-syncing)
  const isDraggingRef = useRef(false)

  // Create/destroy regions plugin when isCropping toggles
  useEffect(() => {
    const ws = player.wavesurferRef.current
    if (!ws) return

    if (isCropping) {
      if (!regionsRef.current) {
        const regions = ws.registerPlugin(RegionsPlugin.create())
        regionsRef.current = regions

        regions.on(
          'region-updated',
          (region: { start: number; end: number }) => {
            isDraggingRef.current = true
            player.setCropRegion(region.start, region.end)
            // Reset after React state update flushes
            requestAnimationFrame(() => {
              isDraggingRef.current = false
            })
          },
        )
      }
    } else {
      if (regionsRef.current) {
        regionsRef.current.destroy()
        regionsRef.current = null
      }
    }
    // Only react to isCropping toggle, not cropStart/cropEnd
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCropping])

  // Add the initial region when crop starts (separate from plugin lifecycle)
  useEffect(() => {
    if (
      !isCropping ||
      !regionsRef.current ||
      cropStart == null ||
      cropEnd == null
    )
      return
    // Skip if this update came from a user drag
    if (isDraggingRef.current) return

    regionsRef.current.clearRegions()
    const region = regionsRef.current.addRegion({
      start: cropStart,
      end: cropEnd,
      color: 'rgba(45, 212, 191, 0.15)',
      drag: false,
      resize: true,
    })

    // Style the drag handles
    const regionEl = region.element
    if (regionEl) {
      regionEl.style.borderLeft = '2px solid rgba(45, 212, 191, 0.8)'
      regionEl.style.borderRight = '2px solid rgba(45, 212, 191, 0.8)'
      styleRegionHandles(regionEl)
    }
    // Only run on initial crop activation, not on every cropStart/cropEnd change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCropping])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (regionsRef.current) {
        regionsRef.current.destroy()
        regionsRef.current = null
      }
    }
  }, [])

  return (
    <div className="w-full md:flex-1 flex flex-col justify-center relative p-3 md:p-8 bg-black/5 rounded-lg border shadow-inner">
      <div ref={player.containerRef} className="w-full h-32" />

      {/* Time display: current time (left) and duration (right) */}
      {player.currentFileId && (
        <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
          <span className="font-mono">{formatTime(currentTime)}</span>
          <span className="font-mono">{formatTime(duration)}</span>
        </div>
      )}

      {/* Crop button */}
      {player.currentFileId && (
        <div className="flex items-center mt-3 px-1 self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={isPro ? player.toggleCrop : undefined}
            disabled={!isPro}
            className={`gap-1.5 ${isCropping ? 'border-teal-400 bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 hover:text-teal-300' : ''}`}
          >
            {isPro ? (
              <Scissors className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Crop
            {!isPro && (
              <span className="text-[10px] uppercase font-semibold text-amber-500">
                Pro
              </span>
            )}
          </Button>
          {isCropping && cropStart != null && cropEnd != null && (
            <span className="ml-2 text-xs text-muted-foreground font-mono">
              {formatTime(cropStart)} — {formatTime(cropEnd)}
            </span>
          )}
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
  )
}
