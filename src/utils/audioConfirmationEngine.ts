import { LanguageCode } from '../types';
import { speakPrompt, stopSpeech } from './speechHelper';

export interface AudioConfirmationState {
  isSpeaking: boolean;
  text: string;
  language: LanguageCode;
  source: 'gemini-tts' | 'webspeech' | 'chime';
  timestamp: number;
}

// In-memory cache for audio base64 clips to avoid repeat network roundtrips
const audioCache = new Map<string, string>();
let currentAudioElement: HTMLAudioElement | null = null;
let audioContextInstance: AudioContext | null = null;
let currentActiveState: AudioConfirmationState = {
  isSpeaking: false,
  text: '',
  language: 'hi',
  source: 'webspeech',
  timestamp: 0,
};

type AudioStateListener = (state: AudioConfirmationState) => void;
const listeners = new Set<AudioStateListener>();

export function subscribeAudioConfirmation(listener: AudioStateListener): () => void {
  listeners.add(listener);
  listener(currentActiveState);
  return () => {
    listeners.delete(listener);
  };
}

function updateState(newState: Partial<AudioConfirmationState>) {
  currentActiveState = { ...currentActiveState, ...newState };
  listeners.forEach((listener) => {
    try {
      listener(currentActiveState);
    } catch (e) {
      console.warn('[AudioConfirmation] Listener error:', e);
    }
  });

  // Also dispatch window custom event for broad component listening
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('medikiosk-audio-confirmation', {
          detail: currentActiveState,
        })
      );
    } catch (_) {}
  }
}

// Track user interaction state across the kiosk session
let hasUserInteracted = false;

/**
 * Returns whether a verified user gesture (click, tap, keypress) has occurred.
 */
export function hasUserInteractedWithAudio(): boolean {
  return hasUserInteracted;
}

/**
 * Safely initializes and unlocks the Web Audio AudioContext upon user interaction
 * (e.g., clicking on the welcome screen, tapping buttons, or voice recording).
 * This adheres to modern browser autoplay policies and prevents the warning:
 * "The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page."
 */
export function unlockAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  hasUserInteracted = true;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContextInstance || audioContextInstance.state === 'closed') {
      audioContextInstance = new AudioContextClass();
    }

    if (audioContextInstance && audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch((err) => {
        // Log quietly if browser gesture stack was not ready
        console.warn('[AudioConfirmation] AudioContext resume notice:', err?.message || err);
      });
    }

    return audioContextInstance;
  } catch (err) {
    console.warn('[AudioConfirmation] AudioContext unlock notice:', err);
    return null;
  }
}

// Global one-time passive gesture listeners to automatically unlock AudioContext on earliest user interaction
if (typeof window !== 'undefined') {
  const handleUserGesture = () => {
    unlockAudioContext();
    window.removeEventListener('click', handleUserGesture, true);
    window.removeEventListener('touchstart', handleUserGesture, true);
    window.removeEventListener('pointerdown', handleUserGesture, true);
    window.removeEventListener('keydown', handleUserGesture, true);
  };

  window.addEventListener('click', handleUserGesture, { capture: true, once: true, passive: true });
  window.addEventListener('touchstart', handleUserGesture, { capture: true, once: true, passive: true });
  window.addEventListener('pointerdown', handleUserGesture, { capture: true, once: true, passive: true });
  window.addEventListener('keydown', handleUserGesture, { capture: true, once: true, passive: true });
}

/**
 * Synthesizes an instantaneous, soft medical chime (two warm harmonic tones: C5 523Hz & E5 659Hz)
 * to give immediate auditory confirmation to low-literacy patients that their touch or scan was registered.
 * Strictly checks that a user gesture has occurred or AudioContext is active to avoid autoplay policy errors.
 */
export function playConfirmationChime(volume = 0.18): void {
  if (typeof window === 'undefined') return;

  // STRICT GUARD: Do not attempt to create or resume AudioContext if user hasn't interacted yet.
  if (!hasUserInteracted && (!audioContextInstance || audioContextInstance.state !== 'running')) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextInstance || audioContextInstance.state === 'closed') {
      audioContextInstance = new AudioContextClass();
    }
    const ctx = audioContextInstance;
    if (ctx.state === 'suspended') {
      if (hasUserInteracted) {
        ctx.resume().catch(() => {});
      }
      if (ctx.state === 'suspended') {
        return;
      }
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.12); // subtle slide to D5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now + 0.04); // E5

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.04);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  } catch (err) {
    console.warn('[AudioConfirmation] Chime synthesis notice:', err);
  }
}

/**
 * Immediately cancel any active audio playback or speech synthesis
 */
export function stopAudioConfirmation(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch (_) {}
    currentAudioElement = null;
  }
  stopSpeech();
  updateState({ isSpeaking: false });
}

export interface PlayConfirmationOptions {
  text: string;
  language?: LanguageCode;
  audioEnabled?: boolean;
  voice?: 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir';
  skipChime?: boolean;
  onEnd?: () => void;
}

