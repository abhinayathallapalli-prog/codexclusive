import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';
import { LanguageCode } from '../../types';
import {
  AudioConfirmationState,
  subscribeAudioConfirmation,
  playAudioConfirmation,
  stopAudioConfirmation,
} from '../../utils/audioConfirmationEngine';

interface AudioConfirmationBannerProps {
  currentLanguage: LanguageCode;
  audioEnabled: boolean;
  onToggleAudio?: () => void;
}

export const AudioConfirmationBanner: React.FC<AudioConfirmationBannerProps> = ({
  currentLanguage,
  audioEnabled,
  onToggleAudio,
}) => {
  const [audioState, setAudioState] = useState<AudioConfirmationState>({
    isSpeaking: false,
    text: '',
    language: currentLanguage,
    source: 'gemini-tts',
    timestamp: 0,
  });

  const [visible, setVisible] = useState(false);
  const [dismissTimer, setDismissTimer] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = subscribeAudioConfirmation((state) => {
      setAudioState(state);
      if (state.isSpeaking || (state.text && Date.now() - state.timestamp < 10000)) {
        setVisible(true);
        if (dismissTimer) clearTimeout(dismissTimer);

        // Keep visible during speech, plus 4 seconds after finishing
        if (!state.isSpeaking) {
          const t = setTimeout(() => {
            setVisible(false);
          }, 4500);
          setDismissTimer(t);
        }
      }
    });

    return () => {
      unsubscribe();
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [dismissTimer]);

  if (!visible || !audioState.text || !audioEnabled) {
    return null;
  }

  const handleReplay = () => {
    playAudioConfirmation({
      text: audioState.text,
      language: audioState.language || currentLanguage,
      audioEnabled: true,
    });
  };

  const handleStop = () => {
    stopAudioConfirmation();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Audio Confirmation"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl shadow-xl select-none"
      >
        <div className="bg-[#29483C] text-[#F0EBDD] border-2 border-[#B99B6B] rounded-[12px] p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-2xl">
          {/* Left: Speaker icon & Animated Waveform */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-[8px] bg-[#B99B6B] text-[#29483C] flex items-center justify-center font-bold relative shadow-xs">
              <Volume2 className="w-5 h-5" />
              {audioState.isSpeaking && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E3DDCA] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E3DDCA]"></span>
                </span>
              )}
            </div>

            {/* Equalizer animation bars */}
            <div className="flex items-end gap-1 h-6">
              {[0.4, 0.9, 0.6, 1.0, 0.5, 0.8].map((factor, i) => (
                <motion.span
                  key={i}
                  animate={
                    audioState.isSpeaking
                      ? {
                          height: ['4px', `${Math.round(22 * factor)}px`, '4px'],
                        }
                      : { height: '5px' }
                  }
                  transition={{
                    repeat: audioState.isSpeaking ? Infinity : 0,
                    duration: 0.55 + i * 0.1,
                    ease: 'easeInOut',
                  }}
                  className={`w-1 rounded-full ${
                    audioState.isSpeaking ? 'bg-[#B99B6B]' : 'bg-[#B5B7A1]/40'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Center: Spoken Confirmation Text */}
          <div className="flex-1 min-w-0 px-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#B99B6B] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#B99B6B]" />
                {audioState.source === 'gemini-tts' ? 'AI Voice Confirmation' : 'Audio Confirmation'}
              </span>
              <span className="text-[10px] text-[#E3DDCA]/60 font-mono">
                {audioState.isSpeaking ? '• Speaking' : '• Verified'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[#F0EBDD] truncate leading-tight">
              {audioState.text}
            </p>
          </div>

          {/* Right Action Buttons: Replay & Close/Stop */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReplay}
              title="फिर से सुनें / Replay audio confirmation"
              className="px-3 py-2 rounded-[8px] bg-[#E3DDCA] hover:bg-[#dbd4be] text-[#29483C] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">फिर से सुनें</span>
              <span className="sm:hidden">Replay</span>
            </button>

            <button
              type="button"
              onClick={handleStop}
              title="बंद करें / Stop audio"
              className="p-2 rounded-[8px] bg-[#26312B] hover:bg-[#1d2621] text-[#E3DDCA] cursor-pointer transition-colors border border-[#A9AA94]/40"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
