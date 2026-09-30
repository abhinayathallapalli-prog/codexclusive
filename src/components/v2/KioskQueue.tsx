import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { TextEffect } from '@/components/core/text-effect';
import { CheckCircle2, Printer, RefreshCw, Volume2, Clock, MapPin } from 'lucide-react';
import { LanguageCode } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';
import { getUIText } from '../../data/translations';

interface KioskQueueProps {
  currentLanguage: LanguageCode;
  tokenNumber: string;
  department: string;
  roomNumber?: string;
  doctorName?: string;
  onFinish?: () => void;
  onReset?: () => void;
  audioEnabled: boolean;
}

export const KioskQueue: React.FC<KioskQueueProps> = ({
  currentLanguage,
  tokenNumber,
  department,
  roomNumber = '12',
  doctorName,
  onFinish,
  onReset,
  audioEnabled,
}) => {
  const t = getUIText(currentLanguage);
  const [countdown, setCountdown] = useState(30);
  const [hasPrinted, setHasPrinted] = useState(false);

  const activeDoctor = doctorName || 'Dr. Ananya Sharma';
  const handleFinish = onFinish || onReset;

  const audioMessage =
    currentLanguage === 'hi'
      ? `पंजीकरण सफल रहा। आपका टोकन नंबर ${tokenNumber} है। कृपया ओपीडी कक्ष संख्या ${roomNumber} के प्रतीक्षा क्षेत्र में बैठें।`
      : `Registration complete. Your token number is ${tokenNumber}. Please proceed to OPD waiting area Room ${roomNumber}.`;

  useEffect(() => {
    if (audioEnabled) {
      speakPrompt(audioMessage, currentLanguage);
    }
  }, [currentLanguage, audioEnabled, audioMessage]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, handleFinish]);

  const handlePrint = () => {
    setHasPrinted(true);
    window.print();
  };

  return (
    <div id="kiosk-queue-token-view" className="max-w-2xl mx-auto px-4 py-6 sm:py-8 select-none text-center">
      {/* Success Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[6px] bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] font-semibold text-xs mb-6">
        <CheckCircle2 className="w-4 h-4 text-[#29483C] shrink-0" />
        <TextEffect
          key={`queue-status-${currentLanguage}`}
          per="word"
          as="span"
          preset="slide"
        >
          {t.regComplete}
        </TextEffect>
      </div>

      {/* Main Token Display Card - Physical Clinical Slip Style */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-6 sm:p-8 mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#29483C]" />

        <p className="text-xs font-bold uppercase tracking-widest text-[#596058] mb-1">
          {t.tokenTitle}
        </p>

        {/* Token Value */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 350, damping: 20 }}
          className="text-5xl sm:text-7xl font-bold text-[#29483C] tracking-wider font-mono my-2 py-2"
        >
          {tokenNumber || 'A-024'}
        </motion.div>

        {/* Department & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 border-t border-[#A9AA94] text-left">
          <div className="p-3 bg-[#B5B7A1]/60 rounded-[8px] border border-[#A9AA94]">
            <span className="text-xs font-semibold text-[#596058] uppercase tracking-wider block mb-0.5">
              {t.departmentCard}
            </span>
            <span className="font-serif text-base sm:text-lg font-normal text-[#26312B]">
              {department || 'Kayachikitsa'}
            </span>
          </div>

          <div className="p-3 bg-[#B5B7A1]/60 rounded-[8px] border border-[#A9AA94]">
            <span className="text-xs font-semibold text-[#596058] uppercase tracking-wider block mb-0.5">
              {t.statusLabel}
            </span>
            <span className="text-sm font-bold text-[#29483C] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#29483C] animate-spin" />
              {t.statusWaiting}
            </span>
          </div>
        </div>

        {/* Room & Doctor Directions */}
        <div className="mt-4 p-4 bg-[#B5B7A1]/40 border border-[#A9AA94] rounded-[8px] text-left flex items-start gap-3">
          <MapPin className="w-5 h-5 text-[#29483C] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#26312B]">
              {`${t.roomPrefix} ${roomNumber} (OPD)`}
            </p>
            <p className="text-xs text-[#596058] font-normal">
              {activeDoctor} • ~10 mins
            </p>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons: Print Slip & Audio */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
        <motion.button
          type="button"
          onClick={handlePrint}
          whileHover={{ translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full sm:w-auto px-6 h-[50px] bg-[#29483C] hover:bg-[#1d332a] active:scale-95 text-[#F0EBDD] font-semibold text-sm rounded-[8px] border border-[#29483C] flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Printer className="w-4 h-4 text-[#B99B6B]" />
          <span>{hasPrinted ? 'Printed' : t.printSlip}</span>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => speakPrompt(audioMessage, currentLanguage)}
          whileHover={{ translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full sm:w-auto px-6 h-[50px] bg-transparent border border-[#93684F] text-[#29483C] hover:bg-[#B5B7A1]/40 font-semibold text-sm rounded-[8px] flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Volume2 className="w-4 h-4 text-[#93684F]" />
          <span>{t.listenAgain}</span>
        </motion.button>
      </div>

      {/* Next Patient Reset Bar */}
      <div className="pt-6 border-t border-[#A9AA94] flex flex-col items-center gap-2">
        <p className="text-xs text-[#596058] font-normal">
          {`${t.autoResetMsg} ${countdown}s`}
        </p>

        <motion.button
          type="button"
          onClick={() => handleFinish?.()}
          whileHover={{ translateY: -1 }}
          whileTap={{ scale: 0.97 }}
          className="px-5 py-2 bg-[#E3DDCA] hover:bg-[#B5B7A1] text-[#596058] border border-[#A9AA94] font-semibold text-xs rounded-[8px] flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#29483C]" />
          <span>{t.finishNow}</span>
        </motion.button>
      </div>
    </div>
  );
};
