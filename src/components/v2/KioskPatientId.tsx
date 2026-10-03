import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  UserCheck,
  UserPlus,
  Delete,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  User,
  Fingerprint,
  ScanFace,
} from 'lucide-react';
import { LanguageCode, PatientProfile } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';
import { getUIText } from '../../data/translations';
import { apiLoginPatient, apiRegisterPatient } from '../../lib/api';
import { KioskBiometricAuth } from './KioskBiometricAuth';
import {
  playAudioConfirmation,
  INTAKE_AUDIO_CONFIRMATIONS,
} from '../../utils/audioConfirmationEngine';

interface KioskPatientIdProps {
  currentLanguage: LanguageCode;
  patient: PatientProfile;
  onUpdatePatient: (updated: Partial<PatientProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  audioEnabled: boolean;
}

export const KioskPatientId: React.FC<KioskPatientIdProps> = ({
  currentLanguage,
  patient,
  onUpdatePatient,
  onNext,
  onBack,
  audioEnabled,
}) => {
  const t = getUIText(currentLanguage);

  // Tabs: 'biometric' vs 'existing' vs 'new'
  const [patientType, setPatientType] = useState<'biometric' | 'existing' | 'new'>('biometric');

  // Existing Patient Login State
  const [existingIdentifier, setExistingIdentifier] = useState(patient.id || patient.phone || '');
  const [existingPassword, setExistingPassword] = useState('');

  // New Patient Registration State
  const [regName, setRegName] = useState(patient.name || '');
  const [regPhone, setRegPhone] = useState(patient.phone || '');
  const [regAge, setRegAge] = useState(patient.age ? String(patient.age) : '');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other'>(patient.gender || 'male');
  const [pregnancyStatus, setPregnancyStatus] = useState<'not_pregnant' | 'pregnant' | 'postpartum'>('not_pregnant');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Status & Validation State
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!patient.id && patient.id !== 'PAT-DEMO-001');

  useEffect(() => {
    if (audioEnabled) {
      speakPrompt(t.patientIdAudio, currentLanguage);
    }
  }, [patientType, currentLanguage, audioEnabled]);

