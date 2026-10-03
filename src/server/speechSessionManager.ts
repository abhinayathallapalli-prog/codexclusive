import crypto from 'crypto';

export type SpeechSessionStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface SpeechSession {
  sessionId: string;
  userId: string;
  caseId?: string;
  languageCode: string;
  candidateLanguages?: string[];
  isAutoDetect: boolean;
  status: SpeechSessionStatus;
  startedAt: number;
  lastActivityAt: number;
  audioChunks: Buffer[];
  totalBytes: number;
  interimTranscript: string;
  finalTranscript: string;
  patientConfirmedTranscript?: string;
  normalizedTranscript?: string;
  detectedLanguage?: string;
  error?: string;
}

// In-memory sessions map
const activeSessions = new Map<string, SpeechSession>();

// Rate-limiting map: userId -> timestamps array
const userRequestCounts = new Map<string, number[]>();

const MAX_SESSION_DURATION_MS = 120 * 1000; // 2 minutes max recording
const MAX_AUDIO_BYTES_PER_SESSION = 25 * 1024 * 1024; // 25 MB max
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

/**
 * Clean up expired sessions periodically.
 */
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastActivityAt > 5 * 60 * 1000) {
      activeSessions.delete(id);
    }
  }
}, 60 * 1000);

export function checkSpeechRateLimit(userId: string): boolean {
  const now = Date.now();
  let timestamps = userRequestCounts.get(userId) || [];
  timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    userRequestCounts.set(userId, timestamps);
    return false;
  }

  timestamps.push(now);
  userRequestCounts.set(userId, timestamps);
  return true;
}

export function createSpeechSession(params: {
  userId: string;
  caseId?: string;
  languageCode: string;
  candidateLanguages?: string[];
  isAutoDetect?: boolean;
}): SpeechSession {
  if (!checkSpeechRateLimit(params.userId)) {
    throw new Error('SPEECH_RATE_LIMIT_EXCEEDED: Too many speech requests. Please wait a moment before trying again.');
  }

  const sessionId = `sp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const session: SpeechSession = {
    sessionId,
    userId: params.userId,
    caseId: params.caseId,
    languageCode: params.languageCode,
    candidateLanguages: params.candidateLanguages,
    isAutoDetect: !!params.isAutoDetect,
    status: 'listening',
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    audioChunks: [],
    totalBytes: 0,
    interimTranscript: '',
    finalTranscript: '',
  };

  activeSessions.set(sessionId, session);
  return session;
}

export function getSpeechSession(sessionId: string): SpeechSession | undefined {
  return activeSessions.get(sessionId);
}

export function appendAudioChunk(sessionId: string, chunk: Buffer): SpeechSession {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('SPEECH_SESSION_NOT_FOUND: Session does not exist or has expired.');
  }

  const now = Date.now();
  if (now - session.startedAt > MAX_SESSION_DURATION_MS) {
    session.status = 'error';
    session.error = 'SPEECH_TIMEOUT: Maximum recording duration of 120 seconds reached.';
    throw new Error(session.error);
  }

  if (session.totalBytes + chunk.length > MAX_AUDIO_BYTES_PER_SESSION) {
    session.status = 'error';
    session.error = 'SPEECH_MAX_AUDIO_EXCEEDED: Maximum audio size exceeded for this session.';
    throw new Error(session.error);
  }

  session.audioChunks.push(chunk);
  session.totalBytes += chunk.length;
  session.lastActivityAt = now;
  return session;
}

export function updateSessionStatus(
  sessionId: string,
  status: SpeechSessionStatus,
  updates?: Partial<SpeechSession>
): SpeechSession {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('SPEECH_SESSION_NOT_FOUND: Session does not exist.');
  }

  session.status = status;
  session.lastActivityAt = Date.now();
  if (updates) {
    Object.assign(session, updates);
  }
  return session;
}

export function finalizeSpeechSessionAudio(sessionId: string): Buffer {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('SPEECH_SESSION_NOT_FOUND: Session does not exist.');
  }

  return Buffer.concat(session.audioChunks);
}

export function deleteSpeechSession(sessionId: string): void {
  activeSessions.delete(sessionId);
}
