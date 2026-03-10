import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import * as Tone from 'tone';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export type LoopMode = 'off' | 'all' | 'one';

interface FileSettings {
  speed: number;
  reverb: number;
  bass: number;
  volume: number;
  isMuted: boolean;
}

const defaultFileSettings: FileSettings = {
  speed: 1,
  reverb: 0,
  bass: 0,
  volume: 1,
  isMuted: false,
};

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

async function encodeMP3(buffer: AudioBuffer, kbps: number = 192): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/mp3-encoder.worker.ts', import.meta.url)
    );

    worker.onmessage = (e: MessageEvent<{ blob: Blob }>) => {
      resolve(e.data.blob);
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.numberOfChannels > 1 
      ? buffer.getChannelData(1) 
      : null;

    worker.postMessage({
      leftChannel,
      rightChannel,
      sampleRate: buffer.sampleRate,
      numChannels: buffer.numberOfChannels,
      kbps,
    });
  });
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
  bass: number; // 0 to 12 (dB boost)
  volume: number; // 0 to 1
  isMuted: boolean;
  loopMode: LoopMode;
  isDownloading: boolean;
  isCropping: boolean;
  cropStart: number | null;
  cropEnd: number | null;
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
  const bassBoostRef = useRef<Tone.BiquadFilter | null>(null);
  // Using Tone.Player instead of MediaElementAudioSourceNode
  const playerRef = useRef<Tone.Player | null>(null);

  const [files, setFiles] = useState<AudioFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [perFileSettings, setPerFileSettings] = useState<Record<string, FileSettings>>({});
  
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    reverb: 0,
    bass: 0,
    volume: 1,
    isMuted: false,
    loopMode: 'off',
    isDownloading: false,
    isCropping: false,
    cropStart: null,
    cropEnd: null,
  });

  // Refs for state access inside callbacks
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  const perFileSettingsRef = useRef(perFileSettings);
  useEffect(() => { perFileSettingsRef.current = perFileSettings; }, [perFileSettings]);
  
  const currentFileIdRef = useRef(currentFileId);
  useEffect(() => { currentFileIdRef.current = currentFileId; }, [currentFileId]);

  const updateFileSettings = useCallback((id: string | null, partial: Partial<FileSettings>) => {
    if (!id) return;
    setPerFileSettings(prev => {
      const current = prev[id] ?? defaultFileSettings;
      const next = { ...prev, [id]: { ...current, ...partial } };
      perFileSettingsRef.current = next;
      return next;
    });
  }, []);

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
  const prevSpeedRef = useRef(state.speed);

  // Guard to prevent reentrant handleTrackEnd calls from sync loop
  const isHandlingTrackEndRef = useRef(false);

  // Generation counter to abort stale concurrent playFile calls
  const loadGenRef = useRef(0);

  // Time tracking ref for synchronization
  const timeRef = useRef({
    startedAt: 0,
    pausedAt: 0,
    speed: 1,
  });

  // --- WaveSurfer Factory ---
  // Creates a WaveSurfer instance with interaction handler configured
  const createWaveSurfer = useCallback((container: HTMLDivElement): WaveSurfer => {
    const ws = WaveSurfer.create({
      container,
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

    ws.on('interaction', (newTime) => {
      const player = playerRef.current;
      if (!player || !player.loaded) return;

      // Clamp seek to crop bounds when crop is active
      const { isCropping, cropStart, cropEnd } = stateRef.current;
      let seekTime = newTime;
      if (isCropping && cropStart != null && cropEnd != null) {
        if (seekTime < cropStart) seekTime = cropStart;
        if (seekTime >= cropEnd) seekTime = cropStart;
      }

      isSeekingRef.current = true;
      if (seekingTimeoutRef.current) {
        clearTimeout(seekingTimeoutRef.current);
      }

      timeRef.current.pausedAt = seekTime;
      timeRef.current.startedAt = Date.now();

      if (player.state === 'started') {
        player.stop();
        player.start(undefined, seekTime);
        setState(prev => ({ ...prev, currentTime: seekTime }));
      } else {
        setState(prev => ({ ...prev, currentTime: seekTime }));
      }

      seekingTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false;
      }, 200);
    });

    return ws;
  }, []);

  // Function to initialize Tone.js Effects Chain
  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) return;
    if (initializationPromiseRef.current) return initializationPromiseRef.current;
    
    initializationPromiseRef.current = (async () => {
        try {
          // Reverb (Single instance reused)
          const reverb = new Tone.Reverb({
          decay: 4,
          wet: 0,
          }).toDestination();

          // Non-blocking: iOS requires AudioContext to be unlocked in the user gesture call stack.
          // Awaiting reverb.generate() here breaks that chain. Fire-and-forget instead.
          reverb.generate().catch(e => console.warn("Reverb generation failed", e));

          reverbRef.current = reverb;

          // BiquadFilter lowshelf for bass boost (clean, no phase artifacts)
          const bassBoost = new Tone.BiquadFilter({
            frequency: 150,
            type: "lowshelf",
            gain: 0,
          }).connect(reverb);
          bassBoostRef.current = bassBoost;

          // Player (Single instance reused)
          const player = new Tone.Player().connect(bassBoost);
          playerRef.current = player;

          // Apply current state values to the new player
          player.playbackRate = stateRef.current.speed;
          player.volume.value = stateRef.current.isMuted ? -Infinity : Tone.gainToDb(stateRef.current.volume);

          // Handle track end (when audio finishes playing naturally)
          player.onstop = () => {
              // When cropping is active, the sync loop is the sole authority for
              // detecting crop-end and triggering handleTrackEnd.  The stop()+start()
              // restart inside handleTrackEnd fires onstop asynchronously, which was
              // slipping past the isHandling guard and causing rapid-fire restarts.
              if (stateRef.current.isPlaying && !isSeekingRef.current && !isHandlingTrackEndRef.current && !stateRef.current.isCropping) {
                  handleTrackEndRef.current?.();
              }
          };

          isInitializedRef.current = true;
        } finally {
          // Always clear so a failed init can be retried
          initializationPromiseRef.current = null;
        }
    })();

    return initializationPromiseRef.current;
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.dispose();
      bassBoostRef.current?.dispose();
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

    const ws = createWaveSurfer(containerEl);
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

    return () => {
      if (seekingTimeoutRef.current) {
        clearTimeout(seekingTimeoutRef.current);
      }
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [containerEl, createWaveSurfer]);

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
      wavesurferRef.current = createWaveSurfer(containerElRef.current);
    }

    if (!wavesurferRef.current) return;

    const player = playerRef.current;

    // Stop current
    if (player.state === 'started') {
      player.stop();
    }

    setCurrentFileId(id);
    setIsReady(false);

    const settings = perFileSettingsRef.current[id] ?? defaultFileSettings;

    // Reset time tracking
    timeRef.current = { startedAt: 0, pausedAt: 0, speed: settings.speed };

    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      speed: settings.speed,
      reverb: settings.reverb,
      bass: settings.bass,
      volume: settings.volume,
      isMuted: settings.isMuted,
      isCropping: false,
      cropStart: null,
      cropEnd: null,
    }));

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

        // Reset playback rate/volume/reverb to file settings
        player.playbackRate = settings.speed;
        player.volume.value = settings.isMuted ? -Infinity : Tone.gainToDb(settings.volume);
        if (reverbRef.current) reverbRef.current.wet.value = settings.reverb;
        if (bassBoostRef.current) bassBoostRef.current.gain.value = settings.bass;

    } catch (err) {
        console.error("Error loading file", err);
    }
    // initializeAudio and createWaveSurfer are stable (empty deps), safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createWaveSurfer]);

  // --- Sync Loop (Update UI with Player progress) ---
  // Only runs when isPlaying is true to save CPU when paused/idle
  useEffect(() => {
    if (!state.isPlaying) return;
    
    let animationId: number;
    
    const loop = () => {
      const player = playerRef.current;
      const ws = wavesurferRef.current;
      const { duration } = stateRef.current;
      
      if (player && ws) {
        // Calculate current time based on system clock and speed
        const now = Date.now();
        const elapsed = (now - timeRef.current.startedAt) / 1000;
        const playedTime = timeRef.current.pausedAt + (elapsed * timeRef.current.speed);

        const { isCropping, cropEnd } = stateRef.current;
        const effectiveEnd = (isCropping && cropEnd != null) ? cropEnd : duration;

        if (playedTime < effectiveEnd) {
            // Update Visuals
            ws.setTime(playedTime);
            setState(prev => ({ ...prev, currentTime: playedTime }));
        } else if (isCropping && cropEnd != null && !isHandlingTrackEndRef.current) {
            // Crop end reached — trigger track end handling (guard prevents reentrant calls)
            isHandlingTrackEndRef.current = true;
            handleTrackEndRef.current?.();
        } else {
            // End of track handling in onstop callback, but visual clamp here
            ws.setTime(duration);
        }
      }
      animationId = requestAnimationFrame(loop);
    };
    loop();
    
    return () => cancelAnimationFrame(animationId);
  }, [state.isPlaying]);

  // --- Watchers for Controls ---

  // Speed
  useEffect(() => {
    if (playerRef.current) {
        if (prevSpeedRef.current === state.speed) return;

        // When changing speed, we need to "commit" the current time to pausedAt
        // and reset startedAt, otherwise the math breaks (it would apply new speed to entire duration)

        if (state.isPlaying) {
            const now = Date.now();
            const elapsed = (now - timeRef.current.startedAt) / 1000;
            timeRef.current.pausedAt += elapsed * timeRef.current.speed; // Commit time with OLD speed
            timeRef.current.startedAt = now; // Reset start time
        }

        prevSpeedRef.current = state.speed;
        timeRef.current.speed = state.speed;
        playerRef.current.playbackRate = state.speed;
    }
  }, [state.speed]);

  // Reverb
  useEffect(() => {
    if (reverbRef.current) {
        reverbRef.current.wet.value = state.reverb;
    }
  }, [state.reverb]);

  // Bass boost
  useEffect(() => {
    if (bassBoostRef.current) {
      bassBoostRef.current.gain.value = state.bass;
    }
  }, [state.bass]);

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
      const { loopMode, isCropping, cropStart, cropEnd } = stateRef.current;
      const currentId = currentFileIdRef.current;
      const fileList = filesRef.current;

      const restartOffset = (isCropping && cropStart != null) ? cropStart : 0;

      // Reset time for next track or loop
      timeRef.current = { startedAt: 0, pausedAt: restartOffset, speed: stateRef.current.speed };

      if (!currentId) return;

      // Stop the player first when crop end is reached (sync loop triggers this).
      // IMPORTANT: onstop fires ASYNC in Tone.js, so we keep isSeekingRef=true
      // until after restart to block the delayed onstop callback.
      if (isCropping && playerRef.current?.state === 'started') {
        isSeekingRef.current = true;
        playerRef.current.stop();
        // Do NOT reset isSeekingRef here — reset after restart below
      }

      if (loopMode === 'one') {
          // Restart the same track from cropStart (or 0)
          timeRef.current.pausedAt = restartOffset;
          timeRef.current.startedAt = Date.now();
          wavesurferRef.current?.setTime(restartOffset);
          setState(prev => ({ ...prev, currentTime: restartOffset }));
          playerRef.current?.start(undefined, restartOffset);
          // Reset guards after async onstop from stop() has been absorbed
          setTimeout(() => {
            isSeekingRef.current = false;
            isHandlingTrackEndRef.current = false;
          }, 200);
      } else if (loopMode === 'all') {
        // Guard against empty file list (division by zero)
        if (fileList.length === 0) return;
        const currentIndex = fileList.findIndex(f => f.id === currentId);
        if (currentIndex === -1) return;
        if (fileList.length === 1) {
          // Single file: restart like loop-one (preserves crop state)
          timeRef.current.pausedAt = restartOffset;
          timeRef.current.startedAt = Date.now();
          wavesurferRef.current?.setTime(restartOffset);
          setState(prev => ({ ...prev, currentTime: restartOffset }));
          playerRef.current?.start(undefined, restartOffset);
          setTimeout(() => {
            isSeekingRef.current = false;
            isHandlingTrackEndRef.current = false;
          }, 200);
        } else {
          const nextIndex = (currentIndex + 1) % fileList.length;
          isHandlingTrackEndRef.current = false;
          setTimeout(() => { isSeekingRef.current = false; }, 100);
          playFile(fileList[nextIndex].id);
        }
      } else {
        const currentIndex = fileList.findIndex(f => f.id === currentId);
        if (currentIndex === -1) return;
        if (currentIndex < fileList.length - 1) {
          isHandlingTrackEndRef.current = false;
          setTimeout(() => { isSeekingRef.current = false; }, 100);
          playFile(fileList[currentIndex + 1].id);
        } else {
            // Prevent onstop from calling handleTrackEnd again
            isSeekingRef.current = true;
            playerRef.current?.stop();
            setState(prev => ({ ...prev, isPlaying: false }));
            // Reset after async onstop has fired
            setTimeout(() => { isSeekingRef.current = false; }, 100);
            isHandlingTrackEndRef.current = false;
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

    const newSettings: Record<string, FileSettings> = {};
    audioFiles.forEach(file => {
      newSettings[file.id] = defaultFileSettings;
    });

    // Optimistically update refs so playFile can work immediately if called
    filesRef.current = [...filesRef.current, ...audioFiles];
    perFileSettingsRef.current = {
      ...perFileSettingsRef.current,
      ...newSettings,
    };

    // Update UI IMMEDIATELY (no await before this)
    setFiles(prev => [...prev, ...audioFiles]);
    setPerFileSettings(prev => ({
      ...prev,
      ...newSettings,
    }));

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
        let offset = timeRef.current.pausedAt;

        // If crop is active and offset is outside crop bounds, start from cropStart
        const { isCropping, cropStart, cropEnd } = stateRef.current;
        if (isCropping && cropStart != null && cropEnd != null) {
          if (offset < cropStart || offset >= cropEnd) {
            offset = cropStart;
            timeRef.current.pausedAt = offset;
          }
        }

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

  const setSpeed = (speed: number) => {
    setState(prev => ({ ...prev, speed }));
    updateFileSettings(currentFileIdRef.current, { speed });
  };
  const setReverb = (reverb: number) => {
    setState(prev => ({ ...prev, reverb }));
    updateFileSettings(currentFileIdRef.current, { reverb });
  };
  const setBass = (bass: number) => {
    setState(prev => ({ ...prev, bass }));
    updateFileSettings(currentFileIdRef.current, { bass });
  };
  const setVolume = (volume: number) => {
    setState(prev => ({ ...prev, volume }));
    updateFileSettings(currentFileIdRef.current, { volume });
  };
  const toggleMute = () => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    updateFileSettings(currentFileIdRef.current, { isMuted: !stateRef.current.isMuted });
  };
  const toggleCrop = useCallback(() => {
    const { isCropping, duration } = stateRef.current;
    if (isCropping) {
      setState(prev => ({ ...prev, isCropping: false, cropStart: null, cropEnd: null }));
    } else {
      const start = 0;
      const end = duration;
      setState(prev => ({ ...prev, isCropping: true, cropStart: start, cropEnd: end }));
    }
  }, []);

  const setCropRegion = useCallback((start: number, end: number) => {
    setState(prev => ({ ...prev, cropStart: start, cropEnd: end }));

    // Restart playback from the new crop start
    const player = playerRef.current;
    if (player && player.loaded) {
      isSeekingRef.current = true;
      if (seekingTimeoutRef.current) {
        clearTimeout(seekingTimeoutRef.current);
      }
      if (player.state === 'started') {
        player.stop();
      }
      timeRef.current.pausedAt = start;
      timeRef.current.startedAt = Date.now();
      player.start(undefined, start);
      setState(prev => ({ ...prev, isPlaying: true }));
      seekingTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false;
      }, 200);
    }
  }, []);

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

       setPerFileSettings(prev => {
         const next = { ...prev };
         delete next[id];
         perFileSettingsRef.current = next;
         return next;
       });
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

     setPerFileSettings({});
     perFileSettingsRef.current = {};
    
    // 5. Reset time tracking
    timeRef.current = { startedAt: 0, pausedAt: 0, speed: stateRef.current.speed };
  }, []);

  const downloadWithFormat = useCallback(async (format: 'wav' | 'mp3') => {
    // Server-side Pro verification for MP3 downloads
    if (format === 'mp3') {
      try {
        const res = await fetch('/api/verify-pro')
        const { isPro } = await res.json()
        if (!isPro) {
          toast.error('MP3 download is a Pro feature. Please upgrade to continue.')
          return
        }
      } catch {
        toast.error('Could not verify subscription. Please try again.')
        return
      }
    }

    const audioBuffer = playerRef.current?.buffer?.get()
    if (!audioBuffer) return

    const { speed, reverb: wet, bass, isCropping, cropStart, cropEnd } = stateRef.current
    const currentFile = filesRef.current.find(f => f.id === currentFileIdRef.current)
    const baseName = currentFile?.name.replace(/\.[^/.]+$/, '') ?? 'remix'

    const srcOffset = (isCropping && cropStart != null) ? cropStart : 0
    const srcEnd = (isCropping && cropEnd != null) ? cropEnd : audioBuffer.duration
    const srcDuration = srcEnd - srcOffset

    setState(prev => ({ ...prev, isDownloading: true }))
    try {
      const outputDuration = srcDuration / speed
      const tail = wet > 0 ? 4 : 0 // Extra time for reverb tail

      // Use Tone.Offline to render with the same effects as preview
      const rendered = await Tone.Offline(async ({ transport }) => {
        // Create player with the original buffer
        const offlinePlayer = new Tone.Player(audioBuffer)
        offlinePlayer.playbackRate = speed

        let offlineReverb: Tone.Reverb | null = null
        let offlineBassBoost: Tone.BiquadFilter | null = null

        // Build chain: Player → [BiquadFilter] → [Reverb] → destination
        let lastNode: Tone.ToneAudioNode = offlinePlayer

        if (bass > 0) {
          offlineBassBoost = new Tone.BiquadFilter({
            frequency: 150,
            type: "lowshelf",
            gain: bass,
          })
          lastNode.connect(offlineBassBoost)
          lastNode = offlineBassBoost
        }

        if (wet > 0) {
          offlineReverb = new Tone.Reverb({
            decay: 4,
            wet: wet,
          })
          await offlineReverb.generate()
          lastNode.connect(offlineReverb)
          lastNode = offlineReverb
        }

        lastNode.toDestination()

        // Start playback (with crop offset if active)
        offlinePlayer.start(0, srcOffset, srcDuration)

        // Schedule cleanup before render ends to prevent memory leaks
        const cleanupTime = Math.max(0, outputDuration + tail - 0.1)
        transport.schedule(() => {
          offlinePlayer.dispose()
          offlineBassBoost?.dispose()
          offlineReverb?.dispose()
        }, cleanupTime)
      }, outputDuration + tail, audioBuffer.numberOfChannels, audioBuffer.sampleRate)

      // Convert ToneAudioBuffer to native AudioBuffer
      const nativeBuffer = rendered.get() as AudioBuffer
      const blob = format === 'mp3' 
        ? await encodeMP3(nativeBuffer) 
        : encodeWAV(nativeBuffer)
      const ext = format === 'mp3' ? 'mp3' : 'wav'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${baseName}_remix.${ext}`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to process audio. Please try again.')
    } finally {
      setState(prev => ({ ...prev, isDownloading: false }))
    }
  }, [])

  const downloadWithEffects = useCallback(() => downloadWithFormat('wav'), [downloadWithFormat])
  const downloadAsMP3 = useCallback(() => downloadWithFormat('mp3'), [downloadWithFormat])

  return {
    containerRef,
    wavesurferRef,
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
    setBass,
    setVolume,
    toggleMute,
    cycleLoopMode,
    toggleCrop,
    setCropRegion,
    downloadWithEffects,
    downloadAsMP3,
  };
}
