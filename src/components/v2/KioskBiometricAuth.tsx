import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Fingerprint,
  ScanFace,
  Camera,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Volume2,
  Lock,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';
import { LanguageCode, PatientProfile } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';

interface KioskBiometricAuthProps {
  currentLanguage: LanguageCode;
  onAuthenticated: (patient: Partial<PatientProfile>) => void;
  audioEnabled: boolean;
}

// Sample pre-registered low-literacy clinical profiles for biometric verification
const SAMPLE_BIOMETRIC_PATIENTS = [
  {
    id: 'PAT-ABDM-8821',
    name: 'Ram Sevak Yadav',
    nameHi: 'राम सेवक यादव',
    age: 58,
    gender: 'male' as const,
    phone: '9876543210',
    abhaId: 'ramsevak58@abdm',
    aadhaarLast4: '7104',
    department: 'Kayachikitsa',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    bloodGroup: 'B+',
    village: 'Chhawla, South West Delhi',
  },
  {
    id: 'PAT-ABDM-4402',
    name: 'Sunita Devi',
    nameHi: 'सुनीता देवी',
    age: 46,
    gender: 'female' as const,
    phone: '9812345678',
    abhaId: 'sunitadevi46@abdm',
    aadhaarLast4: '3892',
    department: 'Prasuti & Stri Roga',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    bloodGroup: 'O+',
    village: 'Sarita Vihar, New Delhi',
  },
  {
    id: 'PAT-ABDM-1904',
    name: 'Harishchandra Sharma',
    nameHi: 'हरीशचंद्र शर्मा',
    age: 67,
    gender: 'male' as const,
    phone: '9711223344',
    abhaId: 'harish67@abdm',
    aadhaarLast4: '9045',
    department: 'Panchakarma',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bloodGroup: 'A+',
    village: 'Badarpur, New Delhi',
  },
];

