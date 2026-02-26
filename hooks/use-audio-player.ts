import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import * as Tone from 'tone';
import { v4 as uuidv4 } from 'uuid';
import { Mp3Encoder } from '@breezystack/lamejs';

export type LoopMode = 'off' | 'all' | 'one';

function encodeWAV(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels
  const sr = buffer.sampleRate
  const len = buffer.length
  const dataSize = len * numCh * 2       // 16-bit PCM
  const ab = new ArrayBuffer(44 + dataSize)
  const view = new DataView(ab)
  const ws = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE')
  ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, numCh, true); view.setUint32(24, sr, true)
  view.setUint32(28, sr * numCh * 2, true); view.setUint16(32, numCh * 2, true); view.setUint16(34, 16, true)
  ws(36, 'data'); view.setUint32(40, dataSize, true)
  let off = 44
  for (let i = 0; i < len; i++)
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2
    }
  return new Blob([ab], { type: 'audio/wav' })
}

function encodeMP3(buffer: AudioBuffer, kbps: number = 192): Blob {
  const numCh = buffer.numberOfChannels
  const sr = buffer.sampleRate
  const len = buffer.length

  // Convert Float32 samples to Int16
  const convertToInt16 = (float32: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16
  }

  const left = convertToInt16(buffer.getChannelData(0))
  const right = numCh > 1 ? convertToInt16(buffer.getChannelData(1)) : left

  const encoder = new Mp3Encoder(numCh, sr, kbps)
  const mp3Data: Uint8Array[] = []

  // Process in chunks of 1152 samples (MP3 frame size)
  const sampleBlockSize = 1152
  for (let i = 0; i < len; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize)
    const rightChunk = right.subarray(i, i + sampleBlockSize)
    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk)
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf))
    }
  }

  // Flush remaining data
  const mp3End = encoder.flush()
  if (mp3End.length > 0) {
    mp3Data.push(new Uint8Array(mp3End))
  }

  return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' })
}

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
  isDownloading: boolean;
}

