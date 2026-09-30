import React, { useEffect } from 'react';
import { AlertCircle, Volume2, UserCheck, Bell } from 'lucide-react';
import { LanguageCode } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';
import { getUIText } from '../../data/translations';

interface KioskRedFlagProps {
  currentLanguage: LanguageCode;
  urgentSymptom?: string;
  symptom?: string;
  onStaffOverride?: () => void;
  onContinue?: () => void;
  onBack?: () => void;
  audioEnabled: boolean;
}

export const KioskRedFlag: React.FC<KioskRedFlagProps> = ({
  currentLanguage,
  urgentSymptom,
  symptom,
  onStaffOverride,
  onContinue,
  onBack,
  audioEnabled,
}) => {
  const t = getUIText(currentLanguage);
  const activeSymptom = urgentSymptom || symptom || 'Acute condition detected';
  const handleProceed = onStaffOverride || onContinue;

  useEffect(() => {
    if (audioEnabled) {
      speakPrompt(t.redFlagAudio, currentLanguage);
    }
  }, [currentLanguage, audioEnabled]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 select-none text-center">
      {/* Calm High-Contrast Alert Symbol with Terracotta accent */}
      <div className="w-20 h-20 rounded-[10px] bg-[#A65F49]/15 text-[#A65F49] flex items-center justify-center mx-auto mb-6 border border-[#A65F49]/40 animate-pulse shadow-2xs">
        <AlertCircle className="w-10 h-10" />
      </div>

      {/* Instructions */}
      <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#26312B] mb-3 leading-tight">
        {t.redFlagTitle}
      </h2>

      <p className="text-base sm:text-lg text-[#596058] font-normal mb-8 max-w-lg mx-auto leading-relaxed">
        {t.redFlagSub}
      </p>

      {/* Staff Alert Status Card */}
      <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-6 mb-8 max-w-lg mx-auto text-left flex items-center gap-4">
        <div className="w-12 h-12 rounded-[8px] bg-[#A65F49] text-white flex items-center justify-center shrink-0">
          <Bell className="w-6 h-6 animate-bounce text-[#F0EBDD]" />
        </div>
        <div>
          <h4 className="text-base font-bold text-[#26312B]">
            {t.redFlagNotified}
          </h4>
          <p className="text-xs text-[#596058] font-normal">
            {t.redFlagStation}
          </p>
        </div>
      </div>

      {/* Audio Button */}
      <button
        type="button"
        onClick={() => speakPrompt(t.redFlagAudio, currentLanguage)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#B5B7A1]/60 border border-[#A9AA94] text-[#29483C] font-semibold text-sm cursor-pointer hover:bg-[#B5B7A1] mb-8 transition-colors"
      >
        <Volume2 className="w-4 h-4 text-[#29483C]" />
        <span>{t.listenAgain}</span>
      </button>

      {/* Staff Assistance / Override Button */}
      <div className="pt-6 border-t border-[#A9AA94] max-w-md mx-auto space-y-3">
        <p className="text-xs text-[#596058] font-bold uppercase tracking-wider mb-2">
          {t.redFlagForStaff}
        </p>
        <button
          type="button"
          onClick={() => handleProceed?.()}
          className="w-full h-[50px] bg-[#29483C] hover:bg-[#1d332a] text-[#F0EBDD] font-semibold rounded-[8px] text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border border-[#29483C]"
        >
          <UserCheck className="w-4 h-4 text-[#B99B6B]" />
          <span>{t.redFlagStaffAssisted}</span>
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full h-[46px] bg-transparent hover:bg-[#B5B7A1]/40 text-[#29483C] font-semibold rounded-[8px] text-sm border border-[#93684F] cursor-pointer transition-all"
          >
            {t.back}
          </button>
        )}
      </div>
    </div>
  );
};