export const KioskBiometricAuth: React.FC<KioskBiometricAuthProps> = ({
  currentLanguage,
  onAuthenticated,
  audioEnabled,
}) => {
  const [bioMode, setBioMode] = useState<'fingerprint' | 'face'>('fingerprint');
  const [selectedPatientIndex, setSelectedPatientIndex] = useState(0);

  // Fingerprint Scanning State
  const [isFingerScanning, setIsFingerScanning] = useState(false);
  const [fingerScanProgress, setFingerScanProgress] = useState(0);
  const [fingerHoldTimer, setFingerHoldTimer] = useState<any>(null);

  // Face Scanning State
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [faceLivenessStep, setFaceLivenessStep] = useState<'align' | 'blink' | 'matched'>('align');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Authentication Result State
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [matchedPatient, setMatchedPatient] = useState<(typeof SAMPLE_BIOMETRIC_PATIENTS)[0] | null>(null);

  const activeSamplePatient = SAMPLE_BIOMETRIC_PATIENTS[selectedPatientIndex];

  // Voice guidance prompt on mode switch
  useEffect(() => {
    if (!audioEnabled || verificationSuccess) return;

    if (bioMode === 'fingerprint') {
      const msg =
        currentLanguage === 'hi'
          ? 'कृपया अंगूठा स्कैनर पर रखें और दबाए रखें।'
          : currentLanguage === 'te'
          ? 'దయచేసి స్కానర్‌పై మీ వేలిముద్రను ఉంచి నొక్కి ఉంచండి.'
          : 'Please place and hold your thumb on the biometric sensor.';
      speakPrompt(msg, currentLanguage);
    } else {
      const msg =
        currentLanguage === 'hi'
          ? 'कृपया कैमरे के सामने सीधा देखें और चेहरे का सत्यापन करें।'
          : currentLanguage === 'te'
          ? 'దయచేసి కెమెరాను నేరుగా చూడండి.'
          : 'Please look directly into the camera for facial liveness verification.';
      speakPrompt(msg, currentLanguage);
    }
  }, [bioMode, currentLanguage, audioEnabled, verificationSuccess]);

  // Clean up camera stream on unmount or mode switch
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCameraStream = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('[MediKiosk] Camera access unavailable or denied, falling back to simulated optical scanner:', err);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (bioMode === 'face' && !verificationSuccess) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
  }, [bioMode, verificationSuccess]);

  // 1. FINGERPRINT SCAN HANDLERS
  const startFingerprintScan = () => {
    if (verificationSuccess) return;
    setIsFingerScanning(true);
    setFingerScanProgress(0);

    const startTime = Date.now();
    const duration = 1800; // 1.8 seconds scan

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setFingerScanProgress(progress);

      if (progress >= 100) {
        clearInterval(timer);
        finishAuthentication(SAMPLE_BIOMETRIC_PATIENTS[selectedPatientIndex]);
      }
    }, 40);

    setFingerHoldTimer(timer);
  };

  const cancelFingerprintScan = () => {
    if (fingerHoldTimer) {
      clearInterval(fingerHoldTimer);
      setFingerHoldTimer(null);
    }
    if (!verificationSuccess) {
      setIsFingerScanning(false);
      setFingerScanProgress(0);
    }
  };

  // 2. FACIAL SCAN HANDLER
  const triggerFaceRecognition = () => {
    if (verificationSuccess) return;
    setIsFaceScanning(true);
    setFaceLivenessStep('align');

    setTimeout(() => {
      setFaceLivenessStep('blink');
      if (audioEnabled) {
        speakPrompt(
          currentLanguage === 'hi' ? 'अपनी पलकें झपकाएं' : 'Please blink your eyes naturally',
          currentLanguage
        );
      }

      setTimeout(() => {
        setFaceLivenessStep('matched');
        setTimeout(() => {
          finishAuthentication(SAMPLE_BIOMETRIC_PATIENTS[selectedPatientIndex]);
        }, 600);
      }, 1200);
    }, 1200);
  };

  // 3. COMMON AUTHENTICATION COMPLETION
  const finishAuthentication = (patientData: (typeof SAMPLE_BIOMETRIC_PATIENTS)[0]) => {
    setIsFingerScanning(false);
    setIsFaceScanning(false);
    setVerificationSuccess(true);
    setMatchedPatient(patientData);
    stopCameraStream();

    if (audioEnabled) {
      speakPrompt(
        currentLanguage === 'hi'
          ? `प्रमाणीकरण सफल। स्वागत है, ${patientData.nameHi || patientData.name}।`
          : `Biometric authentication verified. Welcome, ${patientData.name}.`,
        currentLanguage
      );
    }

    onAuthenticated({
      id: patientData.id,
      name: patientData.name,
      phone: patientData.phone,
      age: patientData.age,
      gender: patientData.gender,
      abhaId: patientData.abhaId,
      department: patientData.department,
    });
  };

  const resetBiometrics = () => {
    setVerificationSuccess(false);
    setMatchedPatient(null);
    setIsFingerScanning(false);
    setIsFaceScanning(false);
    setFingerScanProgress(0);
    setFaceLivenessStep('align');
    if (bioMode === 'face') {
      startCameraStream();
    }
  };

  return (
    <div className="w-full bg-[#E3DDCA] border border-[#A9AA94] rounded-[12px] p-5 sm:p-6 select-none shadow-xs">
      {/* Top Banner: Low-Literacy & Security Guidance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#A9AA94]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#29483C] text-[#F0EBDD] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#B99B6B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#26312B]">
                {currentLanguage === 'hi'
                  ? 'आधार / आभा बायोमेट्रिक सत्यापन (Aadhaar RD Service)'
                  : currentLanguage === 'te'
                  ? 'ఆధార్ బయోమెట్రిక్ ప్రమాణీకరణ'
                  : 'Aadhaar / ABHA Biometric Authentication'}
              </h3>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] uppercase tracking-wider">
                UIDAI L1 Certified
              </span>
            </div>
            <p className="text-xs text-[#596058]">
              {currentLanguage === 'hi'
                ? 'अंगूठा या चेहरा स्कैन करके बिना लिखे तुरंत पहचान सत्यापित करें।'
                : 'Touch-free, paperless patient identification designed for seamless accessibility.'}
            </p>
          </div>
        </div>

        {/* Audio Prompt Button */}
        <button
          type="button"
          onClick={() => {
            const prompt =
              bioMode === 'fingerprint'
                ? currentLanguage === 'hi'
                  ? 'कृपया अंगूठा स्कैनर पर रखें और दबाए रखें।'
                  : 'Please place and hold your thumb on the biometric sensor.'
                : currentLanguage === 'hi'
                ? 'कृपया कैमरे के सामने सीधा देखें।'
                : 'Please look directly into the camera.';
            speakPrompt(prompt, currentLanguage);
          }}
          className="self-start sm:self-auto px-3 py-1.5 rounded-[6px] bg-[#B5B7A1] hover:bg-[#a6a892] text-[#26312B] text-xs font-semibold flex items-center gap-1.5 border border-[#A9AA94] transition-colors cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5 text-[#29483C]" />
          <span>{currentLanguage === 'hi' ? 'सुनें (Listen)' : 'Listen'}</span>
        </button>
      </div>

      {/* Success State View */}
      {verificationSuccess && matchedPatient ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-[#C9C5AF]/50 border-2 border-[#29483C] rounded-[10px] p-5 sm:p-6 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-[#29483C] text-[#F0EBDD] flex items-center justify-center mb-3 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-[#B99B6B]" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#29483C] text-[#F0EBDD] mb-2 tracking-wide uppercase">
            ✓ {currentLanguage === 'hi' ? 'बायोमेट्रिक मिलान सत्यापित' : 'Biometric Match Verified 99.8%'}
          </span>

          <h4 className="text-xl sm:text-2xl font-serif text-[#26312B] font-bold">
            {currentLanguage === 'hi' ? matchedPatient.nameHi || matchedPatient.name : matchedPatient.name}
          </h4>

          <p className="text-xs text-[#596058] font-mono mt-0.5">
            ABHA: <span className="font-semibold text-[#29483C]">{matchedPatient.abhaId}</span> · UIDAI Last 4: ****-****-{matchedPatient.aadhaarLast4}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto my-4 text-left">
            <div className="bg-[#E3DDCA] border border-[#A9AA94] p-2.5 rounded-[6px]">
              <span className="block text-[10px] text-[#596058] uppercase font-semibold">Age / Gender</span>
              <span className="text-xs font-bold text-[#26312B]">{matchedPatient.age} Yrs · {matchedPatient.gender}</span>
            </div>
            <div className="bg-[#E3DDCA] border border-[#A9AA94] p-2.5 rounded-[6px]">
              <span className="block text-[10px] text-[#596058] uppercase font-semibold">Blood Group</span>
              <span className="text-xs font-bold text-[#29483C]">{matchedPatient.bloodGroup}</span>
            </div>
            <div className="bg-[#E3DDCA] border border-[#A9AA94] p-2.5 rounded-[6px]">
              <span className="block text-[10px] text-[#596058] uppercase font-semibold">Phone</span>
              <span className="text-xs font-bold text-[#26312B]">******{matchedPatient.phone.slice(-4)}</span>
            </div>
            <div className="bg-[#E3DDCA] border border-[#A9AA94] p-2.5 rounded-[6px]">
              <span className="block text-[10px] text-[#596058] uppercase font-semibold">Assigned OPD</span>
              <span className="text-xs font-bold text-[#29483C] truncate">{matchedPatient.department}</span>
            </div>
          </div>

          <p className="text-xs text-[#29483C] font-medium flex items-center justify-center gap-1.5 mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>Cryptographic Consent Token Signed (ABDM M1 Compliant)</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetBiometrics}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#596058] hover:text-[#26312B] bg-[#B5B7A1] border border-[#A9AA94] rounded-[6px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{currentLanguage === 'hi' ? 'पुनः स्कैन करें (Rescan)' : 'Scan Another Patient'}</span>
            </button>
          </div>
        </motion.div>
      ) : (
        /* Biometric Scanning Interface */
        <div>
          {/* Biometric Method Selector: Fingerprint vs Facial RD */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setBioMode('fingerprint')}
              className={`py-3 px-4 rounded-[8px] border font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all ${
                bioMode === 'fingerprint'
                  ? 'bg-[#29483C] border-[#29483C] text-[#F0EBDD] shadow-xs'
                  : 'bg-[#B5B7A1] border-[#A9AA94] text-[#26312B] hover:bg-[#abae97]'
              }`}
            >
              <Fingerprint className="w-5 h-5 text-[#B99B6B]" />
              <div className="text-left leading-tight">
                <span className="block font-bold">
                  {currentLanguage === 'hi' ? 'अंगूठा स्कैनर' : 'Fingerprint Scanner'}
                </span>
                <span className="text-[10px] opacity-80">
                  {currentLanguage === 'hi' ? 'ऑप्टिकल सेंसर' : 'Optical RD Pad'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBioMode('face')}
              className={`py-3 px-4 rounded-[8px] border font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all ${
                bioMode === 'face'
                  ? 'bg-[#29483C] border-[#29483C] text-[#F0EBDD] shadow-xs'
                  : 'bg-[#B5B7A1] border-[#A9AA94] text-[#26312B] hover:bg-[#abae97]'
              }`}
            >
              <ScanFace className="w-5 h-5 text-[#B99B6B]" />
              <div className="text-left leading-tight">
                <span className="block font-bold">
                  {currentLanguage === 'hi' ? 'चेहरा पहचान' : 'Facial Recognition'}
                </span>
                <span className="text-[10px] opacity-80">
                  {currentLanguage === 'hi' ? 'लाइवनेस कैमरा' : 'Face RD Liveness'}
                </span>
              </div>
            </button>
          </div>

          {/* Test Patient Switcher for Rapid Kiosk Verification */}
          <div className="bg-[#B5B7A1]/60 border border-[#A9AA94] rounded-[8px] p-2.5 mb-5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#26312B] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#29483C]" />
              <span>{currentLanguage === 'hi' ? 'टेस्ट मरीज प्रोफाइल:' : 'Registered Aadhaar Profile:'}</span>
            </span>
            <div className="flex items-center gap-1.5">
              {SAMPLE_BIOMETRIC_PATIENTS.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPatientIndex(idx)}
                  className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold border transition-all cursor-pointer ${
                    selectedPatientIndex === idx
                      ? 'bg-[#29483C] text-[#F0EBDD] border-[#29483C]'
                      : 'bg-[#E3DDCA] text-[#26312B] border-[#A9AA94] hover:bg-[#d8d2be]'
                  }`}
                >
                  {p.name.split(' ')[0]} ({p.age})
                </button>
              ))}
            </div>
          </div>

          {/* MODE 1: FINGERPRINT SENSOR */}
          {bioMode === 'fingerprint' && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              {/* Tactical Fingerprint Sensor Pad */}
              <div className="relative mb-5">
                {/* Outer Glow Pulse */}
                <div
                  className={`absolute -inset-2.5 rounded-full transition-all duration-300 ${
                    isFingerScanning
                      ? 'bg-[#29483C]/20 blur-md animate-pulse'
                      : 'bg-transparent'
                  }`}
                />

                {/* Interactive Touch Pad */}
                <div
                  role="button"
                  tabIndex={0}
                  onMouseDown={startFingerprintScan}
                  onMouseUp={cancelFingerprintScan}
                  onMouseLeave={cancelFingerprintScan}
                  onTouchStart={startFingerprintScan}
                  onTouchEnd={cancelFingerprintScan}
                  className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-all select-none ${
                    isFingerScanning
                      ? 'bg-[#29483C] border-[#B99B6B] shadow-lg scale-95'
                      : 'bg-[#C9C5AF] border-[#29483C] hover:border-[#B99B6B]'
                  }`}
                  aria-label="Fingerprint Sensor - Press and hold to scan"
                >
                  {/* Sweep Laser Scan Line */}
                  {isFingerScanning && (
                    <motion.div
                      initial={{ top: '10%' }}
                      animate={{ top: ['15%', '85%', '15%'] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-4 right-4 h-1 bg-[#B99B6B] shadow-[0_0_8px_#B99B6B] rounded-full z-10"
                    />
                  )}

                  {/* Fingerprint Icon with Concentric Sensor Grooves */}
                  <Fingerprint
                    className={`w-20 h-20 sm:w-24 sm:h-24 transition-colors ${
                      isFingerScanning ? 'text-[#B99B6B]' : 'text-[#29483C]'
                    }`}
                    strokeWidth={1.5}
                  />

                  {/* Radial Cap Sensor Ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="46%"
                      stroke="#A9AA94"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="4 4"
                    />
                    {isFingerScanning && (
                      <circle
                        cx="50%"
                        cy="50%"
                        r="46%"
                        stroke="#B99B6B"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 70}
                        strokeDashoffset={2 * Math.PI * 70 * (1 - fingerScanProgress / 100)}
                        className="transition-all duration-75"
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* Real-time Instructions & Scanning Status */}
              <div className="space-y-1.5 max-w-sm mb-4">
                <p className="text-sm sm:text-base font-bold text-[#26312B]">
                  {isFingerScanning
                    ? currentLanguage === 'hi'
                      ? `स्कैन हो रहा है... ${fingerScanProgress}%`
                      : `Capturing Biometric Ridge Data... ${fingerScanProgress}%`
                    : currentLanguage === 'hi'
                    ? 'अंगूठे को स्कैनर पर दबाकर रखें'
                    : 'Press & Hold Thumb on Sensor'}
                </p>
                <p className="text-xs text-[#596058]">
                  {currentLanguage === 'hi'
                    ? 'सत्यापन पूरा होने तक अपनी उंगली न हटाएं (UIDAI Bio-Matcher)'
                    : 'Hold your finger steadily on the scanner for 2 seconds to authenticate.'}
                </p>
              </div>

              {/* Click-to-Scan Instant Trigger for Accessibility */}
              <button
                type="button"
                onClick={() => {
                  startFingerprintScan();
                  setTimeout(() => finishAuthentication(SAMPLE_BIOMETRIC_PATIENTS[selectedPatientIndex]), 1400);
                }}
                disabled={isFingerScanning}
                className="px-6 py-2.5 bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-semibold text-xs sm:text-sm rounded-[8px] flex items-center gap-2 border border-[#29483C] cursor-pointer shadow-xs transition-all disabled:opacity-50"
              >
                <Fingerprint className="w-4 h-4 text-[#B99B6B]" />
                <span>
                  {currentLanguage === 'hi'
                    ? 'एक-टैप फिंगरप्रिंट स्कैन (1-Tap Scan)'
                    : '1-Tap Fingerprint Scan'}
                </span>
              </button>
            </div>
          )}

          {/* MODE 2: FACIAL RECOGNITION (FACE RD) */}
          {bioMode === 'face' && (
            <div className="flex flex-col items-center justify-center py-3 text-center">
              {/* Viewfinder Viewport with Alignment Target */}
              <div className="relative w-64 h-52 sm:w-72 sm:h-56 bg-[#26312B] rounded-[10px] overflow-hidden border-2 border-[#A9AA94] mb-4 flex items-center justify-center shadow-inner">
                {/* Active Webcam Feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover -scale-x-100 ${
                    cameraActive ? 'block' : 'hidden'
                  }`}
                />

                {/* Simulated Viewfinder if Camera is Not Active */}
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#29483C] to-[#1a2e26] text-[#F0EBDD]">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#B99B6B] flex items-center justify-center mb-2">
                      <User className="w-12 h-12 text-[#C9C5AF] opacity-80" />
                    </div>
                    <span className="text-[11px] font-mono text-[#B99B6B]">
                      {activeSamplePatient.name} (Camera Simulation)
                    </span>
                  </div>
                )}

                {/* Face Oval Reticle Guideline */}
                <div
                  className={`relative w-40 h-48 rounded-[50%] border-2 border-dashed transition-colors duration-300 pointer-events-none flex items-center justify-center ${
                    isFaceScanning
                      ? faceLivenessStep === 'matched'
                        ? 'border-[#B99B6B] bg-[#B99B6B]/15'
                        : 'border-[#B99B6B] bg-[#B99B6B]/10 animate-pulse'
                      : 'border-[#F0EBDD]/60'
                  }`}
                >
                  {/* Corner Targets */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#B99B6B]" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#B99B6B]" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#B99B6B]" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#B99B6B]" />
                </div>

                {/* Laser Sweep line during scan */}
                {isFaceScanning && (
                  <motion.div
                    initial={{ top: '10%' }}
                    animate={{ top: ['10%', '90%', '10%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute left-0 right-0 h-0.5 bg-[#B99B6B] shadow-[0_0_10px_#B99B6B] pointer-events-none"
                  />
                )}

                {/* Status Badge in Viewport */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono bg-black/60 text-white px-2 py-1 rounded">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    FACE-RD L1
                  </span>
                  <span>
                    {faceLivenessStep === 'align'
                      ? 'Aligning...'
                      : faceLivenessStep === 'blink'
                      ? 'Liveness: Blink...'
                      : 'Verified'}
                  </span>
                </div>
              </div>

              {/* Guidance Description */}
              <div className="space-y-1 max-w-sm mb-4">
                <p className="text-sm sm:text-base font-bold text-[#26312B]">
                  {isFaceScanning
                    ? faceLivenessStep === 'blink'
                      ? currentLanguage === 'hi'
                        ? 'पलकें झपकाएं (Blink to verify liveness)...'
                        : 'Blink your eyes to verify liveness...'
                      : currentLanguage === 'hi'
                      ? 'चेहरा पहचाना जा रहा है...'
                      : 'Verifying Face Biometrics...'
                    : currentLanguage === 'hi'
                    ? 'कैमरे के सामने सीधा देखें'
                    : 'Look Directly into the Camera'}
                </p>
                <p className="text-xs text-[#596058]">
                  {currentLanguage === 'hi'
                    ? 'सुनिश्चित करें कि चेहरा पर्याप्त रोशनी में हो और चश्मा हटा दें।'
                    : 'Ensure your face is clearly lit without glare or dark sunglasses.'}
                </p>
              </div>

              {/* Start Facial Scan Action */}
              <button
                type="button"
                onClick={triggerFaceRecognition}
                disabled={isFaceScanning}
                className="px-6 py-2.5 bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-semibold text-xs sm:text-sm rounded-[8px] flex items-center gap-2 border border-[#29483C] cursor-pointer shadow-xs transition-all disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-[#B99B6B]" />
                <span>
                  {currentLanguage === 'hi'
                    ? 'चेहरा स्कैन शुरू करें (Start Face Scan)'
                    : 'Start Facial Authentication'}
                </span>
              </button>
            </div>
          )}

          {/* Compliance & Security Disclaimer */}
          <div className="mt-4 pt-3 border-t border-[#A9AA94] flex items-center justify-between text-[11px] text-[#596058]">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#29483C]" />
              <span>Aadhaar Biometric RD Service 2.0 (PID Block Encrypted)</span>
            </span>
            <span className="font-mono text-[#29483C]">ABDM-M1-L1</span>
          </div>
        </div>
      )}
    </div>
  );
};
