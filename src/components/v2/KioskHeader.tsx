import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Stethoscope,
  MonitorSmartphone,
  HelpCircle,
  Globe,
  ChevronDown,
  Check,
  MapPin,
  BookOpen,
  User,
  ShieldCheck,
  HardDrive,
  Mic,
  Search,
} from 'lucide-react';
import { LanguageCode, UserAccount } from '../../types';
import { SUPPORTED_LANGUAGES, getUIText } from '../../data/translations';
import { AyurvedicEmblem } from './BotanicalIllustrations';

interface KioskHeaderProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  activeView: 'kiosk' | 'doctor';
  onViewChange: (view: 'kiosk' | 'doctor') => void;
  onNeedHelp: () => void;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: () => void;
  onOpenMapsModal?: () => void;
  onOpenChatModal?: () => void;
  onOpenWorkspaceModal?: () => void;
  onOpenLiveVoiceModal?: () => void;
  onOpenSearchModal?: () => void;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  audioEnabled,
  onToggleAudio,
  activeView,
  onViewChange,
  onNeedHelp,
  currentUser,
  onOpenAuthModal,
  onOpenMapsModal,
  onOpenChatModal,
  onOpenWorkspaceModal,
  onOpenLiveVoiceModal,
  onOpenSearchModal,
}) => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const t = getUIText(currentLanguage);

  const currentLangOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isLangMenuOpen]);

  const handleSelectLanguage = (lang: LanguageCode) => {
    onLanguageChange(lang);
    setIsLangMenuOpen(false);
  };

  return (
    <header className="bg-[#29483C] text-[#F0EBDD] border-b border-[#496354] sticky top-0 z-40 shadow-sm select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Ayurvedic Clinical Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#1f372e] text-[#F0EBDD] flex items-center justify-center border border-[#496354] shrink-0">
            <AyurvedicEmblem className="w-6 h-6" strokeColor="#F0EBDD" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-serif text-[#F0EBDD] tracking-tight font-normal">
                MediKiosk
              </span>
              <span className="hidden xs:inline-block text-[10px] font-semibold tracking-wider uppercase text-[#B99B6B] border border-[#93684F]/50 px-2 py-0.5 rounded-[4px]">
                AYUSH Clinical Kiosk
              </span>
            </div>
            <p className="text-[11px] text-[#F0EBDD]/70 font-medium hidden sm:block">
              All India Institute of Ayurveda & ABDM Clinical Intake
            </p>
          </div>
        </div>

        {/* Center: Quiet Station Status with Copper separator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-[#F0EBDD]/80">
          <span className="w-2 h-2 rounded-full bg-[#B99B6B] shrink-0" />
          <span className="font-semibold text-[#F0EBDD]">Terminal Station 01</span>
          <span aria-hidden="true" className="text-[#93684F]">|</span>
          <span className="text-[#F0EBDD]/70">Digital Prakriti & Symptom Intake</span>
        </div>

        {/* Right: Actions, Language Selector, Help, Login, Doctor access */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Global Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              id="header-language-switcher"
              type="button"
              onClick={() => setIsLangMenuOpen((prev) => !prev)}
              aria-label={t.changeLanguage}
              aria-expanded={isLangMenuOpen}
              className="px-3 py-1.5 rounded-[8px] bg-[#1f372e] hover:bg-[#1a2f27] border border-[#496354] flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#F0EBDD] transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#B99B6B] shrink-0" />
              <span className="text-sm leading-none">{currentLangOption.flag}</span>
              <span className="font-medium text-[#F0EBDD]">{currentLangOption.nativeLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#F0EBDD]/60 transition-transform duration-150 ${
                  isLangMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-[#E3DDCA] rounded-[8px] shadow-lg border border-[#A9AA94] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-96 overflow-y-auto text-[#26312B]">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#596058] border-b border-[#A9AA94]/60">
                  {t.selectLanguage}
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = currentLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`w-full px-3.5 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#B5B7A1] text-[#29483C] font-bold'
                          : 'text-[#26312B] hover:bg-[#C9C5AF] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{lang.flag}</span>
                        <div>
                          <div className="text-xs font-semibold text-[#26312B] leading-snug">
                            {lang.nativeLabel}
                          </div>
                          <div className="text-[10px] text-[#596058]">{lang.label}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#29483C] stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Clinical Utilities (Desktop) */}
          <div className="hidden xl:flex items-center gap-1 bg-[#1f372e] p-1 rounded-[8px] border border-[#496354]">
            {onOpenLiveVoiceModal && (
              <button
                type="button"
                onClick={onOpenLiveVoiceModal}
                title="Bhashini & Gemini Live Voice (Real-Time Audio Consultation)"
                className="px-2.5 py-1 text-xs font-semibold text-[#F0EBDD] bg-[#29483C] hover:bg-[#2e5244] rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer border border-[#496354]"
              >
                <Mic className="w-3.5 h-3.5 text-[#B99B6B]" />
                <span>Live Voice</span>
              </button>
            )}

            {onOpenSearchModal && (
              <button
                type="button"
                onClick={onOpenSearchModal}
                title="Ayush Research & Clinical Guidelines Search"
                className="px-2 py-1 text-xs font-medium text-[#F0EBDD]/90 hover:bg-[#29483C] rounded-[6px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-[#F0EBDD]/70" />
                <span>Search</span>
              </button>
            )}

            {onOpenMapsModal && (
              <button
                type="button"
                onClick={onOpenMapsModal}
                title="Ayush Hospitals & Panchakarma Centers (Google Maps)"
                className="px-2 py-1 text-xs font-medium text-[#F0EBDD]/90 hover:bg-[#29483C] rounded-[6px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#B99B6B]" />
                <span>Centers</span>
              </button>
            )}

            {onOpenChatModal && (
              <button
                type="button"
                onClick={onOpenChatModal}
                title="Ayurvedic Clinical Knowledge Assistant"
                className="px-2 py-1 text-xs font-semibold text-[#F0EBDD] bg-[#29483C] hover:bg-[#2e5244] rounded-[6px] transition-colors flex items-center gap-1 cursor-pointer border border-[#496354]"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#B99B6B]" />
                <span>Vaidya Reference</span>
              </button>
            )}

            {onOpenWorkspaceModal && (
              <button
                type="button"
                onClick={onOpenWorkspaceModal}
                title="Google Workspace Clinical Integration"
                className="px-2 py-1 text-xs font-medium text-[#F0EBDD]/90 hover:bg-[#29483C] rounded-[6px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5 text-[#F0EBDD]/70" />
                <span>Workspace</span>
              </button>
            )}
          </div>

          {/* Login / User Account */}
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                currentUser
                  ? 'bg-[#1f372e] border-[#B99B6B] text-[#F0EBDD]'
                  : 'bg-[#1f372e] border-[#496354] hover:bg-[#29483C] text-[#F0EBDD]'
              }`}
              title={currentUser ? `Logged in: ${currentUser.displayName || currentUser.phone}` : 'Patient / Staff Login'}
            >
              {currentUser ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B99B6B]" />
                  <span className="max-w-[80px] sm:max-w-[110px] truncate text-[#F0EBDD]">
                    {currentUser.displayName || currentUser.phone || 'Account'}
                  </span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-[#F0EBDD]/70" />
                  <span>Login</span>
                </>
              )}
            </button>
          )}

          {/* Audio Guidance Toggle */}
          <button
            type="button"
            onClick={onToggleAudio}
            title={audioEnabled ? 'Voice Guidance Active' : 'Voice Guidance Muted'}
            aria-label={audioEnabled ? 'Mute Audio' : 'Enable Audio'}
            className={`p-2 rounded-[8px] border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              audioEnabled
                ? 'bg-[#1f372e] border-[#B99B6B] text-[#B99B6B]'
                : 'bg-[#1f372e] border-[#496354] text-[#F0EBDD]/60 hover:bg-[#29483C]'
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-[#B99B6B]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#F0EBDD]/60" />
            )}
          </button>

          {/* Help Button */}
          <button
            type="button"
            onClick={onNeedHelp}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-[8px] border border-[#496354] bg-[#1f372e] hover:bg-[#29483C] text-[#F0EBDD] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title="Help & Staff Assistance"
          >
            <HelpCircle className="w-4 h-4 text-[#B99B6B]" />
            <span className="hidden sm:inline">{t.help}</span>
          </button>

          {/* Doctor Access Mode Switch */}
          <div className="pl-1.5 border-l border-[#496354]">
            <button
              type="button"
              onClick={() => onViewChange(activeView === 'kiosk' ? 'doctor' : 'kiosk')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                activeView === 'doctor'
                  ? 'bg-[#B99B6B] border-[#B99B6B] text-[#26312B] font-bold shadow-xs'
                  : 'bg-[#1f372e] border-[#93684F] text-[#F0EBDD] hover:bg-[#29483C]'
              }`}
            >
              {activeView === 'doctor' ? (
                <>
                  <MonitorSmartphone className="w-3.5 h-3.5" />
                  <span>Kiosk</span>
                </>
              ) : (
                <>
                  <Stethoscope className="w-3.5 h-3.5 text-[#B99B6B]" />
                  <span>Doctor Desk</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
