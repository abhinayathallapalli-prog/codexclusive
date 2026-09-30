import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export type VoiceLanguage = 'en' | 'hi' | 'te';

export interface VoiceToTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  selectedVoiceLang: VoiceLanguage;
  onVoiceLangChange: (lang: VoiceLanguage) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  helperText?: string;
}

const VOICE_LANG_CONFIG: Record<
  VoiceLanguage,
  {
    label: string;
    nativeName: string;
    locale: string;
    speakButtonText: string;
    listeningText: string;
  }
> = {
  en: {
    label: 'English',
    nativeName: 'English',
    locale: 'en-IN',
    speakButtonText: 'Speak in English',
    listeningText: 'Listening in English...',
  },
  hi: {
    label: 'Hindi',
    nativeName: 'हिन्दी',
    locale: 'hi-IN',
    speakButtonText: 'Speak in हिन्दी',
    listeningText: 'Listening in हिन्दी...',
  },
  te: {
    label: 'Telugu',
    nativeName: 'తెలుగు',
    locale: 'te-IN',
    speakButtonText: 'Speak in తెలుగు',
    listeningText: 'Listening in తెలుగు...',
  },
};

export const VoiceToTextInput: React.FC<VoiceToTextInputProps> = ({
  value,
  onChange,
  placeholder = 'Type your answer or speak using the microphone...',
  multiline = true,
  rows = 3,
  selectedVoiceLang,
  onVoiceLangChange,
  disabled = false,
  className = '',
  inputClassName = '',
  autoFocus = false,
  helperText,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechDetected, setSpeechDetected] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const activeLangRef = useRef<VoiceLanguage>(selectedVoiceLang);
  const shouldReduceMotion = useReducedMotion();

  activeLangRef.current = selectedVoiceLang;

  // Check browser speech recognition support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setSpeechDetected(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    setErrorMessage(null);
    setInterimText('');
    setSpeechDetected(false);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please type your answer directly in the box.'
      );
      setIsSupported(false);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = VOICE_LANG_CONFIG[activeLangRef.current].locale;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        if (finalChunk.trim()) {
          setSpeechDetected(true);
          onChange((value ? `${value.trim()} ` : '') + finalChunk.trim());
          setInterimText('');
        } else if (currentInterim.trim()) {
          setSpeechDetected(true);
          setInterimText(currentInterim);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechDetected(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setErrorMessage(`Could not start speech recognition: ${err.message || 'Unknown error'}`);
      setIsListening(false);
    }
  }, [onChange, stopListening, value]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleLanguageSwitch = (newLang: VoiceLanguage) => {
    onVoiceLangChange(newLang);
    activeLangRef.current = newLang;
    if (isListening) {
      stopListening();
      setTimeout(() => {
        startListening();
      }, 150);
    }
  };

  const activeLangConfig = VOICE_LANG_CONFIG[selectedVoiceLang];

  return (
    <div className={`space-y-2.5 select-none ${className}`}>
      {/* Top Controls: 3-Language Selector + Active Clinical Recording Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Language Selector: English | हिन्दी | తెలుగు */}
        <div className="inline-flex items-center p-0.5 bg-[#B5B7A1] rounded-lg border border-[#A9AA94]">
          <span className="text-[10px] font-semibold text-[#596058] uppercase px-2 tracking-wider">
            Voice:
          </span>
          <div className="flex items-center gap-1">
            {(['en', 'hi', 'te'] as VoiceLanguage[]).map((langKey, idx) => {
              const cfg = VOICE_LANG_CONFIG[langKey];
              const isSelected = selectedVoiceLang === langKey;
              return (
                <React.Fragment key={langKey}>
                  {idx > 0 && <span className="text-[#A9AA94] font-normal">·</span>}
                  <button
                    type="button"
                    onClick={() => handleLanguageSwitch(langKey)}
                    className={`px-2.5 py-0.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#29483C] text-white shadow-xs'
                        : 'text-[#26312B] hover:bg-[#E3DDCA]'
                    }`}
                    title={`Speech recognition language: ${cfg.label} (${cfg.locale})`}
                  >
                    {cfg.nativeName}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Live Audio Listening Badge */}
        {isListening ? (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#B5B7A1] border border-[#29483C] text-[#29483C] rounded-lg text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#29483C] animate-pulse"></span>
            <span>{`● ${activeLangConfig.listeningText}`}</span>

            {/* Dynamic Waveform */}
            <div className="flex items-center gap-0.5 ml-1 h-3.5">
              {[0, 1, 2, 3, 4].map((barIdx) => (
                <motion.span
                  key={barIdx}
                  className="w-0.5 bg-[#29483C] rounded-full"
                  animate={
                    shouldReduceMotion
                      ? { height: 6 }
                      : {
                          height: speechDetected
                            ? [4, 14 + (barIdx % 3) * 4, 4]
                            : [3, 8, 3],
                          opacity: speechDetected ? [0.6, 1, 0.6] : [0.4, 0.7, 0.4],
                        }
                  }
                  transition={{
                    duration: speechDetected ? 0.6 : 1.1,
                    repeat: Infinity,
                    delay: barIdx * 0.12,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#596058] font-normal hidden sm:flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[#62745D]" />
            <span>Type or tap the microphone to speak</span>
          </div>
        )}
      </div>

      {/* Answer Area Container */}
      <div className="relative">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`w-full bg-[#E3DDCA] border rounded-[8px] p-3.5 pr-40 text-sm sm:text-base font-normal text-[#26312B] placeholder:text-[#596058]/60 focus:outline-none transition-all shadow-xs resize-none ${
              isListening
                ? 'border-[#29483C] ring-2 ring-[#62745D]/20 bg-[#E3DDCA]'
                : 'border-[#A9AA94] focus:border-[#29483C] focus:bg-[#E3DDCA]'
            } ${inputClassName}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`w-full bg-[#E3DDCA] border rounded-[8px] py-3 px-3.5 pr-40 text-sm sm:text-base font-normal text-[#26312B] placeholder:text-[#596058]/60 focus:outline-none transition-all shadow-xs ${
              isListening
                ? 'border-[#29483C] ring-2 ring-[#62745D]/20 bg-[#E3DDCA]'
                : 'border-[#A9AA94] focus:border-[#29483C] focus:bg-[#E3DDCA]'
            } ${inputClassName}`}
          />
        )}

        {/* Action Controls Inside Input Field */}
        <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
          {isListening ? (
            <button
              type="button"
              onClick={stopListening}
              className="px-3 py-1.5 bg-[#A65F49] hover:bg-[#8F553E] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              title="Stop speech recording"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleListening}
              disabled={disabled}
              className="px-3 py-1.5 bg-[#B5B7A1] hover:bg-[#E5DEC9] border border-[#A9AA94] text-[#29483C] rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              title={`Activate microphone: ${activeLangConfig.speakButtonText}`}
            >
              <Mic className="w-3.5 h-3.5 text-[#29483C]" />
              <span>{activeLangConfig.speakButtonText}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interim Transcribed Live Speech Preview */}
      {interimText && (
        <div className="p-2.5 bg-[#B5B7A1] border border-[#A9AA94] rounded-lg text-xs font-medium text-[#26312B] flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#29483C] shrink-0" />
          <span className="text-[#596058]">Transcribing:</span>
          <span className="italic truncate text-[#26312B]">{interimText}</span>
        </div>
      )}

      {/* Microphone Error Notification */}
      {errorMessage && (
        <div className="p-2.5 bg-[#E3DDCA] border border-[#A65F49] rounded-lg text-xs text-[#A65F49] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#A65F49] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#A65F49] font-bold cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Helper text & Clear option */}
      <div className="flex items-center justify-between text-[11px] text-[#596058] px-1 font-normal">
        <span>
          {helperText ||
            (selectedVoiceLang === 'hi'
              ? 'आप आवाज से बोल सकते हैं या कीबोर्ड से टाइप कर सकते हैं।'
              : selectedVoiceLang === 'te'
              ? 'మీరు వాయిస్ ద్వారా మాట్లాడవచ్చు లేదా టైప్ చేయవచ్చు.'
              : 'Speak using Voice-to-Text or type directly.')}
        </span>
        {value.trim() && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[#596058] hover:text-[#26312B] font-medium cursor-pointer transition-colors"
          >
            Clear text
          </button>
        )}
      </div>
    </div>
  );
};
