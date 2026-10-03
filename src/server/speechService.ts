import { v2 } from '@google-cloud/speech';
import { GoogleGenAI } from '@google/genai';
import { buildSpeechAdaptationConfig } from './speechVocabulary';
import { processRawTranscript, ProcessedTranscriptResult } from './transcriptPipeline';

export interface SpeechHealthStatus {
  status: 'ok' | 'degraded' | 'error';
  primaryEngine: 'google_cloud_speech_v2_chirp_3';
  googleCloudSpeechV2Enabled: boolean;
  model: string;
  region: string;
  projectId: string | null;
  hasCredentials: boolean;
  fallbackEngineReady: boolean;
  timestamp: string;
  message: string;
}

export interface SpeechRecognitionResult extends ProcessedTranscriptResult {
  engineUsed: 'google_cloud_speech_v2_chirp_3' | 'gemini_multimodal_audio_fallback';
  modelUsed: string;
  durationMs: number;
  isFallback: boolean;
}

// Global cached SpeechClient instance
let cachedSpeechClient: any = null;
let lastHealthCheck: { time: number; data: SpeechHealthStatus } | null = null;

function getSpeechRegion(): string {
  return process.env.GOOGLE_SPEECH_REGION || 'us';
}

function getSpeechModel(): string {
  return process.env.GOOGLE_SPEECH_MODEL || 'chirp_3';
}

/**
 * Initializes or returns the cached Google Cloud Speech V2 SpeechClient.
 */
export function getGoogleSpeechClient() {
  if (cachedSpeechClient) return cachedSpeechClient;

  const region = getSpeechRegion();
  const endpoint = `${region}-speech.googleapis.com`;

  try {
    cachedSpeechClient = new v2.SpeechClient({
      apiEndpoint: endpoint,
    });
    return cachedSpeechClient;
  } catch (err: any) {
    console.error('[SpeechService] Failed to initialize Google SpeechClient:', err.message);
    return null;
  }
}

/**
 * Perform active health check on Google Cloud Speech-to-Text V2 infrastructure.
 */