  const handleKeypadPress = (digit: string) => {
    if (existingIdentifier.length < 15) {
      setExistingIdentifier((prev) => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setExistingIdentifier((prev) => prev.slice(0, -1));
  };

  // 1. Existing Patient Login Handler
  const handleExistingPatientLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedback(null);

    const cleanId = existingIdentifier.trim();
    if (!cleanId) {
      setFeedback({
        type: 'error',
        message: currentLanguage === 'hi'
          ? 'कृपया अपना मरीज आईडी या 10 अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter your Patient ID or registered 10-digit mobile number.',
      });
      return;
    }
    if (!existingPassword) {
      setFeedback({
        type: 'error',
        message: currentLanguage === 'hi'
          ? 'कृपया अपना पासवर्ड दर्ज करें।'
          : 'Please enter your password.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { patient: loggedInPatient } = await apiLoginPatient(cleanId, existingPassword);
      setIsAuthenticated(true);
      setFeedback({
        type: 'success',
        message: currentLanguage === 'hi'
          ? `✓ स्वागत है, ${loggedInPatient.name}! मरीज आईडी: ${loggedInPatient.patientId}`
          : `✓ Welcome back, ${loggedInPatient.name}! Patient ID: ${loggedInPatient.patientId}`,
      });

      onUpdatePatient({
        id: loggedInPatient.patientId,
        name: loggedInPatient.name,
        phone: loggedInPatient.phone,
        abhaId: `${loggedInPatient.phone}@abdm`,
        age: loggedInPatient.age,
        gender: loggedInPatient.gender as any,
      });

      playAudioConfirmation({
        text: INTAKE_AUDIO_CONFIRMATIONS.patientLoggedIn(loggedInPatient.name, currentLanguage),
        language: currentLanguage,
        audioEnabled,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (currentLanguage === 'hi' ? 'लॉगिन विफल रहा।' : 'Login failed.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. New Patient Registration Handler
  const handleNewPatientRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedback(null);

    const cleanName = regName.trim();
    const cleanPhone = regPhone.trim();
    const parsedAge = parseInt(regAge.trim(), 10);

    if (!cleanName) {
      setFeedback({
        type: 'error',
        message: currentLanguage === 'hi' ? 'कृपया मरीज का नाम दर्ज करें।' : 'Please enter patient full name.',
      });
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      setFeedback({
        type: 'error',
        message: currentLanguage === 'hi'
          ? 'कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.',
      });
      return;
    }
    if (!parsedAge || parsedAge < 1 || parsedAge > 125) {
      setFeedback({
        type: 'error',
        message: currentLanguage === 'hi' ? 'कृपया वैध आयु दर्ज करें।' : 'Please enter a valid age.',
      });
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setFeedback({
        type: 'error',
        message: currentLanguage === 'hi'
          ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : 'Password must be at least 6 characters.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { patient: registeredPatient } = await apiRegisterPatient({
        name: cleanName,
        phone: cleanPhone,
        age: parsedAge,
        gender: regGender,
        password: regPassword,
        preferredLanguage: currentLanguage,
        pregnancyStatus: regGender === 'female' ? pregnancyStatus : undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
      });

      setIsAuthenticated(true);
      setFeedback({
        type: 'success',
        message: currentLanguage === 'hi'
          ? `✓ पंजीकरण सफल! विशिष्ट मरीज आईडी: ${registeredPatient.patientId}`
          : `✓ Registration successful! Patient ID: ${registeredPatient.patientId}`,
      });

      onUpdatePatient({
        id: registeredPatient.patientId,
        name: registeredPatient.name,
        phone: registeredPatient.phone,
        abhaId: `${registeredPatient.phone}@abdm`,
        age: registeredPatient.age,
        gender: registeredPatient.gender as any,
        pregnancyStatus: regGender === 'female' ? pregnancyStatus : undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
      } as any);

      playAudioConfirmation({
        text: INTAKE_AUDIO_CONFIRMATIONS.patientRegistered(registeredPatient.name, registeredPatient.patientId, currentLanguage),
        language: currentLanguage,
        audioEnabled,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (currentLanguage === 'hi' ? 'पंजीकरण विफल रहा।' : 'Registration failed.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitNext = () => {
    if (!isAuthenticated && !patient.id) {
      setFeedback({
        type: 'error',
        message: currentLanguage === 'hi'
          ? 'कृपया आगे बढ़ने से पहले बायोमेट्रिक सत्यापन करें, साइन इन करें या नया पंजीकरण पूर्ण करें।'
          : 'Please complete biometric verification, sign in, or register before proceeding to consultation.',
      });
      return;
    }
    onNext();
  };

  return (
    <div id="kiosk-patient-id-view" className="max-w-3xl mx-auto px-4 py-6 sm:py-8 select-none">
      {/* Top Navigation & Audio Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-[8px] bg-[#B5B7A1] border border-[#A9AA94] hover:bg-[#a6a892] text-[#26312B] font-semibold text-sm flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#29483C]" />
          <span>{t.back}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => speakPrompt(t.patientIdAudio, currentLanguage)}
            className="px-3.5 py-2 rounded-[8px] bg-[#B5B7A1] border border-[#A9AA94] text-[#26312B] font-semibold text-xs flex items-center gap-2 cursor-pointer hover:bg-[#a6a892] transition-colors"
          >
            <Volume2 className="w-4 h-4 text-[#29483C]" />
            <span>{t.listen}</span>
          </button>
        </div>
      </div>

      {/* View Heading in DM Serif Display */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-serif text-[#26312B] font-normal mb-1.5 tracking-tight">
          {t.patientIdTitle}
        </h2>
        <p className="text-sm sm:text-base text-[#596058] font-normal">
          {t.patientIdSub}
        </p>
      </div>

      {/* Three Choice Tabs: Biometric Scan (Low-Literacy) vs Mobile/ID vs New Registration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            setPatientType('biometric');
            setFeedback(null);
          }}
          className={`py-3 px-3.5 rounded-[10px] border font-semibold text-xs sm:text-sm flex sm:flex-col items-center justify-center sm:justify-start gap-2 cursor-pointer transition-all ${
            patientType === 'biometric'
              ? 'bg-[#E3DDCA] border-2 border-[#29483C] text-[#29483C] shadow-xs'
              : 'bg-[#B5B7A1] border-[#A9AA94] text-[#596058] hover:bg-[#abae97]'
          }`}
        >
          <div className="flex items-center gap-1">
            <Fingerprint className={`w-5 h-5 ${patientType === 'biometric' ? 'text-[#29483C]' : 'text-[#596058]'}`} />
            <ScanFace className={`w-4 h-4 ${patientType === 'biometric' ? 'text-[#29483C]' : 'text-[#596058]'}`} />
          </div>
          <div className="text-left sm:text-center leading-tight">
            <span className="block font-bold">
              {currentLanguage === 'hi' ? 'बायोमेट्रिक सत्यापन' : currentLanguage === 'te' ? 'బయోమెట్రిక్ స్కాన్' : 'Biometric Scan'}
            </span>
            <span className="text-[10px] text-[#596058]">
              {currentLanguage === 'hi' ? 'अंगूठा / चेहरा (सरल)' : 'Thumb / Face RD'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setPatientType('existing');
            setFeedback(null);
          }}
          className={`py-3 px-3.5 rounded-[10px] border font-semibold text-xs sm:text-sm flex sm:flex-col items-center justify-center sm:justify-start gap-2 cursor-pointer transition-all ${
            patientType === 'existing'
              ? 'bg-[#E3DDCA] border-2 border-[#29483C] text-[#29483C] shadow-xs'
              : 'bg-[#B5B7A1] border-[#A9AA94] text-[#596058] hover:bg-[#abae97]'
          }`}
        >
          <UserCheck className={`w-5 h-5 ${patientType === 'existing' ? 'text-[#29483C]' : 'text-[#596058]'}`} />
          <div className="text-left sm:text-center leading-tight">
            <span className="block font-bold">
              {currentLanguage === 'hi' ? 'मोबाइल / आईडी' : 'Mobile / Patient ID'}
            </span>
            <span className="text-[10px] text-[#596058]">
              {currentLanguage === 'hi' ? 'पुराने मरीज' : 'Existing Patient'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setPatientType('new');
            setFeedback(null);
          }}
          className={`py-3 px-3.5 rounded-[10px] border font-semibold text-xs sm:text-sm flex sm:flex-col items-center justify-center sm:justify-start gap-2 cursor-pointer transition-all ${
            patientType === 'new'
              ? 'bg-[#E3DDCA] border-2 border-[#29483C] text-[#29483C] shadow-xs'
              : 'bg-[#B5B7A1] border-[#A9AA94] text-[#596058] hover:bg-[#abae97]'
          }`}
        >
          <UserPlus className={`w-5 h-5 ${patientType === 'new' ? 'text-[#29483C]' : 'text-[#596058]'}`} />
          <div className="text-left sm:text-center leading-tight">
            <span className="block font-bold">
              {currentLanguage === 'hi' ? 'नया पंजीकरण' : 'New Registration'}
            </span>
            <span className="text-[10px] text-[#596058]">
              {currentLanguage === 'hi' ? 'पहली बार परामर्श' : 'First Visit'}
            </span>
          </div>
        </button>
      </div>

      {/* Active Patient Authenticated Card if already logged in */}
      {isAuthenticated && patient.id && (
        <div className="bg-[#E3DDCA] border border-[#29483C] rounded-[10px] p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[#29483C] text-[#F0EBDD] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-[#26312B]">
                {patient.name} ({patient.id})
              </h4>
              <p className="text-xs text-[#596058] font-mono">
                {patient.phone ? `Phone: ${patient.phone} · ` : ''}{patient.age} Yrs · {patient.gender}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] px-2.5 py-0.5 rounded-[4px] uppercase">
            Active
          </span>
        </div>
      )}

      {/* Alerts / Feedback Message */}
      {feedback && (
        <div
          className={`p-3.5 rounded-[8px] text-xs sm:text-sm font-medium flex items-start gap-2.5 mb-6 border ${
            feedback.type === 'success'
              ? 'bg-[#B5B7A1] text-[#29483C] border-[#29483C]'
              : 'bg-[#E3DDCA] text-[#A65F49] border-[#A65F49]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#29483C] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#A65F49] shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{feedback.message}</span>
        </div>
      )}

      {/* FORM 0: BIOMETRIC AUTHENTICATION (LOW-LITERACY ACCESSIBILITY FLOW) */}
      {patientType === 'biometric' && (
        <div className="mb-6">
          <KioskBiometricAuth
            currentLanguage={currentLanguage}
            onAuthenticated={(patientData) => {
              setIsAuthenticated(true);
              setFeedback({
                type: 'success',
                message:
                  currentLanguage === 'hi'
                    ? `✓ बायोमेट्रिक सत्यापन सफल! स्वागत है, ${patientData.name}।`
                    : `✓ Biometric authentication verified! Welcome, ${patientData.name}.`,
              });
              onUpdatePatient(patientData);
            }}
            audioEnabled={audioEnabled}
          />
        </div>
      )}

      {/* FORM 1: EXISTING PATIENT SIGN IN */}
      {patientType === 'existing' && (
        <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-7 mb-6 space-y-5">
          <form onSubmit={handleExistingPatientLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#596058] mb-1.5">
                {currentLanguage === 'hi'
                  ? 'मरीज आईडी अथवा 10 अंकों का मोबाइल नंबर'
                  : 'Patient ID or Registered 10-Digit Mobile Number'}{' '}
                <span className="text-[#A65F49]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#596058]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={existingIdentifier}
                  onChange={(e) => setExistingIdentifier(e.target.value)}
                  placeholder="e.g. PAT-2026-0001 or 9876543210"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#C9C5AF] border border-[#A9AA94] focus:border-[#29483C] rounded-[8px] text-sm font-mono text-[#26312B] outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#596058] mb-1.5">
                {currentLanguage === 'hi' ? 'पासवर्ड' : 'Account Password'}{' '}
                <span className="text-[#A65F49]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#596058]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={existingPassword}
                  onChange={(e) => setExistingPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#C9C5AF] border border-[#A9AA94] focus:border-[#29483C] rounded-[8px] text-sm font-mono text-[#26312B] outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#29483C] hover:bg-[#1f372e] active:bg-[#1f372e] disabled:opacity-50 text-[#F0EBDD] font-semibold text-sm rounded-[8px] transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#29483C]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'प्रमाणीकरण हो रहा है...'
                      : 'Authenticating Patient...'}
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {currentLanguage === 'hi' ? 'साइन इन करें व सत्यापित करें' : 'Sign In & Verify Account'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Quick Keypad for touchscreen accessibility */}
          <div className="pt-3 border-t border-[#A9AA94]">
            <p className="text-xs font-medium text-[#596058] text-center mb-2">
              {currentLanguage === 'hi' ? 'टचस्क्रीन संख्या कीपैड:' : 'Touchscreen Numeric Pad:'}
            </p>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="py-2.5 bg-[#C9C5AF] hover:bg-[#B5B7A1] rounded-[8px] text-lg font-mono font-semibold text-[#26312B] border border-[#A9AA94] cursor-pointer transition-colors"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-2.5 bg-[#C9C5AF] hover:bg-[#B5B7A1] rounded-[8px] text-lg font-mono font-semibold text-[#26312B] border border-[#A9AA94] cursor-pointer transition-colors"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-2.5 bg-[#C9C5AF] hover:bg-[#B5B7A1] text-[#26312B] rounded-[8px] flex items-center justify-center border border-[#A9AA94] cursor-pointer"
                title="Delete"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM 2: NEW PATIENT REGISTRATION */}
      {patientType === 'new' && (
        <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-7 mb-6 space-y-4">
          <div className="pb-3 border-b border-[#A9AA94]">
            <h3 className="text-base font-semibold text-[#26312B]">
              {currentLanguage === 'hi'
                ? 'नए मरीज का डिजिटल पंजीकरण'
                : 'New Patient Registration'}
            </h3>
            <p className="text-xs text-[#596058] mt-0.5">
              {currentLanguage === 'hi'
                ? 'अस्पताल के डेटाबेस में खाता बनाएं और विशिष्ट मरीज आईडी प्राप्त करें'
                : 'Create hospital profile and obtain unique Patient ID'}
            </p>
          </div>

          <form onSubmit={handleNewPatientRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#596058] mb-1.5">
                {t.fullNameLabel} <span className="text-[#A65F49]">*</span>
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-[#C9C5AF] border border-[#A9AA94] focus:border-[#29483C] rounded-[8px] px-3.5 py-2.5 text-sm font-medium text-[#26312B] outline-none transition-colors"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#596058] mb-1.5">
                  {currentLanguage === 'hi' ? '10 अंकों का मोबाइल नंबर' : '10-Digit Mobile Phone'}{' '}
                  <span className="text-[#A65F49]">*</span>
                </label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-[#B5B7A1] border border-[#A9AA94] rounded-[8px] text-[#596058] font-semibold text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="flex-1 bg-[#C9C5AF] border border-[#A9AA94] focus:border-[#29483C] rounded-[8px] px-3 py-2.5 text-sm font-mono text-[#26312B] outline-none transition-colors"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#596058] mb-1.5">
                  {t.ageLabel} <span className="text-[#A65F49]">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={125}
                  value={regAge}
                  onChange={(e) => setRegAge(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full bg-[#C9C5AF] border border-[#A9AA94] focus:border-[#29483C] rounded-[8px] px-3.5 py-2.5 text-sm font-medium text-[#26312B] outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#596058] mb-1.5">
                {t.genderLabel} <span className="text-[#A65F49]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setRegGender(g)}
                    className={`py-2 px-3 rounded-[8px] font-semibold text-xs border cursor-pointer transition-all ${
                      regGender === g
                        ? 'bg-[#29483C] text-[#F0EBDD] border-[#29483C]'
                        : 'bg-[#C9C5AF] text-[#26312B] border-[#A9AA94] hover:bg-[#B5B7A1]'
                    }`}
                  >
                    {g === 'male' ? t.genderMale : g === 'female' ? t.genderFemale : t.genderOther}
                  </button>
                ))}
              </div>
            </div>

            {/* Pregnancy Status (Relevant for female patients age 12-55) */}
            {regGender === 'female' && parseInt(regAge, 10) >= 12 && parseInt(regAge, 10) <= 55 && (
              <div className="p-3 bg-[#B5B7A1] border border-[#A9AA94] rounded-[8px] space-y-2">
                <label className="block text-[11px] font-semibold text-[#596058] uppercase tracking-wider">
                  {currentLanguage === 'hi' ? 'गर्भावस्था स्थिति (यदि लागू हो)' : 'Relevant Pregnancy Status'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'not_pregnant', en: 'Not Pregnant', hi: 'गर्भवती नहीं' },
                    { id: 'pregnant', en: 'Currently Pregnant', hi: 'गर्भवती' },
                    { id: 'postpartum', en: 'Postpartum / Nursing', hi: 'प्रसवोपरांत' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPregnancyStatus(p.id as any)}
                      className={`py-1.5 px-2 text-xs font-medium rounded-[6px] border transition-all cursor-pointer ${
                        pregnancyStatus === p.id
                          ? 'bg-[#29483C] text-[#F0EBDD] border-[#29483C]'
                          : 'bg-[#C9C5AF] text-[#26312B] border-[#A9AA94] hover:bg-[#B5B7A1]'
                      }`}
                    >
                      {currentLanguage === 'hi' ? p.hi : p.en}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Minor Guardian Consent (Relevant if age < 18) */}
            {parseInt(regAge, 10) > 0 && parseInt(regAge, 10) < 18 && (
              <div className="p-3 bg-[#B5B7A1] border border-[#A9AA94] rounded-[8px] space-y-2">
                <label className="text-[11px] font-semibold text-[#596058] uppercase tracking-wider block">
                  {currentLanguage === 'hi'
                    ? 'नाबालिग मरीज: माता-पिता / अभिभावक सहमति'
                    : 'Minor Patient: Parent / Guardian Consent'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Parent / Guardian Name"
                    className="w-full bg-[#C9C5AF] border border-[#A9AA94] rounded-[6px] px-3 py-1.5 text-xs text-[#26312B] outline-none"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Guardian Emergency Phone"
                    className="w-full bg-[#C9C5AF] border border-[#A9AA94] rounded-[6px] px-3 py-1.5 text-xs font-mono text-[#26312B] outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#596058] mb-1.5">
                {currentLanguage === 'hi' ? 'पासवर्ड बनाएं (कम से कम 6 अक्षर)' : 'Create Password (min 6 characters)'}{' '}
                <span className="text-[#A65F49]">*</span>
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#C9C5AF] border border-[#A9AA94] focus:border-[#29483C] rounded-[8px] px-3.5 py-2.5 text-sm font-mono text-[#26312B] outline-none transition-colors"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#29483C] hover:bg-[#1f372e] active:bg-[#1f372e] disabled:opacity-50 text-[#F0EBDD] font-semibold text-sm rounded-[8px] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 border border-[#29483C]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'पंजीकरण हो रहा है...'
                      : 'Registering Patient Profile...'}
                  </span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'पंजीकरण पूर्ण करें व मरीज आईडी प्राप्त करें'
                      : 'Complete Registration & Get Patient ID'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Primary Proceed Action */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleSubmitNext}
          className="w-full max-w-md h-[52px] px-8 bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] text-base font-semibold rounded-[8px] flex items-center justify-center gap-3 cursor-pointer transition-all border border-[#29483C]"
        >
          <span className="tracking-wide">{currentLanguage === 'hi' ? 'परामर्श के लिए आगे बढ़ें' : 'Proceed to Consultation'}</span>
          <ArrowRight className="w-5 h-5 text-[#B99B6B]" />
        </button>
      </div>
    </div>
  );
};
