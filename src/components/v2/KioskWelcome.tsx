import React, { useEffect, useState } from 'react';
import {
  Volume2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  Mic,
  ScanLine,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { LanguageCode } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';
import { getUIText } from '../../data/translations';
import { EcgPulseLine } from './welcome/EcgPulseLine';
import { AiClinicalNetwork } from './welcome/AiClinicalNetwork';
import { AyurvedicEmblem } from './BotanicalIllustrations';
import { EditorialBotanicalArtwork } from './welcome/EditorialBotanicalArtwork';

interface KioskWelcomeProps {
  currentLanguage: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
  onStart: () => void;
  onNeedHelp: () => void;
  audioEnabled: boolean;
  onLogin?: () => void;
  onOpenLiveVoice?: () => void;
  onScanDocuments?: () => void;
}

export const KioskWelcome: React.FC<KioskWelcomeProps> = ({
  currentLanguage,
  onStart,
  onNeedHelp,
  audioEnabled,
  onLogin,
  onOpenLiveVoice,
  onScanDocuments,
}) => {
  const t = getUIText(currentLanguage);
  const shouldReduceMotion = useReducedMotion();
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (audioEnabled) {
      speakPrompt(
        currentLanguage === 'hi'
          ? 'मेडीकियोस्क में आपका स्वागत है। डॉक्टर से मिलने से पहले अपने लक्षणों के बारे में बताने के लिए मरीज इनटेक शुरू करें।'
          : currentLanguage === 'te'
          ? 'మెడికియోస్క్‌కు స్వాగతం. వైద్యుడిని కలిసే ముందు మీ లక్షణాలను తెలపడానికి రోగి ఇన్టేక్ ప్రారంభించండి.'
          : 'Welcome to MediKiosk. Share your symptoms and Prakriti profile before meeting the doctor. Tap Start Patient Intake to begin.',
        currentLanguage
      );
    }
  }, [currentLanguage, audioEnabled]);

  const handleListen = () => {
    speakPrompt(
      currentLanguage === 'hi'
        ? 'मेडीकियोस्क में आपका स्वागत है। डॉक्टर से मिलने से पहले अपने लक्षणों के बारे में बताने के लिए मरीज इनटेक शुरू करें।'
        : currentLanguage === 'te'
        ? 'మెడికియోస్క్‌కు స్వాగతం. వైద్యుడిని కలిసే ముందు మీ లక్షణాలను తెలపడానికి రోగి ఇన్టేక్ ప్రారంభించండి.'
        : 'Welcome to MediKiosk. Share your symptoms and Prakriti profile before meeting the doctor. Tap Start Patient Intake to begin.',
      currentLanguage
    );
  };

  const handleStartWithTransition = () => {
    setIsStarting(true);
    setTimeout(() => {
      onStart();
    }, 150);
  };

  return (
    <div className="relative min-h-[82vh] flex flex-col justify-center px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto select-none overflow-hidden bg-ayur-canvas-texture">
      {/* 
        HERO COMPOSITION: Asymmetrical Editorial Composition
        Left: MediKiosk branding, clinical purpose, and CTA buttons
        Right: Large botanical / clinical illustration with subtle natural drifting motion
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Column: Clinical Title, Purpose & Primary CTAs (7 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="lg:col-span-7 flex flex-col items-start text-left"
        >
          {/* Top Institutional Badge */}
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#B5B7A1] border border-[#A9AA94] text-[#26312B] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#29483C]" />
            <span>All India Institute of Ayurveda • AYUSH Digital Triage</span>
          </div>

          {/* Institutional Emblem + Title Lockup */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-[8px] bg-[#29483C] text-[#F0EBDD] flex items-center justify-center border border-[#496354] shrink-0">
              <AyurvedicEmblem className="w-7 h-7" strokeColor="#F0EBDD" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#26312B] font-normal tracking-tight leading-none">
                MediKiosk
              </h1>
            </div>
          </div>

          <p className="text-sm sm:text-base font-semibold text-[#62745D] tracking-wide uppercase mb-3">
            Ayurvedic Clinical History & Triage Platform
          </p>

          <p className="text-base sm:text-lg text-[#596058] font-normal max-w-xl mb-6 leading-relaxed">
            {currentLanguage === 'hi'
              ? 'वैद्य से परामर्श से पूर्व अपने लक्षण, प्रकृति (दशविध परीक्षा) व स्वास्थ्य इतिहास दर्ज करें।'
              : currentLanguage === 'te'
              ? 'వైద్యుడిని కలిసే ముందు మీ లక్షణాలు, దశవిధ పరీక్ష మరియు ఆరోగ్య చరిత్రను నమోదు చేయండి.'
              : 'Structured documentation of patient lakshana, Dashavidha Pariksha, and prior prescriptions before consulting the attending Vaidya.'}
          </p>

          {/* Nadi Physiological Pulse Motif */}
          <div className="w-full max-w-xs mb-7">
            <EcgPulseLine color="#29483C" />
          </div>

          {/* Action Controls */}
          <div className="w-full max-w-md space-y-3 mb-6">
            {/* Primary Action Button: #29483C, text #F0EBDD, 8px radius, height 50-54px */}
            <motion.button
              id="btn-kiosk-start"
              type="button"
              onClick={handleStartWithTransition}
              whileHover={
                shouldReduceMotion
                  ? {}
                  : {
                      y: -2,
                    }
              }
              whileTap={shouldReduceMotion ? {} : { scale: 0.99, y: 0 }}
              transition={{ duration: 0.18 }}
              className={`w-full h-[52px] px-8 bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] text-base font-semibold rounded-[8px] border border-[#29483C] flex items-center justify-between cursor-pointer transition-colors ${
                isStarting ? 'opacity-90' : ''
              }`}
            >
              <span className="tracking-wide">
                {currentLanguage === 'hi'
                  ? 'मरीज इनटेक शुरू करें'
                  : currentLanguage === 'te'
                  ? 'రోగి ఇన్టేక్ ప్రారంభించండి'
                  : 'START CLINICAL INTAKE'}
              </span>
              <motion.span
                animate={shouldReduceMotion ? {} : { x: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight className="w-5 h-5 text-[#B99B6B]" />
              </motion.span>
            </motion.button>

            {/* Secondary Action: Copper / Forest Ayurvedic Identity */}
            {onOpenLiveVoice && (
              <button
                type="button"
                onClick={onOpenLiveVoice}
                className="w-full h-[46px] px-5 rounded-[8px] text-sm font-semibold text-[#29483C] bg-transparent hover:bg-[#B5B7A1]/40 border border-[#93684F] transition-all flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-[#93684F]" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'बोलकर परामर्श शुरू करें (Live Voice Assistant)'
                      : currentLanguage === 'te'
                      ? 'మాట్లాడి ప్రారంభించండి (Live Voice Assistant)'
                      : 'Live Voice Clinical Consultation'}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 text-[#93684F]" />
              </button>
            )}

            {/* Quick Action: Document & Prescription Scanning */}
            {onScanDocuments && (
              <button
                type="button"
                onClick={onScanDocuments}
                className="w-full h-[46px] px-5 rounded-[8px] text-sm font-semibold text-[#29483C] bg-[#B5B7A1]/40 hover:bg-[#B5B7A1]/70 border border-[#A9AA94] transition-all flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-[#29483C]" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'दस्तावेज व पर्ची स्कैन करें (Prescription / OCR Scanner)'
                      : currentLanguage === 'te'
                      ? 'ప్రిస్క్రిప్షన్ / పత్రాలను స్కాన్ చేయండి'
                      : 'Scan Prescriptions & Lab Reports'}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 text-[#29483C]" />
              </button>
            )}

            {/* Existing Patient Login Link */}
            {onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="w-full py-2 px-3 rounded-[6px] text-xs font-semibold text-[#596058] hover:text-[#26312B] hover:bg-[#B5B7A1]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#596058]" />
                <span>
                  {currentLanguage === 'hi'
                    ? 'क्या आपका पहले से खाता है? लॉगिन करें'
                    : currentLanguage === 'te'
                    ? 'ఖాతా ఉందా? లాగిన్ అవ్వండి'
                    : 'Registered Patient or ABHA ID? Sign in'}
                </span>
              </button>
            )}
          </div>

          {/* Tertiary Utilities: Audio Guidance & Staff Assistance */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium pt-2">
            <button
              type="button"
              onClick={handleListen}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#B5B7A1] border border-[#A9AA94] hover:bg-[#a6a892] text-[#26312B] cursor-pointer transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#29483C]" />
              <span>{currentLanguage === 'hi' ? 'आवाज में सुनें' : 'Audio Guidance'}</span>
            </button>

            <button
              type="button"
              onClick={onNeedHelp}
              className="text-[#596058] hover:text-[#26312B] flex items-center gap-1.5 cursor-pointer underline underline-offset-4 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#62745D]" />
              <span>{t.needStaffHelp}</span>
            </button>
          </div>
        </motion.div>

        {/* Right Column: Editorial Botanical Artwork & Clinical Surface Cards (5 cols) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-5 relative flex flex-col items-center justify-center"
        >
          {/* Large Low-Opacity Botanical Illustration with natural motion */}
          <EditorialBotanicalArtwork className="my-2" />

          {/* Clinical Surface Card: Protocol summary on #E3DDCA */}
          <div className="w-full mt-4 p-4 rounded-[10px] bg-[#E3DDCA] border border-[#A9AA94] text-left relative z-10">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#A9AA94]/50">
              <span className="text-xs font-bold uppercase tracking-wider text-[#29483C] flex items-center gap-1.5">
                <AyurvedicEmblem className="w-4 h-4" strokeColor="#29483C" />
                <span>{currentLanguage === 'hi' ? 'आयुष ओपीडी प्रक्रिया' : 'Ayush OPD Protocol'}</span>
              </span>
              <span className="text-[10px] font-mono text-[#596058]">ISO/ABDM 2026</span>
            </div>

            <ul className="space-y-2 text-xs font-medium text-[#26312B]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#29483C] shrink-0 mt-0.5" />
                <span>
                  {currentLanguage === 'hi'
                    ? 'वाणी या स्पर्श द्वारा क्लिनिकल लक्षण व प्रकृति विश्लेषण'
                    : 'Voice or Touch Bhashini clinical Lakshana intake'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#29483C] shrink-0 mt-0.5" />
                <span>
                  {currentLanguage === 'hi'
                    ? 'दशविध परीक्षा व पूर्व नुस्खा ओसीआर दस्तावेज़'
                    : 'Dashavidha Pariksha & prescription OCR analysis'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#29483C] shrink-0 mt-0.5" />
                <span>
                  {currentLanguage === 'hi'
                    ? 'कायचिकित्सा, शल्य, पंचकर्म ओपीडी टोकन आवंटन'
                    : 'Accurate OPD specialty routing & physician slip'}
                </span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      {/* Bottom Secondary Layer: AI Clinical Network Flow on #B5B7A1 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.5 }}
        className="w-full max-w-5xl mx-auto mt-10 pt-6 border-t border-[#A9AA94]"
      >
        <AiClinicalNetwork currentLanguage={currentLanguage} />
      </motion.div>
    </div>
  );
};
