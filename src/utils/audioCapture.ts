/**
 * Robust Client Audio Capture Pipeline for Google Cloud Speech-to-Text V2.
 * Adheres to:
 * - Proper getUserMedia constraints with graceful fallback
 * - Real MediaRecorder MIME type detection matching declared bytes
 * - Complete resource cleanup (tracks, AudioContext, MediaRecorder) to prevent battery drain
 * - Real Web Audio AnalyserNode volume meter (0-100)
 * - Conversational silence tolerance (does not abort on brief pauses)
 */

export interface AudioCaptureConfig {
  sampleRate?: number;
  timeSliceMs?: number; // chunk duration
  silenceTimeoutMs?: number;
  onAudioChunk?: (chunk: Blob) => void;
  onVolumeChange?: (volume: number) => void; // 0 - 100
  onSilenceTimeout?: () => void;
  onError?: (err: Error) => void;
}

export interface AudioCaptureController {
  stop: () => Promise<{ fullAudioBlob: Blob; durationMs: number; mimeType: string }>;
  cancel: () => void;
  getMimeType: () => string;
}

/**
 * Detect the best supported audio MIME type in the browser.
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof (window as any).MediaRecorder === 'undefined') {
    return 'audio/webm';
  }

  const candidateMimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/wav',
  ];

  for (const mime of candidateMimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return 'audio/webm';
}

/**
 * Start capturing microphone audio with real volume analysis and chunking.
 */
export async function startAudioCapture(
  config: AudioCaptureConfig
): Promise<AudioCaptureController> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('MIC_UNSUPPORTED: Microphone capture is not supported in this browser.');
  }

  const startTime = Date.now();
  let mediaStream: MediaStream;

  // Try optimal voice constraints first, then fallback to simple audio: true
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('MIC_PERMISSION_DENIED: Microphone access was blocked by the browser.');
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error('MIC_NOT_FOUND: No microphone device was found on this system.');
    }

    // Try fallback without strict constraints
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (fallbackErr: any) {
      throw new Error(`MIC_UNAVAILABLE: Failed to access microphone (${fallbackErr.message || 'Unknown error'}).`);
    }
  }

  const mimeType = getSupportedAudioMimeType();
  const audioChunks: Blob[] = [];

  let recorder: MediaRecorder | null = null;
  try {
    recorder = new MediaRecorder(mediaStream, { mimeType });
  } catch {
    // If specific mimeType fails, construct without options
    recorder = new MediaRecorder(mediaStream);
  }

  // Set up AudioContext for real-time volume metering
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let animFrameId: number | null = null;
  let silenceTimer: any = null;
  let hasSpoken = false;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      sourceNode.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const volume = Math.min(100, Math.round((avg / 128) * 100));

        if (config.onVolumeChange) {
          config.onVolumeChange(volume);
        }

        // Conversational silence detection: trigger only if patient spoke then paused for silenceTimeoutMs
        const SILENCE_THRESHOLD = 8;
        if (volume > SILENCE_THRESHOLD) {
          hasSpoken = true;
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
        } else if (hasSpoken && config.silenceTimeoutMs && config.silenceTimeoutMs > 0) {
          if (!silenceTimer) {
            silenceTimer = setTimeout(() => {
              if (config.onSilenceTimeout) {
                config.onSilenceTimeout();
              }
            }, config.silenceTimeoutMs);
          }
        }

        animFrameId = requestAnimationFrame(updateVolume);
      };

      animFrameId = requestAnimationFrame(updateVolume);
    }
  } catch (audioCtxErr) {
    console.warn('[AudioCapture] AudioContext volume meter notice:', audioCtxErr);
  }

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      audioChunks.push(event.data);
      if (config.onAudioChunk) {
        config.onAudioChunk(event.data);
      }
    }
  };

  recorder.onerror = (e: any) => {
    if (config.onError) {
      config.onError(new Error(e.error?.message || 'MediaRecorder encountered an error.'));
    }
  };

  // Start recording chunks (default slice 500ms for responsiveness)
  const timeSlice = config.timeSliceMs || 500;
  recorder.start(timeSlice);

  const cleanup = () => {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch {}
      sourceNode = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      try {
        audioContext.close();
      } catch {}
      audioContext = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    }
  };

  return {
    getMimeType: () => mimeType,
    stop: (): Promise<{ fullAudioBlob: Blob; durationMs: number; mimeType: string }> => {
      return new Promise((resolve) => {
        if (!recorder || recorder.state === 'inactive') {
          cleanup();
          const fullBlob = new Blob(audioChunks, { type: mimeType });
          resolve({ fullAudioBlob: fullBlob, durationMs: Date.now() - startTime, mimeType });
          return;
        }

        recorder.onstop = () => {
          cleanup();
          const fullBlob = new Blob(audioChunks, { type: mimeType });
          resolve({ fullAudioBlob: fullBlob, durationMs: Date.now() - startTime, mimeType });
        };

        try {
          recorder.stop();
        } catch {
          cleanup();
          const fullBlob = new Blob(audioChunks, { type: mimeType });
          resolve({ fullAudioBlob: fullBlob, durationMs: Date.now() - startTime, mimeType });
        }
      });
    },
    cancel: () => {
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {}
      }
      cleanup();
    },
  };
}

/**
 * Converts a Blob to a Base64 string for transmission to server.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
