import { LanguageCode } from '../types';

export interface SpeechLanguageDefinition {
  id: string; // e.g. 'hi-IN'
  code: LanguageCode; // e.g. 'hi'
  displayName: string; // e.g. 'Hindi'
  nativeName: string; // e.g. 'हिन्दी'
  googleLanguageCode: string; // BCP-47 e.g. 'hi-IN'
  model: 'chirp_3' | 'chirp' | 'long' | 'short';
  region: string; // e.g. 'us'
  status: 'ga' | 'preview';
  autoDetectionSupported: boolean;
  streamingSupported: boolean;
  adaptationSupported: boolean;
  enabled: boolean;
  flag: string;
}

/**
 * Centralized Single Source of Truth for Voice Recognition Languages.
 * Maps every language supported in MediKiosk to its verified Google Speech-to-Text V2 (Chirp 3) configuration.
 */
export const SUPPORTED_VOICE_LANGUAGES: SpeechLanguageDefinition[] = [
  {
    id: 'hi-IN',
    code: 'hi',
    displayName: 'Hindi',
    nativeName: 'हिन्दी',
    googleLanguageCode: 'hi-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'ga',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'en-IN',
    code: 'en',
    displayName: 'English (India)',
    nativeName: 'English (India)',
    googleLanguageCode: 'en-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'ga',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'te-IN',
    code: 'te',
    displayName: 'Telugu',
    nativeName: 'తెలుగు',
    googleLanguageCode: 'te-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'ga',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'bn-IN',
    code: 'bn',
    displayName: 'Bengali',
    nativeName: 'বাংলা',
    googleLanguageCode: 'bn-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'preview',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'mr-IN',
    code: 'mr',
    displayName: 'Marathi',
    nativeName: 'मराठी',
    googleLanguageCode: 'mr-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'preview',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'gu-IN',
    code: 'gu',
    displayName: 'Gujarati',
    nativeName: 'ગુજરાતી',
    googleLanguageCode: 'gu-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'preview',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'ta-IN',
    code: 'ta',
    displayName: 'Tamil',
    nativeName: 'தமிழ்',
    googleLanguageCode: 'ta-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'ga',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'kn-IN',
    code: 'kn',
    displayName: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    googleLanguageCode: 'kn-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'preview',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'ml-IN',
    code: 'ml',
    displayName: 'Malayalam',
    nativeName: 'മലയാളം',
    googleLanguageCode: 'ml-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'preview',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'pa-Guru-IN',
    code: 'pa',
    displayName: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    googleLanguageCode: 'pa-Guru-IN',
    model: 'chirp_3',
    region: 'us',
    status: 'preview',
    autoDetectionSupported: true,
    streamingSupported: true,
    adaptationSupported: true,
    enabled: true,
    flag: '🇮🇳',
  },
];

/**
 * Lookup language definition by application LanguageCode (e.g. 'hi')
 */
export function getVoiceLangByCode(code: LanguageCode): SpeechLanguageDefinition {
  const found = SUPPORTED_VOICE_LANGUAGES.find((lang) => lang.code === code);
  return (
    found ||
    SUPPORTED_VOICE_LANGUAGES.find((lang) => lang.code === 'hi') ||
    SUPPORTED_VOICE_LANGUAGES[0]
  );
}

/**
 * Lookup language definition by Google BCP-47 language code (e.g. 'hi-IN')
 */
export function getVoiceLangByGoogleCode(googleCode: string): SpeechLanguageDefinition | undefined {
  return SUPPORTED_VOICE_LANGUAGES.find(
    (lang) => lang.googleLanguageCode.toLowerCase() === googleCode.toLowerCase()
  );
}

/**
 * Construct a safe, small candidate list for Automatic Language Detection.
 * Per Google Speech V2 documentation, candidate lists should be kept small (max 2-3)
 * for optimal recognition accuracy. Never pass the entire application language list.
 */
export function buildAutoDetectCandidates(primaryCode: LanguageCode): string[] {
  const primaryLang = getVoiceLangByCode(primaryCode);
  const candidates: string[] = [primaryLang.googleLanguageCode];

  // For Indian clinical kiosk contexts, English (India) is the standard alternate for code-switching/Hinglish
  if (primaryLang.googleLanguageCode !== 'en-IN') {
    candidates.push('en-IN');
  } else {
    // If English is primary, add Hindi as secondary
    candidates.push('hi-IN');
  }

  // Maximum 2 candidates for high accuracy
  return candidates;
}
