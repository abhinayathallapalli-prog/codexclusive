import React, { useEffect } from 'react';
import { ShieldAlert, RotateCcw, Play, Lock } from 'lucide-react';
import { LanguageCode } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';

interface InactivityWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onResetNow: () => void;
  currentLanguage: LanguageCode;
  audioEnabled?: boolean;
}

const INACTIVITY_TEXT: Record<
  LanguageCode,
  {
    title: string;
    sub: string;
    secondsLabel: string;
    privacyNote: string;
    stayButton: string;
    resetButton: string;
    speechPrompt: string;
  }
> = {
  hi: {
    title: 'क्या आप अभी भी यहाँ हैं?',
    sub: 'मरीज की गोपनीयता की रक्षा के लिए, यह सत्र निष्क्रियता के कारण रीसेट हो जाएगा।',
    secondsLabel: 'सेकंड शेष',
    privacyNote: 'अगले मरीज के लिए आपकी स्वास्थ्य जानकारी पूरी तरह सुरक्षित और साफ कर दी जाएगी।',
    stayButton: 'हाँ, जारी रखें (Continue)',
    resetButton: 'सत्र समाप्त करें (End Session)',
    speechPrompt: 'सत्र निष्क्रियता चेतावनी। क्या आप जारी रखना चाहते हैं?',
  },
  en: {
    title: 'Are you still there?',
    sub: 'To safeguard patient privacy, this kiosk session will automatically reset due to inactivity.',
    secondsLabel: 'seconds remaining',
    privacyNote: 'All clinical and personal information will be cleared for the next patient.',
    stayButton: 'I am Still Here (Continue)',
    resetButton: 'Reset Now (Clear Session)',
    speechPrompt: 'Inactivity warning. Touch the screen if you need more time.',
  },
  mr: {
    title: 'तुम्ही अजूनही येथे आहात का?',
    sub: 'रुग्णाच्या गोपनीयतेसाठी, हे सत्र निष्क्रियतेमुळे स्वयंचलितपणे रीसेट केले जाईल.',
    secondsLabel: 'सेकंद शिल्लक',
    privacyNote: 'पुढील रुग्णासाठी तुमची वैयक्तिक माहिती पूर्णपणे सुरक्षित आणि पुसून टाकली जाईल.',
    stayButton: 'सुरू ठेवा (Continue)',
    resetButton: 'आत्ताच रीसेट करा (Reset Now)',
    speechPrompt: 'सत्र निष्क्रियता चेतावणी. सुरू ठेवण्यासाठी स्क्रीनला स्पर्श करा.',
  },
  bn: {
    title: 'আপনি কি এখনও এখানে আছেন?',
    sub: 'রোগীর গোপনীয়তা রক্ষার জন্য, নিষ্ক্রিয়তার কারণে এই সেশনটি স্বয়ংক্রিয়ভাবে রিসেট হয়ে যাবে।',
    secondsLabel: 'সেকেন্ড বাকি',
    privacyNote: 'পরবর্তী রোগীর জন্য সমস্ত স্বাস্থ্য তথ্য সম্পূর্ণরূপে সুরক্ষিত ও মুছে ফেলা হবে।',
    stayButton: 'হ্যাঁ, চালিয়ে যান (Continue)',
    resetButton: 'এখনই রিসেট করুন (Reset Now)',
    speechPrompt: 'সেশন নিষ্ক্রিয়তা সতর্কতা। চালিয়ে যেতে স্ক্রিন স্পর্শ করুন।',
  },
  ta: {
    title: 'நீங்கள் இன்னும் இருக்கிறீர்களா?',
    sub: 'நோயாளி தனியுரிமையைப் பாதுகாக்க, இந்த அமர்வு தானாகவே மீட்டமைக்கப்படும்.',
    secondsLabel: 'வினாடிகள் மீதமுள்ளன',
    privacyNote: 'அடுத்த நோயாளிக்காக உங்கள் தகவல்கள் முழுமையாக அழிக்கப்படும்.',
    stayButton: 'நான் இன்னும் இருக்கிறேன் (Continue)',
    resetButton: 'இப்போதே மீட்டமைக்கவும் (Reset Now)',
    speechPrompt: 'செயலற்ற எச்சரிக்கை. தொடர திரையைத் தொடவும்.',
  },
  te: {
    title: 'మీరు ఇంకా ఇక్కడే ఉన్నారా?',
    sub: 'రోగి గోప్యతను రక్షించడానికి, నిష్క్రియాత్మకత కారణంగా ఈ సెషన్ స్వయంచాలకంగా రీసెట్ అవుతుంది.',
    secondsLabel: 'సెకన్లు మిగిలి ఉన్నాయి',
    privacyNote: 'తదుపరి రోగి కోసం మొత్తం సమాచారం పూర్తిగా తొలగించబడుతుంది.',
    stayButton: 'నేను ఇక్కడే ఉన్నాను (Continue)',
    resetButton: 'ఇప్పుడే రీసెట్ చేయండి (Reset Now)',
    speechPrompt: 'సెషన్ హెచ్చరిక. కొనసాగించడానికి స్క్రీన్‌ను తాకండి.',
  },
  gu: {
    title: 'શું તમે હજુ પણ અહીં છો?',
    sub: 'દર્દીની ગોપનીયતાની સુરક્ષા માટે, આ સત્ર નિષ્ક્રિયતાના કારણે આપોઆપ રીસેટ થઈ જશે.',
    secondsLabel: 'સેકન્ડ બાકી',
    privacyNote: 'આગામી દર્દી માટે તમામ આરોગ્ય માહિતી સુરક્ષિત અને સાફ કરવામાં આવશે.',
    stayButton: 'ચાલુ રાખો (Continue)',
    resetButton: 'હમણાં રીસેટ કરો (Reset Now)',
    speechPrompt: 'સત્ર નિષ્ક્રિયતા ચેતવણી. ચાલુ રાખવા માટે સ્ક્રીન ટચ કરો.',
  },
  kn: {
    title: 'ನೀವು ಇನ್ನೂ ಇಲ್ಲಿದ್ದೀರಾ?',
    sub: 'ರೋಗಿಯ ಗೌಪ್ಯತೆಯನ್ನು ರಕ್ಷಿಸಲು, ನಿಷ್ಕ್ರಿಯತೆಯ ಕಾರಣದಿಂದಾಗಿ ಈ ಅವಧಿಯು ಮರುಹೊಂದಿಸಲ್ಪಡುತ್ತದೆ.',
    secondsLabel: 'ಸೆಕೆಂಡುಗಳು ಉಳಿದಿವೆ',
    privacyNote: 'ಮುಂದಿನ ರೋಗಿಗಾಗಿ ನಿಮ್ಮ ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ತೆರವುಗೊಳಿಸಲಾಗುತ್ತದೆ.',
    stayButton: 'ನಾನು ಇಲ್ಲಿದ್ದೇನೆ (Continue)',
    resetButton: 'ಈಗಲೇ ಮರುಹೊಂದಿಸಿ (Reset Now)',
    speechPrompt: 'ನಿಷ್ಕ್ರಿಯತೆಯ ಎಚ್ಚರಿಕೆ. ಮುಂದುವರಿಸಲು ಪರದೆಯನ್ನು ಸ್ಪರ್ಶಿಸಿ.',
  },
  ml: {
    title: 'നിങ്ങൾ ഇപ്പോഴും ഇവിടെയുണ്ടോ?',
    sub: 'രോഗിയുടെ സ്വകാര്യത ഉറപ്പാക്കാൻ, ഈ സെഷൻ സ്വയമേവ പുനഃക്രമീകരിക്കും.',
    secondsLabel: 'സെക്കന്റുകൾ ശേഷിക്കുന്നു',
    privacyNote: 'അടുത്ത രോഗിക്കായി നിങ്ങളുടെ വിവരങ്ങൾ പൂർണ്ണമായി ഒഴിവാക്കപ്പെടും.',
    stayButton: 'തുടരുക (Continue)',
    resetButton: 'ഇപ്പോൾ റീസെറ്റ് ചെയ്യുക (Reset Now)',
    speechPrompt: 'നിഷ്ക്രിയതാ മുന്നറിയിപ്പ്. തുടരാൻ സ്ക്രീനിൽ സ്പർശിക്കുക.',
  },
  pa: {
    title: 'ਕੀ ਤੁਸੀਂ ਅਜੇ ਵੀ ਇੱਥੇ ਹੋ?',
    sub: 'ਮਰੀਜ਼ ਦੀ ਨਿੱਜਤਾ ਦੀ ਸੁਰੱਖਿਆ ਲਈ, ਇਹ ਸੈਸ਼ਨ ਆਪਣੇ ਆਪ ਰੀਸੈੱਟ ਹੋ ਜਾਵੇਗਾ।',
    secondsLabel: 'ਸਕਿੰਟ ਬਾਕੀ',
    privacyNote: 'ਅਗਲੇ ਮਰੀਜ਼ ਲਈ ਤੁਹਾਡੀ ਸਾਰੀ ਜਾਣਕਾਰੀ ਪੂਰੀ ਤਰ੍ਹਾਂ ਸਾਫ਼ ਕਰ ਦਿੱਤੀ ਜਾਵੇਗੀ।',
    stayButton: 'ਹਾਂ, ਜਾਰੀ ਰੱਖੋ (Continue)',
    resetButton: 'ਹੁਣੇ ਰੀਸੈੱਟ ਕਰੋ (Reset Now)',
    speechPrompt: 'ਸੈਸ਼ਨ ਚੇਤਾਵਨੀ। ਜਾਰੀ ਰੱਖਣ ਲਈ ਸਕ੍ਰੀਨ ਨੂੰ ਛੋਹਵੋ।',
  },
};

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onResetNow,
  currentLanguage,
  audioEnabled = true,
}) => {
  const text = INACTIVITY_TEXT[currentLanguage] || INACTIVITY_TEXT.en;

  useEffect(() => {
    if (isOpen && audioEnabled) {
      speakPrompt(text.speechPrompt, currentLanguage);
    }
  }, [isOpen, audioEnabled, currentLanguage, text.speechPrompt]);

  if (!isOpen) return null;

  // Percentage for the countdown progress bar (from 30s down to 0)
  const percent = Math.min(100, Math.max(0, (remainingSeconds / 30) * 100));

  return (
    <div
      id="inactivity-warning-modal-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
      aria-describedby="inactivity-desc"
      className="fixed inset-0 z-50 bg-[#26312B]/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-[#E3DDCA] rounded-[10px] max-w-lg w-full p-6 sm:p-8 shadow-xl border border-[#A9AA94] text-center relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Animated Warning Progress Bar at Top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#A9AA94]">
          <div
            className="h-full bg-[#29483C] transition-all duration-1000 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Shield Icon & Pulse Indicator */}
        <div className="relative mx-auto w-14 h-14 rounded-[8px] bg-[#B5B7A1] border border-[#A9AA94] text-[#29483C] flex items-center justify-center mb-5 shadow-xs">
          <ShieldAlert className="w-7 h-7 text-[#A65F49]" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#A65F49] animate-ping" />
        </div>

        {/* Countdown Number Badge */}
        <div className="inline-flex items-baseline gap-1.5 px-3 py-1 rounded-[6px] bg-[#B5B7A1] border border-[#A9AA94] text-[#26312B] mb-3">
          <span className="text-2xl font-bold font-mono tracking-tight text-[#29483C]">
            {remainingSeconds}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#596058]">
            {text.secondsLabel}
          </span>
        </div>

        <h3 id="inactivity-title" className="text-2xl sm:text-3xl font-serif text-[#26312B] mb-2 font-normal">
          {text.title}
        </h3>

        <p id="inactivity-desc" className="text-sm sm:text-base text-[#596058] mb-5 leading-relaxed">
          {text.sub}
        </p>

        {/* Privacy Assurance Notice */}
        <div className="p-3.5 rounded-[8px] bg-[#C9C5AF] border border-[#A9AA94] text-[#26312B] text-xs font-medium flex items-center gap-2.5 text-left mb-6">
          <Lock className="w-4 h-4 text-[#29483C] shrink-0" />
          <span>{text.privacyNote}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            id="btn-inactivity-stay"
            type="button"
            onClick={onStayLoggedIn}
            className="w-full py-3.5 px-6 bg-[#29483C] hover:bg-[#1f372e] active:scale-[0.98] text-[#F0EBDD] font-semibold text-sm sm:text-base rounded-[8px] shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-4 h-4 fill-[#F0EBDD]" />
            <span>{text.stayButton}</span>
          </button>

          <button
            id="btn-inactivity-reset"
            type="button"
            onClick={onResetNow}
            className="w-full sm:w-auto py-3 px-4 bg-transparent hover:bg-[#B5B7A1]/40 text-[#29483C] font-semibold text-xs sm:text-sm rounded-[8px] border border-[#93684F] flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#29483C]" />
            <span>{text.resetButton}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
