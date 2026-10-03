import { getStoredToken } from './api';
import { SpeechLanguageDefinition } from '../config/speechLanguageConfig';

export interface SpeechHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  primaryEngine: string;
  googleCloudSpeechV2Enabled: boolean;
  model: string;
  region: string;
  projectId: string | null;
  hasCredentials: boolean;
  fallbackEngineReady: boolean;
  timestamp: string;
  message: string;
}

export interface TranscribeResponse {
  success: boolean;
  rawTranscript: string;
  normalizedTranscript: string;
  detectedLanguage?: string;
  confidenceScore?: number;
  wordCount: number;
  containsAyurvedicTerms: boolean;
  detectedAyurvedicTerms: string[];
  engineUsed: string;
  modelUsed: string;
  durationMs: number;
  isFallback: boolean;
  requiresConfirmation: boolean;
  error?: string;
}

export interface ConfirmSpeechResponse {
  success: boolean;
  patientConfirmedTranscript: string;
  rawTranscript: string;
  clinicalExtraction?: {
    symptoms: string[];
    duration: string | null;
    location: string | null;
    severity: string | null;
    medications: string[];
    previousOccurrence: string | null;
    ayurvedicCorrelations: string[];
  };
  error?: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token;
  }
  return headers;
}

/**
 * Check Google Speech V2 backend health status.
 */
export async function apiCheckSpeechHealth(): Promise<SpeechHealthResponse> {
  const res = await fetch('/api/speech/health');
  if (!res.ok) {
    throw new Error(`Speech health check failed (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch supported voice languages with real backend capability status.
 */
export async function apiGetSpeechLanguages(): Promise<{ languages: SpeechLanguageDefinition[] }> {
  const res = await fetch('/api/speech/languages');
  if (!res.ok) {
    throw new Error(`Failed to load speech languages (${res.status})`);
  }
  return res.json();
}

/**
 * Create a validated speech session.
 */
export async function apiCreateSpeechSession(params: {
  languageCode: string;
  candidateLanguages?: string[];
  isAutoDetect?: boolean;
  caseId?: string;
}): Promise<{ success: boolean; sessionId: string; languageCode: string; status: string }> {
  const res = await fetch('/api/speech/session', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create speech session.');
  }
  return data;
}

/**
 * Transcribe recorded audio buffer via Google Speech-to-Text V2.
 */
export async function apiTranscribeAudio(params: {
  sessionId?: string;
  audioBase64: string;
  mimeType: string;
  languageCode: string;
  candidateLanguages?: string[];
  isAutoDetect?: boolean;
  caseId?: string;
}): Promise<TranscribeResponse> {
  const res = await fetch('/api/speech/transcribe', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Speech transcription failed.');
  }
  return data;
}

/**
 * Confirm patient-approved or patient-edited transcript and trigger clinical extraction.
 */
export async function apiConfirmSpeechTranscript(params: {
  sessionId?: string;
  caseId?: string;
  questionId?: string;
  rawTranscript: string;
  patientConfirmedTranscript: string;
  languageCode: string;
  detectedLanguage?: string;
}): Promise<ConfirmSpeechResponse> {
  const res = await fetch('/api/speech/confirm', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to confirm transcript.');
  }
  return data;
}
