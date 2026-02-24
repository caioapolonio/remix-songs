import { useRef } from 'react'
import { useAudioPlayer } from '@/hooks/use-audio-player'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Music, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileListProps {
  player: ReturnType<typeof useAudioPlayer>
}

export function FileList({ player }: FileListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      player.addFiles(Array.from(e.target.files))
    }
    // Reset value so the same file can be selected again
    if (e.target) {
      e.target.value = ''
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col h-full bg-card border-r w-full md:w-80 ">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Music className="w-5 h-5" />
          Library
        </h2>
        <Button
          size="icon"
          variant="outline"
          onClick={handleBrowseClick}
          title="Add Files"
        >
          <Plus className="w-1 h-1" />
        </Button>
      </div>

      <input
        type="file"
        multiple
        accept="audio/*, .mp3, .wav, .ogg, .flac, .m4a, .aac, .wma, .alac, .aiff"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="flex w-full h-full p-4">
        {player.files.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center h-full p-6 text-center text-muted-foreground border-dashed border-2 rounded-lg bg-accent/20">
            <p className="mb-4 text-sm font-medium">No files in library</p>
            <Button variant="secondary" onClick={handleBrowseClick}>
              Browse Files
            </Button>
          </div>
        ) : (
          <div className="space-y-2 w-full ">
            {player.files.map((file) => {
              const isCurrent = file.id === player.currentFileId
              return (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center border-border justify-between p-3 rounded-md transition-all cursor-pointer group border overflow-hidden',
                    isCurrent
                      ? 'bg-primary/10 border-primary/20 shadow-sm'
                      : 'hover:bg-accent',
                  )}
                  onClick={() => player.playFile(file.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden  min-w-0">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                        isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isCurrent && player.state.isPlaying ? (
                        <div className="flex gap-0.5 items-end h-3">
                          <span className="w-0.5 h-3 bg-current animate-[pulse_1s_ease-in-out_infinite]" />
                          <span className="w-0.5 h-2 bg-current animate-[pulse_1.5s_ease-in-out_infinite]" />
                          <span className="w-0.5 h-3 bg-current animate-[pulse_0.8s_ease-in-out_infinite]" />
                        </div>
                      ) : (
                        <Music className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isCurrent && 'text-primary',
                        )}
                      >
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      player.removeFile(file.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
