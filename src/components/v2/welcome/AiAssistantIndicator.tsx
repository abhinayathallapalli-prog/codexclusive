import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
import { LanguageCode } from '../../../types';

export type AiAssistantStatus = 'ready' | 'processing' | 'complete';

interface AiAssistantIndicatorProps {
  status?: AiAssistantStatus;
  currentLanguage?: LanguageCode;
  className?: string;
  subtext?: string;
}

export const AiAssistantIndicator: React.FC<AiAssistantIndicatorProps> = ({
  status = 'ready',
  currentLanguage = 'en',
  className = '',
  subtext,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const labels = {
    ready: {
      en: 'Ayush Intelligence Active',
      hi: 'आयुष एआई सक्रिय है',
    },
    processing: {
      en: 'Clinical Assessment in Progress...',
      hi: 'क्लिनिकल विश्लेषण जारी है...',
    },
    complete: {
      en: 'Assessment Verified',
      hi: 'विश्लेषण पूर्ण',
    },
  };

  const currentText = labels[status][currentLanguage === 'hi' ? 'hi' : 'en'];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border text-xs font-semibold select-none transition-all ${
        status === 'processing'
          ? 'bg-[#B5B7A1] border-[#A65F49] text-[#26312B]'
          : status === 'complete'
          ? 'bg-[#E3DDCA] border-[#29483C] text-[#29483C]'
          : 'bg-[#E3DDCA] border-[#A9AA94] text-[#26312B]'
      } ${className}`}
    >
      {/* Dynamic Status Indicator */}
      {status === 'complete' ? (
        <span className="w-3.5 h-3.5 rounded-[4px] bg-[#29483C] text-[#F0EBDD] flex items-center justify-center shrink-0">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      ) : (
        <div className="relative flex items-center justify-center w-3 h-3">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              status === 'processing' ? 'bg-[#A65F49]' : 'bg-[#29483C]'
            }`}
          />
          {!shouldReduceMotion && (
            <motion.span
              className={`absolute inset-0 rounded-full ${
                status === 'processing' ? 'bg-[#A65F49]/50' : 'bg-[#29483C]/30'
              }`}
              animate={{
                scale: status === 'processing' ? [1, 2.2, 1] : [1, 1.8, 1],
                opacity: status === 'processing' ? [0.8, 0, 0.8] : [0.5, 0, 0.5],
              }}
              transition={{
                duration: status === 'processing' ? 0.9 : 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </div>
      )}

      <span>{currentText}</span>

      {subtext && (
        <span className="text-[10px] font-medium text-[#596058] border-l border-[#A9AA94] pl-2">
          {subtext}
        </span>
      )}
    </div>
  );
};
