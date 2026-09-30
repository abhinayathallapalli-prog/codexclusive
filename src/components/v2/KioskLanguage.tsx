import React, { useEffect } from 'react';
import { Volume2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { LanguageCode } from '../../types';
import { SUPPORTED_LANGUAGES, getUIText } from '../../data/translations';
import { speakPrompt } from '../../utils/speechHelper';

interface KioskLanguageProps {
  currentLanguage: LanguageCode;
  onLanguageSelect?: (lang: LanguageCode) => void;
  onSelectLanguage?: (lang: LanguageCode) => void;
  onNext?: () => void;
  onBack: () => void;
  audioEnabled: boolean;
}

export const KioskLanguage: React.FC<KioskLanguageProps> = ({
  currentLanguage,
  onLanguageSelect,
  onSelectLanguage,
  onNext,
  onBack,
  audioEnabled,
}) => {
  const t = getUIText(currentLanguage);

  useEffect(() => {
    if (audioEnabled) {
      speakPrompt(t.chooseLanguageAudio, currentLanguage);
    }
  }, [currentLanguage, audioEnabled]);

  const selectLanguage = onLanguageSelect || onSelectLanguage;

  const handleSelect = (lang: LanguageCode) => {
    if (selectLanguage) {
      selectLanguage(lang);
    }
    const newT = getUIText(lang);
    speakPrompt(newT.chooseLanguageAudio, lang);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-[8px] bg-[#B5B7A1] border border-[#A9AA94] hover:bg-[#a6a892] text-[#26312B] font-semibold text-sm flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#29483C]" />
          <span>{t.back}</span>
        </button>

        <button
          type="button"
          onClick={() => speakPrompt(t.chooseLanguageAudio, currentLanguage)}
          className="px-3.5 py-2 rounded-[8px] bg-[#B5B7A1] border border-[#A9AA94] text-[#26312B] font-semibold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#a6a892] transition-colors"
        >
          <Volume2 className="w-4 h-4 text-[#29483C]" />
          <span>{t.listen}</span>
        </button>
      </div>

      {/* Screen Task Heading */}
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#26312B] mb-2 tracking-tight">
          Choose Your Language / भाषा चुनें
        </h2>
        <p className="text-base sm:text-lg font-semibold text-[#62745D]">
          {t.chooseLanguageSub}
        </p>
      </div>

      {/* Language Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-10">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = currentLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`p-5 sm:p-6 rounded-[10px] border text-left transition-all duration-150 flex items-center justify-between cursor-pointer min-h-[96px] ${
                isSelected
                  ? 'border-[#29483C] bg-[#B5B7A1]'
                  : 'border-[#A9AA94] bg-[#E3DDCA] hover:border-[#29483C]/60 hover:bg-[#dbd4be]'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl sm:text-4xl shrink-0" role="img" aria-label={lang.label}>
                  {lang.flag}
                </span>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-[#26312B] leading-tight font-serif">
                    {lang.nativeLabel}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-[#596058] mt-0.5">
                    {lang.label}
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="w-7 h-7 rounded-[6px] bg-[#29483C] text-[#F0EBDD] flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Primary Action Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => {
            if (onNext) {
              onNext();
            } else if (selectLanguage) {
              selectLanguage(currentLanguage);
            }
          }}
          className="w-full sm:w-auto min-w-[260px] h-[52px] px-8 rounded-[8px] bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-semibold text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-[#29483C]"
        >
          <span className="tracking-wide">{t.next}</span>
          <ArrowRight className="w-5 h-5 text-[#B99B6B]" />
        </button>
      </div>
    </div>
  );
};