export async function checkSpeechHealth(): Promise<SpeechHealthStatus> {
  const now = Date.now();
  if (lastHealthCheck && now - lastHealthCheck.time < 30000) {
    return lastHealthCheck.data;
  }

  const region = getSpeechRegion();
  const model = getSpeechModel();
  const client = getGoogleSpeechClient();
  let projectId: string | null = null;
  let speechV2Enabled = false;
  let hasCredentials = false;
  let healthMessage = 'Speech system operational';

  if (client) {
    try {
      projectId = await client.getProjectId();
      hasCredentials = true;

      // Probe recognizers in the configured region to verify API enablement
      const parent = `projects/${projectId}/locations/${region}`;
      await client.listRecognizers({ parent, pageSize: 1 });
      speechV2Enabled = true;
      healthMessage = `Google Cloud Speech-to-Text V2 (${model}) active in region ${region}.`;
    } catch (err: any) {
      const errStr = err.message || '';
      if (errStr.includes('PERMISSION_DENIED') || errStr.includes('has not been used in project') || errStr.includes('disabled')) {
        healthMessage = 'Google Cloud Speech API is pending enablement in GCP project. Gemini Multimodal Audio fallback is active.';
      } else {
        healthMessage = `Google Speech probe notice: ${errStr.slice(0, 120)}`;
      }
    }
  } else {
    healthMessage = 'Google SpeechClient could not be initialized.';
  }

  const fallbackEngineReady = !!process.env.GEMINI_API_KEY;

  const status: SpeechHealthStatus = {
    status: speechV2Enabled ? 'ok' : fallbackEngineReady ? 'degraded' : 'error',
    primaryEngine: 'google_cloud_speech_v2_chirp_3',
    googleCloudSpeechV2Enabled: speechV2Enabled,
    model,
    region,
    projectId: projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || null,
    hasCredentials,
    fallbackEngineReady,
    timestamp: new Date().toISOString(),
    message: healthMessage,
  };

  lastHealthCheck = { time: now, data: status };
  return status;
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text V2 (Chirp 3).
 * If Cloud Speech API is not yet enabled in the Cloud project, it cleanly uses the
 * verified Google Gemini Multimodal Audio fallback without touching browser SpeechRecognition.
 */
export async function transcribeAudioBuffer(params: {
  audioBuffer: Buffer;
  mimeType: string;
  languageCode: string; // e.g. 'hi-IN', 'en-IN', 'te-IN'
  candidateLanguages?: string[];
  isAutoDetect?: boolean;
}): Promise<SpeechRecognitionResult> {
  const startTime = Date.now();
  const { audioBuffer, mimeType, languageCode, candidateLanguages, isAutoDetect } = params;

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('SPEECH_EMPTY_AUDIO: No audio data received for transcription.');
  }

  const region = getSpeechRegion();
  const model = getSpeechModel();
  const client = getGoogleSpeechClient();

  const languageCodes = isAutoDetect && candidateLanguages && candidateLanguages.length > 0
    ? candidateLanguages.slice(0, 3) // Max 3 candidate languages per Google documentation
    : [languageCode || 'hi-IN'];

  // Attempt Primary Engine: Google Cloud Speech-to-Text V2 with Chirp 3
  if (client) {
    try {
      const projectId = await client.getProjectId();
      const parent = `projects/${projectId}/locations/${region}`;
      const adaptationConfig = buildSpeechAdaptationConfig();

      const request = {
        recognizer: `projects/${projectId}/locations/${region}/recognizers/_`,
        config: {
          model,
          languageCodes,
          autoDecodingConfig: {},
          features: {
            enableAutomaticPunctuation: true,
          },
          adaptation: adaptationConfig,
        },
        content: audioBuffer.toString('base64'),
      };

      const [response] = await client.recognize(request);

      if (response && response.results && response.results.length > 0) {
        let rawTranscript = '';
        let detectedLanguage = languageCodes[0];
        let totalConfidence = 0;
        let altCount = 0;

        for (const result of response.results) {
          if (result.languageCode) {
            detectedLanguage = result.languageCode;
          }
          if (result.alternatives && result.alternatives[0]) {
            const alt = result.alternatives[0];
            rawTranscript += (rawTranscript ? ' ' : '') + (alt.transcript || '');
            if (typeof alt.confidence === 'number') {
              totalConfidence += alt.confidence;
              altCount++;
            }
          }
        }

        const avgConfidence = altCount > 0 ? totalConfidence / altCount : undefined;
        const processed = processRawTranscript(rawTranscript, detectedLanguage, avgConfidence);

        return {
          ...processed,
          engineUsed: 'google_cloud_speech_v2_chirp_3',
          modelUsed: model,
          durationMs: Date.now() - startTime,
          isFallback: false,
        };
      }
    } catch (err: any) {
      console.warn('[SpeechService] Google Speech V2 call bypassed, engaging verified fallback:', err.message);
    }
  }

  // Fallback Engine: Google Gemini 3.8 Flash Multimodal Audio (Server-Side)
  // Ensures patient speech is transcribed reliably without browser SpeechRecognition
  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({});
    const base64Audio = audioBuffer.toString('base64');
    const safeMime = mimeType.includes('wav') ? 'audio/wav' : mimeType.includes('mp4') ? 'audio/mp4' : 'audio/webm';

    const prompt = `You are a clinical speech-to-text audio transcription engine for an Indian hospital kiosk (All India Institute of Ayurveda).
Target expected language: ${languageCode} (${isAutoDetect ? 'Auto-detect between ' + languageCodes.join(', ') : 'Strict mode'}).

Task:
1. Accurately transcribe what the speaker said word-for-word in the native spoken script.
2. If the speaker uses Hinglish or mixed language (e.g. Hindi + English medical terms like 'chest pain', 'bp', 'fever', 'tablet'), PRESERVE THE SPOKEN WORDS AS SAID. Do NOT translate!
3. If speaking in Hindi, write in Devanagari script.
4. If speaking in Telugu, write in Telugu script.
5. If speaking in English, write in English.
6. Return JSON ONLY with this exact format:
{
  "transcript": "exact transcription",
  "detectedLanguage": "${languageCode}",
  "confidenceScore": 0.95
}
Do not add markdown formatting or commentary. Return ONLY the JSON object.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: safeMime,
                data: base64Audio,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text ? response.text.trim() : '';
    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // In case output wasn't strict JSON
      parsed = { transcript: responseText.replace(/```json|```/g, '').trim() };
    }

    const rawTranscript = parsed.transcript || '';
    const detectedLanguage = parsed.detectedLanguage || languageCode;
    const confidenceScore = parsed.confidenceScore || 0.95;

    const processed = processRawTranscript(rawTranscript, detectedLanguage, confidenceScore);

    return {
      ...processed,
      engineUsed: 'gemini_multimodal_audio_fallback',
      modelUsed: 'gemini-3.8-flash-multimodal',
      durationMs: Date.now() - startTime,
      isFallback: true,
    };
  }

  throw new Error('SPEECH_SERVICE_UNAVAILABLE: Neither Google Cloud Speech V2 nor Gemini Audio engine could process the audio.');
}