/**
 * Main Text-to-Speech Engine for Patient Audio Confirmations.
 * Combines:
 * 1. Immediate haptic chime for low-latency feedback
 * 2. High-fidelity Gemini 3.8 Flash Lite TTS natural voice audio
 * 3. Offline/in-browser Web Speech API fallback
 * 4. Active state broadcasts for low-literacy visual audio indicators
 */
export async function playAudioConfirmation(options: PlayConfirmationOptions): Promise<boolean> {
  const {
    text,
    language = 'hi',
    audioEnabled = true,
    voice = 'Kore',
    skipChime = false,
    onEnd,
  } = options;

  if (!audioEnabled || !text || !text.trim()) {
    return false;
  }

  // 1. Cancel previous speech so the confirmation is instant and not queued behind old prompts
  stopAudioConfirmation();

  // 2. Play soft chime first (unless explicitly skipped)
  if (!skipChime) {
    playConfirmationChime();
  }

  const cleanText = text.trim();
  const cacheKey = `${language}:${voice}:${cleanText}`;

  // Broadcast speaking start
  updateState({
    isSpeaking: true,
    text: cleanText,
    language,
    source: 'gemini-tts',
    timestamp: Date.now(),
  });

  // 3. Check memory cache for pre-generated audio
  if (audioCache.has(cacheKey)) {
    const cachedData = audioCache.get(cacheKey)!;
    return playBase64WavAudio(cachedData, onEnd);
  }

  // 4. Attempt server-side Gemini 3.8 Flash Lite TTS
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        language,
        voice,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.audioBase64) {
        audioCache.set(cacheKey, data.audioBase64);
        return playBase64WavAudio(data.audioBase64, onEnd);
      }
    }
  } catch (netErr) {
    console.warn('[AudioConfirmation] Notice connecting to /api/tts:', netErr);
  }

  // 5. Fallback to browser Web Speech API
  updateState({ source: 'webspeech' });
  const spoken = speakPrompt(cleanText, language);
  if (spoken) {
    // Web speech ends estimation
    const words = cleanText.split(/\s+/).length;
    const estDurationMs = Math.max(1200, words * 380);
    setTimeout(() => {
      updateState({ isSpeaking: false });
      onEnd?.();
    }, estDurationMs);
    return true;
  } else {
    updateState({ isSpeaking: false });
    return false;
  }
}

function playBase64WavAudio(base64Data: string, onEnd?: () => void): boolean {
  try {
    const audioUrl = `data:audio/wav;base64,${base64Data}`;
    const audio = new Audio(audioUrl);
    currentAudioElement = audio;

    audio.onended = () => {
      currentAudioElement = null;
      updateState({ isSpeaking: false });
      onEnd?.();
    };

    audio.onerror = (e) => {
      console.warn('[AudioConfirmation] Audio element error, resetting:', e);
      currentAudioElement = null;
      updateState({ isSpeaking: false });
      onEnd?.();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[AudioConfirmation] Audio play prevented (autoplay policy):', err);
        updateState({ isSpeaking: false });
        onEnd?.();
      });
    }

    return true;
  } catch (err) {
    console.warn('[AudioConfirmation] Failed to play audio clip:', err);
    updateState({ isSpeaking: false });
    return false;
  }
}

/**
 * Pre-defined localized audio confirmation templates for low-literacy intake workflows
 */
