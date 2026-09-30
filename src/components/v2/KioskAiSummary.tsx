import React, { useEffect } from 'react';
import { ArrowLeft, Volume2, CheckCircle, FileCheck, Building2, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { LanguageCode } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';
import { getUIText } from '../../data/translations';
import { TextEffect } from '@/components/core/text-effect';
import { SymptomConfidenceIndicator } from './SymptomConfidenceIndicator';

interface KioskAiSummaryProps {
  currentLanguage: LanguageCode;
  department: string;
  documentCount?: number;
  documents?: any[];
  patient?: any;
  interviewData?: any;
  onSubmitToDoctor?: () => void;
  onProceedToQueue?: () => void;
  onBack: () => void;
  audioEnabled?: boolean;
}

export const KioskAiSummary: React.FC<KioskAiSummaryProps> = ({
  currentLanguage,
  department,
  documentCount,
  documents,
  patient,
  interviewData,
  onSubmitToDoctor,
  onProceedToQueue,
  onBack,
  audioEnabled = true,
}) => {
  const t = getUIText(currentLanguage);
  const activeDocCount = documentCount ?? (documents ? documents.length : 0);
  const handleSubmit = onSubmitToDoctor || onProceedToQueue;

  useEffect(() => {
    if (audioEnabled) {
      speakPrompt(t.aiSummaryAudio, currentLanguage);
    }
  }, [currentLanguage, audioEnabled]);

  return (
    <div id="kiosk-ai-summary-view" className="max-w-2xl mx-auto px-4 py-6 sm:py-8 select-none text-center">
      {/* Top Back Controls */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-[8px] bg-[#E3DDCA] border border-[#A9AA94] hover:bg-[#B5B7A1] text-[#26312B] font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#29483C]" />
          <span>{t.back}</span>
        </button>

        <button
          type="button"
          onClick={() => speakPrompt(t.aiSummaryAudio, currentLanguage)}
          className="px-3.5 py-2 rounded-[8px] bg-[#B5B7A1]/60 border border-[#A9AA94] text-[#29483C] font-semibold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#B5B7A1] transition-all shadow-2xs"
        >
          <Volume2 className="w-4 h-4 text-[#29483C]" />
          <span>{t.listen}</span>
        </button>
      </div>

      {/* Success Symbol */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 350 }}
        className="w-20 h-20 rounded-[10px] bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] flex items-center justify-center mx-auto mb-6 shadow-sm"
      >
        <CheckCircle className="w-10 h-10 text-[#29483C]" />
      </motion.div>

      {/* Header with TextEffect */}
      <TextEffect
        key={`summary-title-${currentLanguage}`}
        per="word"
        as="h2"
        preset="slide"
        className="font-serif text-3xl sm:text-4xl font-normal text-[#26312B] mb-3 leading-tight"
      >
        {t.aiSummaryTitle}
      </TextEffect>
      <TextEffect
        key={`summary-sub-${currentLanguage}`}
        per="word"
        as="p"
        preset="fade"
        delay={0.15}
        className="text-sm sm:text-base text-[#596058] font-normal mb-8 max-w-lg mx-auto"
      >
        {t.aiSummarySub}
      </TextEffect>

      {/* Metrics Card: Department & Documents */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25 }}
        className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-6 sm:p-7 mb-8 max-w-lg mx-auto text-left space-y-4"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#A9AA94]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#B5B7A1] text-[#29483C] flex items-center justify-center font-bold border border-[#A9AA94]">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-[#596058]">
              {t.departmentCard}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg sm:text-xl font-normal text-[#26312B] text-right">
              {department || 'Kayachikitsa'}
            </span>
            <SymptomConfidenceIndicator
              confidenceLevel={patient?.routingConfidence || interviewData?.routingConfidence}
              confidenceScore={patient?.confidenceScore || interviewData?.confidenceScore}
              confidenceRationale={patient?.confidenceRationale || interviewData?.confidenceRationale}
              confidenceFactors={patient?.confidenceFactors || interviewData?.confidenceFactors}
              extractedHistory={{
                chiefComplaint: patient?.chiefComplaint || interviewData?.chiefComplaint,
                duration: interviewData?.duration,
                location: patient?.anatomicalLocation || interviewData?.location,
              }}
              departmentName={department || 'Kayachikitsa'}
              currentLanguage={currentLanguage}
              size="sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#B5B7A1] text-[#29483C] flex items-center justify-center font-bold border border-[#A9AA94]">
              <FileCheck className="w-5 h-5 text-[#29483C]" />
            </div>
            <span className="text-sm font-semibold text-[#596058]">
              {t.docsCard}
            </span>
          </div>
          <span className="text-base font-bold text-[#29483C] text-right">
            {`${activeDocCount} ${t.addedDocs}`}
          </span>
        </div>
      </motion.div>

      {/* Primary Action Button: Submit to Doctor */}
      <div className="flex justify-center">
        <motion.button
          id="btn-submit-doctor"
          type="button"
          onClick={() => handleSubmit?.()}
          whileHover={{ translateY: -2 }}
          whileTap={{ scale: 0.985 }}
          className="w-full max-w-md h-[52px] px-8 bg-[#29483C] hover:bg-[#1d332a] active:scale-95 text-[#F0EBDD] text-base font-semibold rounded-[8px] border border-[#29483C] flex items-center justify-center gap-3 cursor-pointer transition-all"
        >
          <Send className="w-5 h-5 text-[#B99B6B]" />
          <span>{t.submitToDoctor}</span>
        </motion.button>
      </div>
    </div>
  );
};
