import { useState, useRef, useEffect, useCallback } from 'react';
import { LanguageCode } from '../types';
import {
  getVoiceLangByCode,
  buildAutoDetectCandidates,
  SpeechLanguageDefinition,
} from '../config/speechLanguageConfig';
import {
  startAudioCapture,
  blobToBase64,
  AudioCaptureController,
} from '../utils/audioCapture';
import {
  apiCreateSpeechSession,
  apiTranscribeAudio,
  apiConfirmSpeechTranscript,
  TranscribeResponse,
} from '../lib/speechApi';

export type SpeechSessionState =
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'ready_for_review'
  | 'completed'
  | 'error';

export interface UseSpeechSessionOptions {
  languageCode: LanguageCode;
  isAutoDetect?: boolean;
  caseId?: string;
  questionId?: string;
  onTranscriptConfirmed?: (confirmedText: string, metadata?: any) => void;
  onError?: (errorMessage: string) => void;
}

export function useSpeechSession(options: UseSpeechSessionOptions) {
  const { languageCode, isAutoDetect = false, caseId, questionId, onTranscriptConfirmed, onError } = options;

  const [state, setState] = useState<SpeechSessionState>('idle');
  const [volume, setVolume] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [engineUsed, setEngineUsed] = useState<string>('');

  const captureControllerRef = useRef<AudioCaptureController | null>(null);
  const activeSocketRef = useRef<WebSocket | null>(null);
  const activeLangRef = useRef<SpeechLanguageDefinition>(getVoiceLangByCode(languageCode));

  useEffect(() => {
    activeLangRef.current = getVoiceLangByCode(languageCode);
  }, [languageCode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (captureControllerRef.current) {
        captureControllerRef.current.cancel();
      }
      if (activeSocketRef.current) {
        activeSocketRef.current.close();
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    setErrorMessage(null);
    setInterimTranscript('');
    setFinalTranscript('');
    setRawTranscript('');
    setVolume(0);
    setState('requesting_permission');

    const voiceLang = activeLangRef.current;
    const candidateLanguages = buildAutoDetectCandidates(voiceLang.code);

    try {
      // 1. Initialize audio capture
      const controller = await startAudioCapture({
        timeSliceMs: 600,
        silenceTimeoutMs: 3500, // natural conversational pause tolerance
        onVolumeChange: (vol) => {
          setVolume(vol);
        },
        onSilenceTimeout: () => {
          // Patient finished speaking naturally
          stopListening();
        },
        onError: (err) => {
          setErrorMessage(err.message);
          setState('error');
          if (onError) onError(err.message);
        },
      });

      captureControllerRef.current = controller;
      setState('connecting');

      // 2. Create validated speech session on backend
      let sessionData: any = null;
      try {
        sessionData = await apiCreateSpeechSession({
          languageCode: voiceLang.googleLanguageCode,
          candidateLanguages: isAutoDetect ? candidateLanguages : undefined,
          isAutoDetect,
          caseId,
        });
        setSessionId(sessionData.sessionId);
      } catch (sessErr: any) {
        console.warn('[SpeechSession] Session pre-auth notice:', sessErr.message);
      }

      // 3. Connect to streaming WebSocket for live interim transcription
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/speech/stream`;
        const ws = new WebSocket(wsUrl);
        activeSocketRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'config',
              sessionId: sessionData?.sessionId,
              languageCode: voiceLang.googleLanguageCode,
              candidateLanguages: isAutoDetect ? candidateLanguages : undefined,
              isAutoDetect,
              mimeType: controller.getMimeType(),
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'interim') {
              setInterimTranscript(data.interimTranscript || '');
              if (data.detectedLanguage) {
                setDetectedLanguage(data.detectedLanguage);
              }
            } else if (data.type === 'final') {
              setFinalTranscript(data.finalTranscript || '');
              setRawTranscript(data.rawTranscript || data.finalTranscript || '');
              if (data.detectedLanguage) {
                setDetectedLanguage(data.detectedLanguage);
              }
            }
          } catch {}
        };

        ws.onerror = (e) => {
          console.warn('[SpeechSession] Streaming WebSocket notice:', e);
        };
      } catch (wsErr) {
        console.warn('[SpeechSession] Live streaming socket unavailable, will use batch transcription:', wsErr);
      }

      setState('listening');
    } catch (err: any) {
      const msg = err.message || 'Failed to start microphone.';
      setErrorMessage(msg);
      setState('error');
      if (onError) onError(msg);
    }
  }, [isAutoDetect, caseId, onError]);

  const stopListening = useCallback(async () => {
    if (!captureControllerRef.current) return;
    setState('processing');

    const controller = captureControllerRef.current;
    captureControllerRef.current = null;

    try {
      const { fullAudioBlob, mimeType } = await controller.stop();

      // Close streaming socket if open
      if (activeSocketRef.current) {
        if (activeSocketRef.current.readyState === WebSocket.OPEN) {
          activeSocketRef.current.send(JSON.stringify({ type: 'finish' }));
        }
        activeSocketRef.current.close();
        activeSocketRef.current = null;
      }

      if (!fullAudioBlob || fullAudioBlob.size === 0) {
        setErrorMessage('No speech audio was captured. Please speak closer to the microphone.');
        setState('error');
        return;
      }

      // Convert audio to Base64 for Google Cloud Speech V2 transcribe endpoint
      const audioBase64 = await blobToBase64(fullAudioBlob);
      const voiceLang = activeLangRef.current;
      const candidateLanguages = buildAutoDetectCandidates(voiceLang.code);

      const result: TranscribeResponse = await apiTranscribeAudio({
        sessionId: sessionId || undefined,
        audioBase64,
        mimeType,
        languageCode: voiceLang.googleLanguageCode,
        candidateLanguages: isAutoDetect ? candidateLanguages : undefined,
        isAutoDetect,
        caseId,
      });

      const finalNormalized = result.normalizedTranscript || result.rawTranscript || '';
      if (!finalNormalized) {
        setErrorMessage("We couldn't hear a clear response. Please try speaking again.");
        setState('error');
        return;
      }

      setFinalTranscript(finalNormalized);
      setRawTranscript(result.rawTranscript || finalNormalized);
      setDetectedLanguage(result.detectedLanguage || voiceLang.googleLanguageCode);
      setEngineUsed(result.engineUsed);
      setState('ready_for_review');
    } catch (err: any) {
      const msg = err.message || 'Speech recognition failed.';
      setErrorMessage(msg);
      setState('error');
      if (onError) onError(msg);
    }
  }, [sessionId, isAutoDetect, caseId, onError]);

  const cancelRecording = useCallback(() => {
    if (captureControllerRef.current) {
      captureControllerRef.current.cancel();
      captureControllerRef.current = null;
    }
    if (activeSocketRef.current) {
      activeSocketRef.current.close();
      activeSocketRef.current = null;
    }
    setVolume(0);
    setInterimTranscript('');
    setFinalTranscript('');
    setRawTranscript('');
    setErrorMessage(null);
    setState('idle');
  }, []);

  const confirmTranscript = useCallback(
    async (approvedText: string) => {
      const cleanApproved = (approvedText || finalTranscript).trim();
      if (!cleanApproved) return;

      setState('processing');
      try {
        const confirmResult = await apiConfirmSpeechTranscript({
          sessionId: sessionId || undefined,
          caseId,
          questionId,
          rawTranscript,
          patientConfirmedTranscript: cleanApproved,
          languageCode: activeLangRef.current.googleLanguageCode,
          detectedLanguage,
        });

        setState('completed');
        if (onTranscriptConfirmed) {
          onTranscriptConfirmed(cleanApproved, confirmResult);
        }
      } catch (err: any) {
        console.warn('[SpeechSession] Confirmation error:', err.message);
        // Even if network error on confirmation, still hand off the approved text to patient intake
        setState('completed');
        if (onTranscriptConfirmed) {
          onTranscriptConfirmed(cleanApproved);
        }
      }
    },
    [finalTranscript, rawTranscript, sessionId, caseId, questionId, detectedLanguage, onTranscriptConfirmed]
  );

  return {
    state,
    volume,
    interimTranscript,
    finalTranscript,
    rawTranscript,
    detectedLanguage,
    errorMessage,
    engineUsed,
    activeVoiceLang: activeLangRef.current,
    startListening,
    stopListening,
    cancelRecording,
    confirmTranscript,
    setFinalTranscript,
  };
}
