import React, { useEffect } from 'react';
import { ArrowLeft, Volume2, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { TextEffect } from '@/components/core/text-effect';
import { LanguageCode } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';
import { getUIText } from '../../data/translations';
import {
  playAudioConfirmation,
  INTAKE_AUDIO_CONFIRMATIONS,
} from '../../utils/audioConfirmationEngine';

interface KioskConsentProps {
  currentLanguage: LanguageCode;
  onAgree?: () => void;
  onAccept?: () => void;
  onBack: () => void;
  audioEnabled: boolean;
}

export const KioskConsent: React.FC<KioskConsentProps> = ({
  currentLanguage,
  onAgree,
  onAccept,
  onBack,
  audioEnabled,
}) => {
  const t = getUIText(currentLanguage);
  const triggerAgree = onAgree || onAccept;

  const handleAgreeClick = () => {
    playAudioConfirmation({
      text: INTAKE_AUDIO_CONFIRMATIONS.consentAccepted(currentLanguage),
      language: currentLanguage,
      audioEnabled,
    });
    triggerAgree?.();
  };

  useEffect(() => {
    if (audioEnabled) {
      speakPrompt(t.consentAudio, currentLanguage);
    }
  }, [currentLanguage, audioEnabled]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-[8px] bg-[#B5B7A1] border border-[#A9AA94] hover:bg-[#a6a892] text-[#26312B] font-semibold text-sm flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#29483C]" />
          <span>{t.back}</span>
        </button>

        <button
          type="button"
          onClick={() => speakPrompt(t.consentAudio, currentLanguage)}
          className="px-3.5 py-2 rounded-[8px] bg-[#B5B7A1] border border-[#A9AA94] text-[#26312B] font-semibold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#a6a892] transition-colors shadow-2xs"
        >
          <Volume2 className="w-4 h-4 text-[#29483C]" />
          <span>{t.listen}</span>
        </button>
      </div>

      {/* Screen Task Heading */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-14 h-14 rounded-[10px] bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] flex items-center justify-center mx-auto mb-3 shadow-2xs"
        >
          <ShieldCheck className="w-8 h-8 text-[#29483C]" />
        </motion.div>
        <TextEffect
          key={`consent-title-${currentLanguage}`}
          per="word"
          as="h2"
          preset="slide"
          className="font-serif text-2xl sm:text-4xl font-normal text-[#26312B] mb-2 cursor-default tracking-tight"
        >
          {t.consentTitle}
        </TextEffect>
        <TextEffect
          key={`consent-sub-${currentLanguage}`}
          per="word"
          as="p"
          preset="fade"
          delay={0.12}
          className="text-sm sm:text-base text-[#596058] font-normal cursor-default max-w-lg mx-auto"
        >
          {t.consentSub}
        </TextEffect>
      </div>

      {/* Consent Explanation Card */}
      <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-6 sm:p-7 shadow-xs mb-8 space-y-4 text-left">
        <div className="flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-[6px] bg-[#B5B7A1] text-[#29483C] flex items-center justify-center shrink-0 mt-0.5 border border-[#A9AA94]">
            <CheckCircle2 className="w-4 h-4 text-[#29483C]" />
          </div>
          <div>
            <p className="text-sm text-[#26312B] leading-relaxed font-normal">
              {t.consentPoint1}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 pt-3 border-t border-[#A9AA94]/60">
          <div className="w-8 h-8 rounded-[6px] bg-[#B5B7A1] text-[#29483C] flex items-center justify-center shrink-0 mt-0.5 border border-[#A9AA94]">
            <Lock className="w-4 h-4 text-[#29483C]" />
          </div>
          <div>
            <p className="text-sm text-[#26312B] leading-relaxed font-normal">
              {t.consentPoint2}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 pt-3 border-t border-[#A9AA94]/60">
          <div className="w-8 h-8 rounded-[6px] bg-[#B5B7A1] text-[#29483C] flex items-center justify-center shrink-0 mt-0.5 border border-[#A9AA94]">
            <ShieldCheck className="w-4 h-4 text-[#29483C]" />
          </div>
          <div>
            <p className="text-sm text-[#26312B] leading-relaxed font-normal">
              {t.consentPoint3}
            </p>
          </div>
        </div>
      </div>

      {/* Large Primary I AGREE Button */}
      <div className="flex justify-center">
        <motion.button
          id="btn-kiosk-agree"
          type="button"
          onClick={handleAgreeClick}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          className="w-full max-w-md h-[52px] px-8 bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] text-base sm:text-lg font-semibold rounded-[8px] flex items-center justify-center gap-3 cursor-pointer transition-all border border-[#29483C]"
        >
          <CheckCircle2 className="w-5 h-5 text-[#B99B6B]" />
          <span className="tracking-wide">{t.consentAgreeButton}</span>
        </motion.button>
      </div>
    </div>
  );
};