export function useAudioPlayer() {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    containerElRef.current = el;
    setContainerEl(el);
  }, []);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  // Using Tone.Player instead of MediaElementAudioSourceNode
  const playerRef = useRef<Tone.Player | null>(null); 

  const [files, setFiles] = useState<AudioFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    reverb: 0,
    volume: 1,
    isMuted: false,
    loopMode: 'off',
    isDownloading: false,
  });

  // Refs for state access inside callbacks
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);
  
  const currentFileIdRef = useRef(currentFileId);
  useEffect(() => { currentFileIdRef.current = currentFileId; }, [currentFileId]);

  // --- Initialization ---
  
  // Track initialization state
  const isInitializedRef = useRef(false);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);

  // Store handleTrackEnd in a ref to avoid circular dependency in initialization
  // We need this because initializeAudio is called before handleTrackEnd is defined in the component body flow if we are not careful,
  // but actually useCallback handles hoisting fine. However, to be safe and clean:
  const handleTrackEndRef = useRef<(() => void) | null>(null);

  // Track seeking state
  const isSeekingRef = useRef(false);

  // Ref for seeking timeout cleanup (prevents memory leak)
  const seekingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generation counter to abort stale concurrent playFile calls
  const loadGenRef = useRef(0);

  // Function to initialize Tone.js Effects Chain
  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) return;
    if (initializationPromiseRef.current) return initializationPromiseRef.current;
    
    initializationPromiseRef.current = (async () => {
        // Reverb (Single instance reused)
        const reverb = new Tone.Reverb({
        decay: 4,
        wet: 0,
        }).toDestination();

        // Non-blocking: iOS requires AudioContext to be unlocked in the user gesture call stack.
        // Awaiting reverb.generate() here breaks that chain. Fire-and-forget instead.
        reverb.generate().catch(e => console.warn("Reverb generation failed", e));

        reverbRef.current = reverb;

        // Player (Single instance reused)
        const player = new Tone.Player().connect(reverb);
        playerRef.current = player;
        
        // Apply current state values to the new player
        player.playbackRate = stateRef.current.speed;
        player.volume.value = stateRef.current.isMuted ? -Infinity : Tone.gainToDb(stateRef.current.volume);

        // Handle track end (when audio finishes playing naturally)
        player.onstop = () => {
            if (stateRef.current.isPlaying && !isSeekingRef.current) {
                handleTrackEndRef.current?.();
            }
        };

        isInitializedRef.current = true;
        initializationPromiseRef.current = null;
    })();

    return initializationPromiseRef.current;
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.dispose();
      reverbRef.current?.dispose();
      isInitializedRef.current = false;
      // Revoke all object URLs to prevent memory leaks
      filesRef.current.forEach(f => URL.revokeObjectURL(f.url));
    };
  }, []);

  // Initialize WaveSurfer (Visualizer Only) — reactive to container element
  useEffect(() => {
    if (!containerEl) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    const ws = WaveSurfer.create({
      container: containerEl,
      waveColor: '#a855f7',
      progressColor: '#7e22ce',
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 2,
      height: 128,
      normalize: true,
      interact: true,
      autoCenter: true,
    });

    wavesurferRef.current = ws;

    // Reload current track if one is already selected
    const currentFile = filesRef.current.find(f => f.id === currentFileIdRef.current);
    if (currentFile) {
      ws.load(currentFile.url)
        .then(() => {
          ws.setVolume(0);
          ws.setTime(stateRef.current.currentTime);
        })
        .catch(() => {});
    }

    // Handle user seeking on WaveSurfer
    ws.on('interaction', (newTime) => {
        const player = playerRef.current;
        if (!player || !player.loaded) return;

        // Set seeking flag to prevent onstop from triggering track end logic
        isSeekingRef.current = true;

        // Clear any existing timeout to keep flag active during rapid interactions
        if (seekingTimeoutRef.current) {
            clearTimeout(seekingTimeoutRef.current);
        }

        // Commit time state before seeking
        timeRef.current.pausedAt = newTime;
        timeRef.current.startedAt = Date.now();

        if (player.state === 'started') {
            player.stop();
            player.start(undefined, newTime);
            setState(prev => ({ ...prev, currentTime: newTime }));
        } else {
            setState(prev => ({ ...prev, currentTime: newTime }));
        }

        // Reset seeking flag after a short delay to allow onstop to fire safely
        seekingTimeoutRef.current = setTimeout(() => {
            isSeekingRef.current = false;
        }, 200);
    });

    return () => {
      if (seekingTimeoutRef.current) {
        clearTimeout(seekingTimeoutRef.current);
      }
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [containerEl]);

  // Time tracking ref for synchronization
  const timeRef = useRef({
    startedAt: 0,
    pausedAt: 0,
    speed: 1,
  });

  // --- Playback Logic ---

  const playFile = useCallback(async (id: string) => {
    const gen = ++loadGenRef.current;

    // iOS: unlock AudioContext as the very first operation in a user gesture handler.
    // Any await before this risks losing the gesture context on iOS/WKWebView.
    if (Tone.context.state !== 'running') {
      try { await Tone.start(); } catch (e) { console.warn('Failed to start audio context:', e); }
    }
    if (gen !== loadGenRef.current) return;

    // Ensure Audio is initialized
    await initializeAudio();
    if (gen !== loadGenRef.current) return;

    const fileObj = filesRef.current.find(f => f.id === id);
    if (!fileObj || !playerRef.current) return;

    // Recreate WaveSurfer if it was destroyed
    if (!wavesurferRef.current && containerElRef.current) {
      const ws = WaveSurfer.create({
        container: containerElRef.current,
        waveColor: '#a855f7',
        progressColor: '#7e22ce',
        cursorColor: '#ffffff',
        barWidth: 2,
        barGap: 2,
        height: 128,
        normalize: true,
        interact: true,
        autoCenter: true,
      });

      wavesurferRef.current = ws;

      // Setup interaction handler
      ws.on('interaction', (newTime) => {
        const player = playerRef.current;
        if (!player || !player.loaded) return;

        isSeekingRef.current = true;
        if (seekingTimeoutRef.current) {
          clearTimeout(seekingTimeoutRef.current);
        }

        timeRef.current.pausedAt = newTime;
        timeRef.current.startedAt = Date.now();

        if (player.state === 'started') {
          player.stop();
          player.start(undefined, newTime);
          setState(prev => ({ ...prev, currentTime: newTime }));
        } else {
          setState(prev => ({ ...prev, currentTime: newTime }));
        }

        seekingTimeoutRef.current = setTimeout(() => {
          isSeekingRef.current = false;
        }, 200);
      });
    }

    if (!wavesurferRef.current) return;

    const player = playerRef.current;

    // Stop current
    if (player.state === 'started') {
      player.stop();
    }

    setCurrentFileId(id);
    setIsReady(false);

    // Reset time tracking
    timeRef.current = { startedAt: 0, pausedAt: 0, speed: stateRef.current.speed };

    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0, duration: 0 }));

    try {
        // Load into Tone.Player (Decodes audio - Critical for mobile stability)
        await player.load(fileObj.url);
        if (gen !== loadGenRef.current) return;

        // Sync WaveSurfer (Visualizer)
        await wavesurferRef.current.load(fileObj.url);
        wavesurferRef.current.setVolume(0); // Mute WaveSurfer to avoid double audio
        if (gen !== loadGenRef.current) return;

        // Update state
        setState(prev => ({ ...prev, duration: player.buffer?.duration ?? 0 }));
        setIsReady(true);

        player.start();
        timeRef.current.startedAt = Date.now(); // Track start time
        setState(prev => ({ ...prev, isPlaying: true }));

        // Reset playback rate/volume/reverb to current state values
        player.playbackRate = stateRef.current.speed;
        player.volume.value = stateRef.current.isMuted ? -Infinity : Tone.gainToDb(stateRef.current.volume);
        if (reverbRef.current) reverbRef.current.wet.value = stateRef.current.reverb;

    } catch (err) {
        console.error("Error loading file", err);
    }
    // initializeAudio is stable (empty deps), safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sync Loop (Update UI with Player progress) ---
  useEffect(() => {
    let animationId: number;
    
    const loop = () => {
      const player = playerRef.current;
      const ws = wavesurferRef.current;
      const { isPlaying, duration } = stateRef.current;
      
      if (player && isPlaying && ws) {
        // Calculate current time based on system clock and speed
        const now = Date.now();
        const elapsed = (now - timeRef.current.startedAt) / 1000;
        const playedTime = timeRef.current.pausedAt + (elapsed * timeRef.current.speed);
        
        if (playedTime < duration) {
            // Update Visuals
            ws.setTime(playedTime);
            setState(prev => ({ ...prev, currentTime: playedTime }));
        } else {
            // End of track handling in onstop callback, but visual clamp here
            ws.setTime(duration);
        }
      }
      animationId = requestAnimationFrame(loop);
    };
    loop();
    
    return () => cancelAnimationFrame(animationId);
  }, []);

  // --- Watchers for Controls ---

  // Speed
  useEffect(() => {
    if (playerRef.current) {
        // When changing speed, we need to "commit" the current time to pausedAt
        // and reset startedAt, otherwise the math breaks (it would apply new speed to entire duration)
        
        if (state.isPlaying) {
            const now = Date.now();
            const elapsed = (now - timeRef.current.startedAt) / 1000;
            timeRef.current.pausedAt += elapsed * timeRef.current.speed; // Commit time with OLD speed
            timeRef.current.startedAt = now; // Reset start time
        }
        
        timeRef.current.speed = state.speed;
        playerRef.current.playbackRate = state.speed;
    }
  }, [state.speed, state.isPlaying]); // Added isPlaying dependency to ensure logic holds

  // Reverb
  useEffect(() => {
    if (reverbRef.current) {
        reverbRef.current.wet.value = state.reverb;
    }
  }, [state.reverb]);

  // Volume / Mute
  useEffect(() => {
    if (playerRef.current) {
        const val = state.isMuted ? 0 : state.volume;
        playerRef.current.volume.value = Tone.gainToDb(val);
    }
  }, [state.volume, state.isMuted]);

  // Loop Mode Handling
  // We intentionally do NOT use Tone.Player's native .loop property because
  // it bypasses the onstop callback, which means timeRef and WaveSurfer
  // wouldn't be reset when the track loops. Instead, we handle looping
  // manually in handleTrackEnd for consistent behavior.
  
  const handleTrackEnd = useCallback(() => {
      const { loopMode } = stateRef.current;
      const currentId = currentFileIdRef.current;
      const fileList = filesRef.current;
      
      // Reset time for next track or loop
      timeRef.current = { startedAt: 0, pausedAt: 0, speed: stateRef.current.speed };
      
      if (!currentId) return;

      if (loopMode === 'one') {
          // Restart the same track from the beginning
          timeRef.current.pausedAt = 0;
          timeRef.current.startedAt = Date.now();
          wavesurferRef.current?.setTime(0);
          setState(prev => ({ ...prev, currentTime: 0 }));
          playerRef.current?.start();
      } else if (loopMode === 'all') {
        // Guard against empty file list (division by zero)
        if (fileList.length === 0) return;
        const currentIndex = fileList.findIndex(f => f.id === currentId);
        if (currentIndex === -1) return;
        const nextIndex = (currentIndex + 1) % fileList.length;
        playFile(fileList[nextIndex].id);
      } else {
        const currentIndex = fileList.findIndex(f => f.id === currentId);
        if (currentIndex === -1) return;
        if (currentIndex < fileList.length - 1) {
          playFile(fileList[currentIndex + 1].id);
        } else {
            // Prevent onstop from calling handleTrackEnd again
            isSeekingRef.current = true;
            playerRef.current?.stop();
            setState(prev => ({ ...prev, isPlaying: false }));
            isSeekingRef.current = false;
        }
      }
  }, [playFile]);

  // Update handleTrackEndRef
  useEffect(() => {
    handleTrackEndRef.current = handleTrackEnd;
  }, [handleTrackEnd]);

  // --- Public API ---
  const addFiles = useCallback(async (newFiles: File[]) => {
    // Process files synchronously first, before any await, so File objects are
    // still alive and the UI updates immediately (critical on iOS).
    const audioFiles = newFiles.map(file => ({
      id: uuidv4(),
      file,
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    // Optimistically update ref so playFile can work immediately if called
    filesRef.current = [...filesRef.current, ...audioFiles];

    // Update UI IMMEDIATELY (no await before this)
    setFiles(prev => [...prev, ...audioFiles]);

    // iOS: unlock AudioContext on file selection gesture.
    // This runs after UI update so the file list is visible even if Tone.start() is slow.
    if (Tone.context.state !== 'running') {
      try { await Tone.start(); } catch (e) { console.warn('Failed to start audio context:', e); }
    }

    // Initialize Audio (Async, might take time)
    // We do this AFTER UI update so the user sees the file in the list
    try {
        await initializeAudio();
    } catch (e) {
        console.error("Failed to initialize audio", e);
    }

    // Auto-play first file if nothing is playing
    // Note: This relies on filesRef being updated
    if (!currentFileIdRef.current && audioFiles.length > 0) {
      playFile(audioFiles[0].id);
    }
  }, [playFile, initializeAudio]);

  const togglePlay = useCallback(async () => {
    // iOS: unlock AudioContext as the very first operation in a user gesture handler.
    if (Tone.context.state !== 'running') {
      try { await Tone.start(); } catch (e) { console.warn('Failed to start audio context:', e); }
    }

    // Ensure Audio is initialized on user interaction
    if (!isInitializedRef.current) {
        await initializeAudio();
    }

    if (!playerRef.current || !isReady) return;

    if (stateRef.current.isPlaying) {
        // Pause Logic
        const now = Date.now();
        const elapsed = (now - timeRef.current.startedAt) / 1000;
        timeRef.current.pausedAt += elapsed * timeRef.current.speed;
        
        playerRef.current.stop();
        setState(prev => ({ ...prev, isPlaying: false }));
    } else {
        // Play Logic (Resume)
        const offset = timeRef.current.pausedAt;
        playerRef.current.start(undefined, offset);
        
        timeRef.current.startedAt = Date.now();
        setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [isReady, initializeAudio]);


  const playNext = useCallback(() => {
    // Guard against empty file list (division by zero)
    if (filesRef.current.length === 0) return;
    const currentIndex = filesRef.current.findIndex(f => f.id === currentFileIdRef.current);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % filesRef.current.length;
    playFile(filesRef.current[nextIndex].id);
  }, [playFile]);

  const playPrev = useCallback(() => {
    // Guard against empty file list (division by zero)
    if (filesRef.current.length === 0) return;
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
      const fileToRemove = filesRef.current.find(f => f.id === id);
      
      // Use ref instead of state to avoid stale closure
      if (currentFileIdRef.current === id) {
          // 1. Stop playback first
          playerRef.current?.stop();
          
          // 2. Destroy WaveSurfer completely (removes all visual elements)
          if (wavesurferRef.current) {
            wavesurferRef.current.destroy();
            wavesurferRef.current = null;
          }
          
          // 3. Clear state
          setCurrentFileId(null);
          setIsReady(false);
          setState(prev => ({ ...prev, isPlaying: false, currentTime: 0, duration: 0 }));
          
          // 4. Reset time tracking
          timeRef.current = { startedAt: 0, pausedAt: 0, speed: stateRef.current.speed };
      }
      
      // 5. Now revoke URL (after WaveSurfer stopped using it)
      if (fileToRemove) {
          URL.revokeObjectURL(fileToRemove.url);
      }
      
      // 6. Update files state and ref
      filesRef.current = filesRef.current.filter(f => f.id !== id);
      setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = useCallback(() => {
    // Invalidate any in-progress playFile calls (prevents race condition)
    loadGenRef.current++;
    
    // 1. Stop playback first
    playerRef.current?.stop();
    
    // 2. Destroy WaveSurfer completely (removes all visual elements)
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    
    // 3. Clear state (this will cause WaveformDisplay to show "No track selected")
    setFiles([]);
    setCurrentFileId(null);
    setIsReady(false);
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }));
    
    // 4. Now it's safe to revoke URLs (after WaveSurfer stopped using them)
    filesRef.current.forEach(f => URL.revokeObjectURL(f.url));
    filesRef.current = [];
    
    // 5. Reset time tracking
    timeRef.current = { startedAt: 0, pausedAt: 0, speed: stateRef.current.speed };
  }, []);

  const downloadWithFormat = useCallback(async (format: 'wav' | 'mp3') => {
    const audioBuffer = playerRef.current?.buffer?.get()
    if (!audioBuffer) return

    const { speed, reverb: wet } = stateRef.current
    const currentFile = filesRef.current.find(f => f.id === currentFileIdRef.current)
    const baseName = currentFile?.name.replace(/\.[^/.]+$/, '') ?? 'remix'

    setState(prev => ({ ...prev, isDownloading: true }))
    try {
      const outputDuration = audioBuffer.duration / speed
      const tail = wet > 0 ? 4 : 0 // Extra time for reverb tail

      // Use Tone.Offline to render with the same effects as preview
      const rendered = await Tone.Offline(async () => {
        // Create player with the original buffer
        const offlinePlayer = new Tone.Player(audioBuffer)
        offlinePlayer.playbackRate = speed

        if (wet > 0) {
          // Create reverb identical to the one used in preview
          const offlineReverb = new Tone.Reverb({
            decay: 4,
            wet: wet,
          })
          await offlineReverb.generate() // Generate the impulse response
          offlinePlayer.connect(offlineReverb)
          offlineReverb.toDestination()
        } else {
          offlinePlayer.toDestination()
        }

        // Start playback
        offlinePlayer.start(0)
      }, outputDuration + tail, audioBuffer.numberOfChannels, audioBuffer.sampleRate)

      // Convert ToneAudioBuffer to native AudioBuffer
      const nativeBuffer = rendered.get() as AudioBuffer
      const blob = format === 'mp3' ? encodeMP3(nativeBuffer) : encodeWAV(nativeBuffer)
      const ext = format === 'mp3' ? 'mp3' : 'wav'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${baseName}_remix.${ext}`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Falha ao processar o áudio. Tente novamente.')
    } finally {
      setState(prev => ({ ...prev, isDownloading: false }))
    }
  }, [])

  const downloadWithEffects = useCallback(() => downloadWithFormat('wav'), [downloadWithFormat])
  const downloadAsMP3 = useCallback(() => downloadWithFormat('mp3'), [downloadWithFormat])

  return {
    containerRef,
    state,
    files,
    currentFileId,
    addFiles,
    playFile,
    removeFile,
    clearAll,
    togglePlay,
    playNext,
    playPrev,
    setSpeed,
    setReverb,
    setVolume,
    toggleMute,
    cycleLoopMode,
    downloadWithEffects,
    downloadAsMP3,
  };
}