export const INTAKE_AUDIO_CONFIRMATIONS = {
  // 1. Language Selected
  languageSelected: (langName: string, lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `भाषा चुनी गई: ${langName}। कृपया मरीज पहचान के लिए आगे बढ़ें।`;
      case 'te':
        return `భాష ఎంచుకోబడింది: ${langName}. దయచేసి రోగి గుర్తింపుకు వెళ్లండి.`;
      case 'mr':
        return `भाषा निवडली: ${langName}. कृपया रुग्ण पडताळणीसाठी पुढे जा.`;
      case 'bn':
        return `ভাষা নির্বাচিত হয়েছে: ${langName}। অনুগ্রহ করে রোগীর পরিচয়ে এগিয়ে যান।`;
      case 'ta':
        return `மொழி தேர்ந்தெடுக்கப்பட்டது: ${langName}. தயவுசெய்து தொடரவும்.`;
      default:
        return `Language selected: ${langName}. Please proceed to patient identification.`;
    }
  },

  // 2. Biometric Verified
  biometricVerified: (patientName: string, mode: 'fingerprint' | 'face', lang: LanguageCode) => {
    const modeTextHi = mode === 'fingerprint' ? 'अंगूठे का निशान' : 'चेहरा';
    switch (lang) {
      case 'hi':
        return `बायोमेट्रिक सत्यापन सफल। ${modeTextHi} प्रमाणित हुआ। स्वागत है, ${patientName}। आपकी पहचान सत्यापित हो गई है।`;
      case 'te':
        return `బయోమెట్రిక్ ధృవీకరణ విజయవంతమైంది. స్వాగతం, ${patientName}. మీ గుర్తింపు నిర్ధారించబడింది.`;
      case 'mr':
        return `बायोमेट्रिक प्रमाणीकरण यशस्वी. स्वागत आहे, ${patientName}. आपली ओळख पडताळली गेली आहे.`;
      default:
        return `Biometric verification successful. Welcome, ${patientName}. Your identity is confirmed.`;
    }
  },

  // 3. Patient Registered
  patientRegistered: (patientName: string, patientId: string, lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `नया पंजीकरण सफल हुआ। स्वागत है, ${patientName}। आपकी मरीज आईडी है: ${patientId}।`;
      case 'te':
        return `కొత్త నమోదు పూర్తయింది. స్వాగతం, ${patientName}. మీ పేషెంట్ ఐడి: ${patientId}.`;
      default:
        return `Registration successful. Welcome, ${patientName}. Your Patient ID is ${patientId}.`;
    }
  },

  // 4. Existing Patient Signed In
  patientLoggedIn: (patientName: string, lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `पहचान सत्यापित हुई। स्वागत है, ${patientName}। आपका पिछला रिकॉर्ड लोड कर लिया गया है।`;
      default:
        return `Patient record identified. Welcome back, ${patientName}.`;
    }
  },

  // 5. Department Chosen
  departmentSelected: (deptName: string, lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `${deptName} विभाग चुना गया है। अब कृपया अपनी बीमारी या लक्षण बताएं।`;
      case 'te':
        return `${deptName} విభాగం ఎంపిక చేయబడింది. దయచేసి మీ లక్షణాలను తెలపండి.`;
      default:
        return `${deptName} department selected. Please describe your symptoms.`;
    }
  },

  // 6. Symptom / Chief Complaint Recorded
  symptomRecorded: (complaint: string, lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `आपके लक्षण दर्ज कर लिए गए हैं: ${complaint}। अगला प्रश्न आ रहा है।`;
      case 'te':
        return `మీ లక్షణాలు నమోదు చేయబడ్డాయి: ${complaint}. తదుపరి ప్రశ్న వస్తోంది.`;
      default:
        return `Your symptoms have been recorded: ${complaint}. Moving to the next question.`;
    }
  },

  // 7. Clinical Question Answered
  questionAnswered: (questionName: string, answer: string, lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `${questionName}: ${answer} दर्ज हो गया।`;
      default:
        return `${questionName}: ${answer} recorded.`;
    }
  },

  // 8. Document & Prescription OCR Verified
  documentScanned: (docName: string, lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `दस्तावेज और पर्चा सफलतापूर्वक स्कैन हो गया है। दवाइयों व जांच का विवरण दर्ज कर लिया गया है।`;
      case 'te':
        return `వైద్య పత్రం విజయవంతంగా స్కాన్ చేయబడింది. వివరాలు నమోదు చేయబడ్డాయి.`;
      default:
        return `Document and prescription scanned successfully. Clinical details extracted.`;
    }
  },

  // 9. Document Legibility Verified
  documentLegibilityVerified: (lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `पर्चे की स्पष्टता और पठनीयता सत्यापित कर ली गई है। यह डॉक्टर को स्पष्ट दिखेगा।`;
      default:
        return `Document legibility verified. Verified as clear and readable for the doctor.`;
    }
  },

  // 10. Consent Accepted
  consentAccepted: (lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `डिजिटल सहमति स्वीकार कर ली गई है। आपका स्वास्थ्य डेटा पूर्णतः सुरक्षित है।`;
      case 'te':
        return `డిజిటల్ సమ్మతి ఆమోదించబడింది. మీ డేటా సురక్షితం.`;
      default:
        return `Digital consent accepted. Your health records are encrypted and protected.`;
    }
  },

  // 11. Review Confirmed
  reviewConfirmed: (lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `आपका नैदानिक विवरण सुरक्षित रूप से दर्ज कर लिया गया है। ओपीडी पर्ची और टोकन तैयार किया जा रहा है।`;
      default:
        return `Your clinical intake summary has been confirmed. Generating your OPD token.`;
    }
  },

  // 12. Final Queue Token
  queueTokenReady: (token: string, room: string, lang: LanguageCode) => {
    switch (lang) {
      case 'hi':
        return `पंजीकरण पूर्ण हुआ! आपका टोकन नंबर है ${token}। कृपया कमरा नंबर ${room} के बाहर प्रतीक्षा क्षेत्र में बैठें।`;
      case 'te':
        return `నమోదు పూర్తయింది! మీ టోకెన్ నంబర్ ${token}. దయచేసి రూమ్ ${room} వద్ద వేచి ఉండండి.`;
      default:
        return `Registration complete! Your token number is ${token}. Please proceed to waiting area Room ${room}.`;
    }
  },
};
