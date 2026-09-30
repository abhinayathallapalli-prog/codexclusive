import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { LanguageCode } from '../../types';
import { AyurvedicEmblem } from './BotanicalIllustrations';

interface GeminiProcessingIndicatorProps {
  currentLanguage: LanguageCode;
  customText?: string;
  className?: string;
}

export const GeminiProcessingIndicator: React.FC<GeminiProcessingIndicatorProps> = ({
  currentLanguage,
  customText,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const titleText =
    customText ||
    (currentLanguage === 'hi'
      ? 'आयुष क्लिनिकल तर्क व विश्लेषण...'
      : currentLanguage === 'te'
      ? 'ఆయుష్ క్లినికల్ విశ్లేషణ...'
      : 'Ayurvedic Clinical Reasoning & Pariksha...');

  return (
    <div
      className={`p-6 sm:p-7 bg-[#E3DDCA] rounded-[10px] border border-[#A9AA94] shadow-[0_4px_18px_rgba(38,49,43,0.06)] max-w-md mx-auto text-center select-none space-y-4 ${className}`}
    >
      {/* Central Rotating Emblem & Ayurvedic Indicator */}
      <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
        {!shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 rounded-[10px] border border-[#29483C]/30"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.1, 0.5],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        <div className="w-12 h-12 rounded-[8px] bg-[#29483C] text-[#F0EBDD] flex items-center justify-center shadow-xs border border-[#496354] z-10">
          <AyurvedicEmblem className="w-7 h-7" strokeColor="#F0EBDD" />
        </div>
      </div>

      {/* Main Status Text with Clinical Dots */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <h3 className="text-sm sm:text-base font-serif text-[#26312B]">
            {titleText}
          </h3>
          <div className="flex items-center gap-1 pt-1">
            {[0, 1, 2].map((dotIdx) => (
              <motion.span
                key={dotIdx}
                className="w-1.5 h-1.5 rounded-full bg-[#29483C]"
                animate={
                  shouldReduceMotion
                    ? {}
                    : {
                        y: [0, -3, 0],
                        opacity: [0.35, 1, 0.35],
                      }
                }
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: dotIdx * 0.18,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>

        {/* Small Nadi Pulse Waveform */}
        <div className="flex items-center justify-center gap-1 py-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.span
              key={i}
              className="w-1 bg-[#62745D] rounded-full"
              animate={
                shouldReduceMotion
                  ? { height: 6 }
                  : {
                      height: [4, 12, 4],
                      opacity: [0.3, 0.9, 0.3],
                    }
              }
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>

      {/* Hospital Privacy / Reassurance Note */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#B5B7A1] border border-[#A9AA94] text-[11px] font-medium text-[#26312B]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#29483C]" />
        <span>
          {currentLanguage === 'hi'
            ? 'गोपनीय आयुष क्लिनिकल मूल्यांकन'
            : 'Confidential Ayush Clinical Triage'}
        </span>
      </div>
    </div>
  );
};
