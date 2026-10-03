import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Edit3,
  X,
  Sparkles,
  Volume2,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { LanguageCode } from '../../types';
import {
  SUPPORTED_VOICE_LANGUAGES,
  getVoiceLangByCode,
  SpeechLanguageDefinition,
} from '../../config/speechLanguageConfig';
import { useSpeechSession, SpeechSessionState } from '../../hooks/useSpeechSession';

export type VoiceLanguage = LanguageCode;

export interface VoiceToTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  selectedVoiceLang: LanguageCode;
  onVoiceLangChange?: (lang: LanguageCode) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  helperText?: string;
  caseId?: string;
  questionId?: string;
}

export const VoiceToTextInput: React.FC<VoiceToTextInputProps> = ({
  value,
  onChange,
  placeholder = 'Type your response or tap the microphone to speak...',
  multiline = true,
  rows = 3,
  selectedVoiceLang,
  onVoiceLangChange,
  disabled = false,
  className = '',
  inputClassName = '',
  autoFocus = false,
  helperText,
  caseId,
  questionId,
}) => {
  const [editableDraft, setEditableDraft] = useState<string>('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState<boolean>(false);
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(false);

  const activeLangDef = getVoiceLangByCode(selectedVoiceLang);

  const {
    state,
    volume,
    interimTranscript,
    finalTranscript,
    rawTranscript,
    detectedLanguage,
    errorMessage,
    engineUsed,
    startListening,
    stopListening,
    cancelRecording,
    confirmTranscript,
    setFinalTranscript,
  } = useSpeechSession({
    languageCode: selectedVoiceLang,
    isAutoDetect,
    caseId,
    questionId,
    onTranscriptConfirmed: (confirmedText) => {
      // Append or replace value cleanly
      const updated = value ? `${value.trim()} ${confirmedText}`.trim() : confirmedText;
      onChange(updated);
    },
  });

  // When speech moves to review, populate editable draft
  useEffect(() => {
    if (state === 'ready_for_review') {
      setEditableDraft(finalTranscript);
    }
  }, [state, finalTranscript]);

  const handleConfirmReview = () => {
    confirmTranscript(editableDraft || finalTranscript);
  };

  const handleSelectLanguage = (langCode: LanguageCode) => {
    setShowLanguageDropdown(false);
    if (onVoiceLangChange) {
      onVoiceLangChange(langCode);
    }
  };

  return (
    <div className={`w-full space-y-2.5 font-sans select-none ${className}`}>
      {/* Voice Control Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Active Voice Language Selector */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled || state === 'listening' || state === 'processing'}
            onClick={() => setShowLanguageDropdown((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-[#E3DDCA] border border-[#A9AA94] hover:border-[#29483C] text-[#26312B] font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Select speech recognition language"
          >
            <Globe className="w-3.5 h-3.5 text-[#29483C]" />
            <span className="font-bold">{activeLangDef.flag}</span>
            <span>{activeLangDef.nativeName}</span>
            <span className="text-[10px] text-[#596058] font-mono">({activeLangDef.googleLanguageCode})</span>
            <ChevronDown className="w-3 h-3 text-[#596058]" />
          </button>

          {/* Language Dropdown Menu */}
          {showLanguageDropdown && (
            <div className="absolute left-0 top-full mt-1 z-30 w-56 max-h-64 overflow-y-auto bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] shadow-lg p-1 space-y-0.5 animate-in fade-in duration-150">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#596058] border-b border-[#A9AA94]/50 mb-1">
                Google STT V2 Chirp 3 Languages
              </div>
              {SUPPORTED_VOICE_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-[5px] text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    selectedVoiceLang === lang.code
                      ? 'bg-[#29483C] text-[#F0EBDD]'
                      : 'hover:bg-[#B5B7A1] text-[#26312B]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    <span className="text-[10px] opacity-70">({lang.displayName})</span>
                  </span>
                  {lang.status === 'preview' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-mono">
                      Preview
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Engine and Auto-Detect Info */}
        <div className="flex items-center gap-2 text-[11px] text-[#596058]">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoDetect}
              onChange={(e) => setIsAutoDetect(e.target.checked)}
              disabled={state === 'listening' || state === 'processing'}
              className="accent-[#29483C] rounded cursor-pointer"
            />
            <span>Auto-detect ({activeLangDef.googleLanguageCode} / en-IN)</span>
          </label>
        </div>
      </div>

      {/* Main Textarea / Input Field */}
      <div className="relative">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled || state === 'listening' || state === 'processing'}
            autoFocus={autoFocus}
            className={`w-full rounded-[8px] bg-[#E3DDCA] border border-[#A9AA94] focus:border-[#29483C] focus:ring-1 focus:ring-[#29483C] p-3 text-sm text-[#26312B] placeholder-[#596058]/70 outline-none transition-all disabled:opacity-60 resize-y font-sans ${inputClassName}`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || state === 'listening' || state === 'processing'}
            autoFocus={autoFocus}
            className={`w-full rounded-[8px] bg-[#E3DDCA] border border-[#A9AA94] focus:border-[#29483C] focus:ring-1 focus:ring-[#29483C] px-3 py-2.5 text-sm text-[#26312B] placeholder-[#596058]/70 outline-none transition-all disabled:opacity-60 font-sans ${inputClassName}`}
          />
        )}

        {/* Primary Microphone Trigger Action Button */}
        <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
          {state === 'idle' && (
            <button
              type="button"
              disabled={disabled}
              onClick={startListening}
              className="px-3 py-1.5 rounded-[6px] bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-[#29483C] disabled:opacity-50"
              title={`Tap to speak in ${activeLangDef.nativeName}`}
            >
              <Mic className="w-3.5 h-3.5 text-[#B99B6B]" />
              <span>{activeLangDef.code === 'hi' ? 'बोलें (Speak)' : 'Speak'}</span>
            </button>
          )}

          {state === 'listening' && (
            <button
              type="button"
              onClick={stopListening}
              className="px-3 py-1.5 rounded-[6px] bg-[#A65F49] hover:bg-[#8e4f3c] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer animate-pulse border border-[#A65F49]"
              title="Stop recording and review transcript"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{activeLangDef.code === 'hi' ? 'रोकें (Stop)' : 'Done'}</span>
            </button>
          )}
        </div>
      </div>

      {/* STATE 1: Actively Listening View with Real-time Volume Analyzer */}
      {state === 'listening' && (
        <div className="p-3.5 bg-[#B5B7A1] border-2 border-[#29483C] rounded-[8px] space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A65F49] animate-ping" />
              <span className="font-bold text-[#29483C]">
                {activeLangDef.code === 'hi'
                  ? `🎙️ ${activeLangDef.nativeName} में सुन रहे हैं...`
                  : `🎙️ Listening in ${activeLangDef.displayName}...`}
              </span>
              <span className="text-[10px] text-[#596058] font-mono">Chirp 3</span>
            </div>

            <button
              type="button"
              onClick={cancelRecording}
              className="text-[#596058] hover:text-[#26312B] text-xs font-semibold underline cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Real Audio Level Visualizer Meter */}
          <div className="w-full bg-[#E3DDCA] rounded-full h-1.5 overflow-hidden border border-[#A9AA94]">
            <div
              className="bg-[#29483C] h-full transition-all duration-75"
              style={{ width: `${Math.max(4, volume)}%` }}
            />
          </div>

          {/* Live Interim Transcript Display */}
          <div className="text-xs text-[#26312B] min-h-[20px] italic">
            {interimTranscript ? (
              <span>"{interimTranscript}..."</span>
            ) : (
              <span className="text-[#596058]">
                {activeLangDef.code === 'hi'
                  ? 'स्पष्ट रूप से बोलें, स्वतः विराम के बाद रिकॉर्डिंग पूर्ण होगी...'
                  : 'Speak clearly into the microphone... pauses are tolerated.'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* STATE 2: Processing Audio through Google Cloud Speech V2 */}
      {state === 'processing' && (
        <div className="p-3 bg-[#B5B7A1] border border-[#A9AA94] rounded-[8px] flex items-center justify-between text-xs text-[#29483C]">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#29483C]" />
            <span className="font-semibold">
              {activeLangDef.code === 'hi'
                ? 'Google Speech-to-Text V2 (Chirp 3) द्वारा ऑडियो का विश्लेषण...'
                : 'Processing audio with Google Speech-to-Text V2 (Chirp 3)...'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#596058]">Clinical Normalization</span>
        </div>
      )}

      {/* STATE 3: PATIENT CONFIRMATION & EDITABLE REVIEW DIALOG */}
      {state === 'ready_for_review' && (
        <div className="p-4 bg-[#E3DDCA] border-2 border-[#29483C] rounded-[10px] space-y-3 shadow-md animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-[#A9AA94] pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#B99B6B]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#29483C]">
                {activeLangDef.code === 'hi' ? 'आपने कहा (Review Your Spoken Response)' : 'Review Your Voice Response'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94]">
              {engineUsed.includes('chirp') ? 'Google Chirp 3' : 'Google Multimodal STT'}
            </span>
          </div>

          {/* Editable Text Area for the Patient to verify/correct */}
          <div>
            <label className="block text-[11px] text-[#596058] mb-1">
              {activeLangDef.code === 'hi'
                ? 'यदि आवश्यक हो तो नीचे दिए गए पाठ में सुधार करें:'
                : 'You may edit the recognized text before confirming:'}
            </label>
            <textarea
              value={editableDraft}
              onChange={(e) => setEditableDraft(e.target.value)}
              rows={2}
              className="w-full p-2.5 text-sm bg-[#F0EBDD] border border-[#A9AA94] rounded-[6px] text-[#26312B] font-sans focus:border-[#29483C] outline-none"
            />
          </div>

          {/* Action Confirmation Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={startListening}
              className="px-3 py-1.5 rounded-[6px] bg-[#B5B7A1] hover:bg-[#abae97] text-[#26312B] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-[#A9AA94]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{activeLangDef.code === 'hi' ? 'पुनः बोलें (Retry)' : 'Record Again'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1.5 text-xs text-[#596058] hover:text-[#26312B] font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReview}
                className="px-4 py-1.5 rounded-[6px] bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all border border-[#29483C]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#B99B6B]" />
                <span>{activeLangDef.code === 'hi' ? 'पुष्टि करें व जोड़ें (Use this)' : 'Use this response'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 4: Error Handling View */}
      {state === 'error' && errorMessage && (
        <div className="p-3 bg-[#E3DDCA] border border-[#A65F49] rounded-[8px] text-xs text-[#A65F49] flex items-start justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">{errorMessage}</span>
              <span className="text-[11px] text-[#596058]">
                You can try recording again or type your answer manually in the box above.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1 hover:bg-[#A65F49]/10 rounded cursor-pointer"
            title="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Helper text if provided */}
      {helperText && state === 'idle' && (
        <p className="text-[11px] text-[#596058]">{helperText}</p>
      )}
    </div>
  );
};
