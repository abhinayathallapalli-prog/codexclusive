import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { KioskStep } from '../../utils/kioskStorage';
import { LanguageCode } from '../../types';

interface KioskProgressBarProps {
  currentStep: KioskStep;
  currentLanguage: LanguageCode;
}

interface Milestone {
  id: 'patient_details' | 'health_history' | 'documents' | 'review';
  stepFormattedNumber: string;
  stepNumber: number;
  label: { en: string; hi: string; te: string };
  steps: KioskStep[];
}

const MILESTONES: Milestone[] = [
  {
    id: 'patient_details',
    stepFormattedNumber: '01',
    stepNumber: 1,
    label: {
      en: 'Patient Identification',
      hi: 'मरीज विवरण',
      te: 'రోగి వివరాలు',
    },
    steps: ['welcome', 'patient_id'],
  },
  {
    id: 'health_history',
    stepFormattedNumber: '02',
    stepNumber: 2,
    label: {
      en: 'Ayush Clinical Intake',
      hi: 'आयुष स्वास्थ्य इतिहास',
      te: 'ఆరోగ్య చరిత్ర',
    },
    steps: ['intake', 'department', 'consent', 'interview'],
  },
  {
    id: 'documents',
    stepFormattedNumber: '03',
    stepNumber: 3,
    label: {
      en: 'Prescriptions & Records',
      hi: 'दस्तावेज़ व पर्चा',
      te: 'పత్రాలు & ప్రిస్క్రిప్షన్',
    },
    steps: ['red_flag', 'documents'],
  },
  {
    id: 'review',
    stepFormattedNumber: '04',
    stepNumber: 4,
    label: {
      en: 'Review & OPD Queue',
      hi: 'समीक्षा व टोकन',
      te: 'సమీక్ష & టోకెన్',
    },
    steps: ['review', 'ai_summary', 'queue'],
  },
];

export const KioskProgressBar: React.FC<KioskProgressBarProps> = ({
  currentStep,
  currentLanguage,
}) => {
  const activeMilestoneIndex = MILESTONES.findIndex((m) => m.steps.includes(currentStep));
  const validIndex = activeMilestoneIndex >= 0 ? activeMilestoneIndex : 0;
  const progressPercent = Math.min(100, Math.round(((validIndex + 1) / MILESTONES.length) * 100));

  return (
    <div
      id="kiosk-progress-container"
      className="w-full bg-[#B5B7A1] border-b border-[#A9AA94] sticky top-[57px] sm:top-[61px] z-30 select-none shadow-xs"
    >
      <div className="max-w-4xl mx-auto px-4 py-2">
        {/* Milestone Steps Bar */}
        <div className="flex items-center justify-between relative">
          {MILESTONES.map((m, idx) => {
            const isCompleted = idx < validIndex;
            const isCurrent = idx === validIndex;
            const labelText =
              currentLanguage === 'hi'
                ? m.label.hi
                : currentLanguage === 'te'
                ? m.label.te
                : m.label.en;

            return (
              <div
                key={m.id}
                id={`kiosk-milestone-${m.id}`}
                className="flex items-center gap-2"
              >
                {/* Step Circle Indicator */}
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className={`w-7 h-7 sm:w-7 sm:h-7 rounded-[6px] flex items-center justify-center text-xs font-mono font-semibold transition-all ${
                    isCompleted
                      ? 'bg-[#29483C] text-[#F0EBDD] border border-[#29483C]'
                      : isCurrent
                      ? 'bg-[#29483C] text-[#F0EBDD] ring-2 ring-[#B99B6B] shadow-xs'
                      : 'bg-[#C9C5AF] text-[#596058] border border-[#A9AA94]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-[#B99B6B] stroke-[2.5]" />
                  ) : (
                    <span>{m.stepFormattedNumber}</span>
                  )}
                </motion.div>

                {/* Milestone Label */}
                <div className="flex flex-col">
                  <span className="text-xs sm:text-xs tracking-tight flex items-center gap-1.5 font-medium">
                    <span
                      className={
                        isCurrent
                          ? 'text-[#26312B] font-bold'
                          : isCompleted
                          ? 'text-[#29483C] font-semibold'
                          : 'text-[#596058]'
                      }
                    >
                      {labelText}
                    </span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B99B6B] animate-pulse hidden sm:inline-block" />
                    )}
                  </span>
                </div>

                {/* Connecting subtle line between steps */}
                {idx < MILESTONES.length - 1 && (
                  <div
                    className={`hidden md:block w-8 lg:w-16 h-[1.5px] mx-1 transition-colors duration-300 ${
                      idx < validIndex ? 'bg-[#29483C]' : 'bg-[#A9AA94]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Minimal Progress Track */}
        <div className="w-full bg-[#A9AA94] h-[3px] rounded-full mt-2 overflow-hidden">
          <motion.div
            className="bg-[#29483C] h-full rounded-full"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
};
