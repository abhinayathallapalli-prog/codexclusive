import { LanguageCode } from '../types';
import { getVoiceRecognitionLang, getVoiceRecognitionFallbacks } from './languageSpeechModule';

export interface SpeechEngineResult {
  transcript: string;
  englishTranslation?: string;
  detectedLanguage?: string;
  chiefComplaint?: string;
  duration?: string;
  location?: string;
  triggers?: string;
  associations?: string;
  redFlagDetected?: boolean;
  redFlagReason?: string | null;
  confidence?: number;
  source: 'webspeech' | 'gemini-audio' | 'combined' | 'manual';
  rawAudioBlob?: Blob;
}

export interface SpeechEngineCallbacks {
  onInterimText?: (text: string) => void;
  onFinalText?: (text: string) => void;
  onVolumeChange?: (volume: number) => void; // 0 - 100
  onError?: (err: { code: string; message: string; actionableHint?: string }) => void;
  onStateChange?: (state: 'idle' | 'requesting' | 'recording' | 'transcribing') => void;
}

/**
 * Checks capabilities of the current browser environment
 */
export function checkSpeechCapabilities() {
  const hasGetUserMedia = Boolean(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );

  const hasMediaRecorder = Boolean(
    typeof window !== 'undefined' &&
    typeof (window as any).MediaRecorder === 'function'
  );

  const hasSpeechRecognition = Boolean(
    typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );

  const hasAudioContext = Boolean(
    typeof window !== 'undefined' &&
    (window.AudioContext || (window as any).webkitAudioContext)
  );

  return {
    hasGetUserMedia,
    hasMediaRecorder,
    hasSpeechRecognition,
    hasAudioContext,
    isFullySupported: hasGetUserMedia && (hasMediaRecorder || hasSpeechRecognition),
  };
}

/**
 * Robust Speech & Audio Capture Engine
 * Combines MediaRecorder (HTML5 audio) + Web Speech API + Gemini AI Multimodal Transcription
 */
export class SpeechAudioEngine {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private speechRecognition: any = null;

  private currentLanguage: LanguageCode = 'hi';
  private callbacks: SpeechEngineCallbacks = {};
  private capturedTranscript: string = '';
  private state: 'idle' | 'requesting' | 'recording' | 'transcribing' = 'idle';
  private chosenMimeType: string = 'audio/webm';

  constructor(callbacks: SpeechEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: SpeechEngineCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getState() {
    return this.state;
  }

  public getTranscript() {
    return this.capturedTranscript;
  }

  public async startListening(language?: LanguageCode): Promise<boolean> {
    return this.start(language || this.currentLanguage);
  }

  public async stopListening(): Promise<SpeechEngineResult> {
    return this.stop();
  }

  /**
   * Start live speech capture & audio recording
   */
  public async start(language: LanguageCode): Promise<boolean> {
    this.currentLanguage = language;
    this.capturedTranscript = '';
    this.audioChunks = [];
    this.updateState('requesting');

    // 1. Acquire microphone access via getUserMedia
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported by your browser or environment.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      console.warn('[SpeechAudioEngine] getUserMedia error:', err);
      this.updateState('idle');
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err?.message || '').toLowerCase().includes('permission') ||
        String(err?.message || '').toLowerCase().includes('denied');

      this.callbacks.onError?.({
        code: isPermissionDenied ? 'permission-denied' : 'device-error',
        message: isPermissionDenied
          ? 'Microphone permission was denied or blocked.'
          : err?.message || 'Could not access microphone.',
        actionableHint: isPermissionDenied
          ? 'Please click the lock/camera icon in your browser address bar to allow microphone access, or try sample voice presets below.'
          : 'Please check your microphone connection and browser settings.',
      });
      return false;
    }

