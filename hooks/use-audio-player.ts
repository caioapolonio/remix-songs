import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import * as Tone from 'tone';

export type LoopMode = 'off' | 'all' | 'one';

export interface AudioFile {
  id: string;
  file: File;
  name: string;
  url: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  reverb: number; // 0 to 1 (wet/dry)
  volume: number; // 0 to 1
  isMuted: boolean;
  loopMode: LoopMode;
}

export function useAudioPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [files, setFiles] = useState<AudioFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    reverb: 0,
    volume: 1,
    isMuted: false,
    loopMode: 'off',
  });

  // Refs for state access inside callbacks
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);
  
  const currentFileIdRef = useRef(currentFileId);
  useEffect(() => { currentFileIdRef.current = currentFileId; }, [currentFileId]);

  // Actions
  const playFile = useCallback((id: string) => {
    const fileObj = filesRef.current.find(f => f.id === id);
    if (!fileObj || !wavesurferRef.current) return;

    setCurrentFileId(id);
    wavesurferRef.current.load(fileObj.url);
    
    wavesurferRef.current.once('ready', () => {
        wavesurferRef.current?.play();
    });
  }, []);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#a855f7',
      progressColor: '#7e22ce',
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 2,
      height: 128,
      normalize: true,
      backend: 'MediaElement',
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setState(prev => ({ ...prev, duration: ws.getDuration() }));
      setupAudioChain(ws);
    });

    ws.on('audioprocess', (time) => {
      setState(prev => ({ ...prev, currentTime: time }));
    });

    ws.on('play', () => setState(prev => ({ ...prev, isPlaying: true })));
    ws.on('pause', () => setState(prev => ({ ...prev, isPlaying: false })));
    
    ws.on('finish', () => {
      const { loopMode } = stateRef.current;
      const currentId = currentFileIdRef.current;
      const fileList = filesRef.current;
      
      if (!currentId) return;

      if (loopMode === 'one') {
        ws.play();
      } else if (loopMode === 'all') {
        const currentIndex = fileList.findIndex(f => f.id === currentId);
        const nextIndex = (currentIndex + 1) % fileList.length;
        playFile(fileList[nextIndex].id);
      } else {
        const currentIndex = fileList.findIndex(f => f.id === currentId);
        if (currentIndex < fileList.length - 1) {
          playFile(fileList[currentIndex + 1].id);
        } else {
            setState(prev => ({ ...prev, isPlaying: false }));
        }
      }
    });

    return () => {
      ws.destroy();
      reverbRef.current?.dispose();
      // sourceNodeRef.current is managed by Tone context usually, but we can disconnect
      try { sourceNodeRef.current?.disconnect(); } catch {}
    };
  }, [playFile]);

  // Setup Audio Chain
  const setupAudioChain = async (ws: WaveSurfer) => {
    if (sourceNodeRef.current) return;

    try {
      const mediaElement = ws.getMediaElement();
      if (!mediaElement) return;

      // Start Tone context
      if (Tone.context.state !== 'running') {
        // We can't always await this if not in user gesture, but play() will trigger it
        await Tone.start(); 
      }
      
      // Create Reverb
      const reverb = new Tone.Reverb({
        decay: 4,
        wet: 0,
      }).toDestination();
      reverbRef.current = reverb;

      // Create Source
      const source = Tone.context.createMediaElementSource(mediaElement);
      sourceNodeRef.current = source;
      
      // Connect Native Source -> Tone Reverb
      Tone.connect(source, reverb);
      
    } catch (error) {
      console.error("Error setting up audio chain:", error);
    }
  };

  // Watchers
  useEffect(() => {
    if (!wavesurferRef.current) return;
    try {
        wavesurferRef.current.setPlaybackRate(state.speed, false); 
    } catch (e) {
        console.error("Error setting playback rate", e);
    }
  }, [state.speed]);

  useEffect(() => {
    if (reverbRef.current) {
        reverbRef.current.wet.value = state.reverb;
    }
  }, [state.reverb]);

  useEffect(() => {
    if (wavesurferRef.current) {
        wavesurferRef.current.setVolume(state.isMuted ? 0 : state.volume);
    }
  }, [state.volume, state.isMuted]);

  // --- Public API ---
  const addFiles = useCallback((newFiles: File[]) => {
    const audioFiles = newFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    setFiles(prev => [...prev, ...audioFiles]);

    if (!currentFileIdRef.current && audioFiles.length > 0) {
      playFile(audioFiles[0].id);
    }
  }, [playFile]);

  const togglePlay = useCallback(async () => {
    if (!wavesurferRef.current) return;
    if (Tone.context.state !== 'running') {
        await Tone.context.resume();
    }
    wavesurferRef.current.playPause();
  }, []);

  const playNext = useCallback(() => {
    const currentIndex = filesRef.current.findIndex(f => f.id === currentFileIdRef.current);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % filesRef.current.length;
    playFile(filesRef.current[nextIndex].id);
  }, [playFile]);

  const playPrev = useCallback(() => {
    const currentIndex = filesRef.current.findIndex(f => f.id === currentFileIdRef.current);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + filesRef.current.length) % filesRef.current.length;
    playFile(filesRef.current[prevIndex].id);
  }, [playFile]);

  const setSpeed = (speed: number) => setState(prev => ({ ...prev, speed }));
  const setReverb = (reverb: number) => setState(prev => ({ ...prev, reverb }));
  const setVolume = (volume: number) => setState(prev => ({ ...prev, volume }));
  const toggleMute = () => setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  const cycleLoopMode = () => setState(prev => {
    const modes: LoopMode[] = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(prev.loopMode) + 1) % modes.length;
    return { ...prev, loopMode: modes[nextIndex] };
  });
  const removeFile = (id: string) => {
      setFiles(prev => prev.filter(f => f.id !== id));
      if (currentFileId === id) {
          wavesurferRef.current?.stop();
          setCurrentFileId(null);
      }
  };

  return {
    containerRef,
    state,
    files,
    currentFileId,
    addFiles,
    playFile,
    removeFile,
    togglePlay,
    playNext,
    playPrev,
    setSpeed,
    setReverb,
    setVolume,
    toggleMute,
    cycleLoopMode,
  };
}
