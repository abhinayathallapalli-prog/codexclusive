import { LanguageCode } from '../types';

export function speakPrompt(text: string, lang: LanguageCode = 'hi'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly measured rate for clinical clarity
    utterance.pitch = 1.0;

    const langCodeMap: Record<LanguageCode, string> = {
      hi: 'hi-IN',
      en: 'en-IN',
      mr: 'mr-IN',
      bn: 'bn-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      pa: 'pa-IN',
    };

    utterance.lang = langCodeMap[lang] || 'hi-IN';

    // Attempt to select an Indian regional voice if installed
    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find(v => v.lang === utterance.lang || v.lang.replace('_', '-') === utterance.lang);
    const prefixVoice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    const indianFallbackVoice = voices.find(v => v.lang.includes('IN') || v.name.toLowerCase().includes('india'));
    
    if (exactVoice) {
      utterance.voice = exactVoice;
    } else if (prefixVoice) {
      utterance.voice = prefixVoice;
    } else if (indianFallbackVoice) {
      utterance.voice = indianFallbackVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis unavailable or blocked:', err);
    return false;
  }
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