    // 2. Set up AudioContext Analyser for real-time live volume meters
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && this.mediaStream) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.5;
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!this.analyser || this.state !== 'recording') return;
          this.analyser.getByteFrequencyData(dataArray);

          // Calculate average RMS
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          // Normalize to 0 - 100
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          this.callbacks.onVolumeChange?.(normalized);

          this.animFrameId = requestAnimationFrame(checkVolume);
        };

        this.animFrameId = requestAnimationFrame(checkVolume);
      }
    } catch (e) {
      console.warn('[SpeechAudioEngine] Audio visualizer setup notice:', e);
    }

    // 3. Set up MediaRecorder for lossless voice recording
    try {
      const MediaRec = (window as any).MediaRecorder;
      if (MediaRec && this.mediaStream) {
        // Pick best supported mimeType
        const supportedTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/wav',
        ];
        this.chosenMimeType =
          supportedTypes.find((t) => MediaRec.isTypeSupported && MediaRec.isTypeSupported(t)) ||
          'audio/webm';

        this.mediaRecorder = new MediaRec(this.mediaStream, {
          mimeType: this.chosenMimeType,
        });

        this.mediaRecorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        // Record chunks with stable 1000ms slices to prevent incomplete headers
        this.mediaRecorder.start(1000);
      }
    } catch (recErr) {
      console.warn('[SpeechAudioEngine] MediaRecorder setup notice:', recErr);
    }

    // 4. Set up Web Speech API (if supported) for instant interim on-screen typing
    try {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRec) {
        const recognition = new SpeechRec();
        this.speechRecognition = recognition;
        const langTag = getVoiceRecognitionLang(language);
        recognition.lang = langTag;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const combined = (final || interim).trim();
          if (combined) {
            this.capturedTranscript = combined;
            this.callbacks.onInterimText?.(combined);
            if (final.trim()) {
              this.callbacks.onFinalText?.(final.trim());
            }
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('[SpeechAudioEngine] Web Speech notice:', err?.error || err);
          // If language is not supported, attempt fallback
          if (err?.error === 'language-not-supported') {
            const fallbacks = getVoiceRecognitionFallbacks(language);
            const next = fallbacks.find((f) => f !== recognition.lang);
            if (next) {
              try {
                recognition.lang = next;
                recognition.start();
                return;
              } catch (_) {}
            }
          }
          // Do not kill session; MediaRecorder is continuing in parallel!
        };

        recognition.onend = () => {
          // If we are still in recording state, attempt to keep Web Speech alive
          if (this.state === 'recording' && this.speechRecognition) {
            try {
              this.speechRecognition.start();
            } catch (_) {}
          }
        };

        recognition.start();
      }
    } catch (speechErr) {
      console.warn('[SpeechAudioEngine] SpeechRecognition start notice:', speechErr);
    }

    this.updateState('recording');
    return true;
  }

  /**
   * Stop speech capture, finalize audio recording, and process transcription
   */
  public async stop(): Promise<SpeechEngineResult> {
    if (this.state !== 'recording' && this.state !== 'requesting') {
      return {
        transcript: this.capturedTranscript,
        source: 'webspeech',
      };
    }

    this.updateState('transcribing');

    // Stop animation frame
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Stop Web Speech Recognition
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (_) {}
      this.speechRecognition = null;
    }

    // Stop MediaRecorder and collect all final audio chunks
    let finalAudioBlob: Blob | null = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      finalAudioBlob = await new Promise<Blob | null>((resolve) => {
        this.mediaRecorder.onstop = () => {
          try {
            const blob = new Blob(this.audioChunks, { type: this.chosenMimeType });
            resolve(blob);
          } catch (e) {
            console.warn('Error creating audio blob:', e);
            resolve(null);
          }
        };
        try {
          if (this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.requestData();
          }
          this.mediaRecorder.stop();
        } catch (e) {
          resolve(null);
        }
      });
    }

    // Stop all media tracks to release the microphone device cleanly
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      this.mediaStream = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (_) {}
      this.audioContext = null;
      this.analyser = null;
    }

    this.callbacks.onVolumeChange?.(0);

    // If we have an audio blob or a captured transcript, transcribe/extract with Gemini
    const hasAudio = finalAudioBlob && finalAudioBlob.size > 200;
    const hasText = Boolean(this.capturedTranscript && this.capturedTranscript.trim().length > 0);

    if (hasAudio || hasText) {
      try {
        const base64Audio = hasAudio ? await blobToBase64(finalAudioBlob) : '';
        const geminiResult = await transcribeAudioWithGemini(
          base64Audio,
          this.chosenMimeType,
          this.currentLanguage,
          this.capturedTranscript
        );

        if (geminiResult && (geminiResult.transcript || geminiResult.chiefComplaint)) {
          this.capturedTranscript = geminiResult.transcript || this.capturedTranscript;
          this.updateState('idle');
          return {
            ...geminiResult,
            rawAudioBlob: finalAudioBlob || undefined,
          };
        }
      } catch (geminiErr) {
        console.warn('[SpeechAudioEngine] Gemini audio transcription notice:', geminiErr);
      }
    }

    // Fallback to Web Speech transcript if available
    this.updateState('idle');
    return {
      transcript: this.capturedTranscript,
      source: 'webspeech',
      rawAudioBlob: finalAudioBlob || undefined,
    };
  }

  /**
   * Immediately abort and cleanup without processing
   */
  public abort() {
    this.updateState('idle');

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.abort();
      } catch (_) {}
      this.speechRecognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
      this.analyser = null;
    }

    this.callbacks.onVolumeChange?.(0);
    this.audioChunks = [];
  }

  private updateState(newState: 'idle' | 'requesting' | 'recording' | 'transcribing') {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }
}

/**
 * Convert Blob to raw base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Send audio base64 to server-side Gemini audio transcription endpoint
 */
export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType: string,
  language: LanguageCode,
  fallbackTranscript?: string
): Promise<SpeechEngineResult> {
  try {
    const response = await fetch('/api/transcribe-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        mimeType,
        language,
        fallbackTranscript: fallbackTranscript || '',
      }),
    });

    if (!response.ok) {
      console.warn(`[SpeechEngine] Server returned ${response.status}, utilizing local speech transcript`);
      return {
        transcript: fallbackTranscript || '',
        englishTranslation: fallbackTranscript || '',
        detectedLanguage: language,
        source: 'webspeech',
        confidence: 0.85,
      };
    }

    const json = await response.json();
    const data = json.data || {};

    return {
      transcript: data.transcript || fallbackTranscript || '',
      englishTranslation: data.englishTranslation || fallbackTranscript || '',
      detectedLanguage: data.detectedLanguage || language,
      chiefComplaint: data.chiefComplaint || '',
      duration: data.duration || '',
      location: data.location || '',
      triggers: data.triggers || '',
      associations: data.associations || '',
      redFlagDetected: Boolean(data.redFlagDetected),
      redFlagReason: data.redFlagReason || null,
      confidence: data.confidence || 0.92,
      source: (json.source as any) || 'gemini-audio',
    };
  } catch (err) {
    console.warn('[SpeechEngine] Notice calling transcribe-audio, continuing with speech transcript:', err);
    return {
      transcript: fallbackTranscript || '',
      englishTranslation: fallbackTranscript || '',
      detectedLanguage: language,
      source: 'webspeech',
      confidence: 0.85,
    };
  }
}
