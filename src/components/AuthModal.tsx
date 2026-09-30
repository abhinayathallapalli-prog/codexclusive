import React, { useState } from 'react';
import {
  X,
  Lock,
  User,
  Phone,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
  KeyRound,
  Shield,
  BadgeInfo,
  Calendar,
} from 'lucide-react';
import { apiLoginPatient, apiRegisterPatient, apiLoginDoctor } from '../lib/api';
import { UserAccount } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserAccount) => void;
  onDoctorAuthSuccess?: (doctor: any) => void;
  initialPortal?: 'patient' | 'doctor';
  intendedActionNotice?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onDoctorAuthSuccess,
  initialPortal = 'patient',
  intendedActionNotice,
}) => {
  const [activePortal, setActivePortal] = useState<'patient' | 'doctor'>(initialPortal);
  const [patientMode, setPatientMode] = useState<'login' | 'register'>('login');

  // Patient Login state
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [patientPassword, setPatientPassword] = useState('');

  // Patient Registration state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other'>('male');
  const [regPassword, setRegPassword] = useState('');
  const [regLang, setRegLang] = useState('hi');

  // Doctor Login state
  const [doctorId, setDoctorId] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');

  // UI status state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // 1. Handle Patient Login
  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!patientIdentifier.trim()) {
      setErrorMsg('Please enter your Patient ID or registered 10-digit mobile number.');
      return;
    }
    if (!patientPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const { patient, token } = await apiLoginPatient(patientIdentifier.trim(), patientPassword);
      setSuccessMsg(`Welcome back, ${patient.name}! You are now logged in.`);
      
      const userAccount: UserAccount = {
        uid: patient.id,
        email: `${patient.phone}@medikiosk.internal`,
        displayName: patient.name,
        phone: patient.phone,
        abhaId: `${patient.phone}@abdm`,
        role: 'patient',
        createdAt: patient.createdAt,
      };

      setTimeout(() => {
        onAuthSuccess(userAccount);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Patient Registration
  const handlePatientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    const cleanName = regName.trim();
    const cleanPhone = regPhone.replace(/\D/g, '');
    const ageNum = parseInt(regAge, 10);

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your full patient name (minimum 2 characters).');
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!regAge || isNaN(ageNum) || ageNum <= 0 || ageNum > 125) {
      setErrorMsg('Please enter a valid age between 1 and 125.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const { patient } = await apiRegisterPatient({
        name: cleanName,
        phone: cleanPhone,
        age: ageNum,
        gender: regGender,
        password: regPassword,
        preferredLanguage: regLang,
      });

      setSuccessMsg(
        `Registration complete! Your Patient ID is ${patient.patientId}. You are logged in.`
      );

      const userAccount: UserAccount = {
        uid: patient.id,
        email: `${cleanPhone}@medikiosk.internal`,
        displayName: patient.name,
        phone: patient.phone,
        abhaId: `${cleanPhone}@abdm`,
        role: 'patient',
        createdAt: patient.createdAt,
      };

      setTimeout(() => {
        onAuthSuccess(userAccount);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Doctor Login
  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!doctorId.trim()) {
      setErrorMsg('Please enter your Doctor ID (e.g. DOC-AYU-001).');
      return;
    }
    if (!doctorPassword) {
      setErrorMsg('Please enter your doctor password.');
      return;
    }

    setIsLoading(true);
    try {
      const { doctor } = await apiLoginDoctor(doctorId.trim(), doctorPassword);
      setSuccessMsg(`Welcome, ${doctor.name}! Accessing clinical desk...`);

      const userAccount: UserAccount = {
        uid: doctor.id,
        email: doctor.email,
        displayName: doctor.name,
        phone: doctor.phone || '',
        abhaId: '',
        role: 'admin',
        createdAt: doctor.createdAt,
      };

      setTimeout(() => {
        if (onDoctorAuthSuccess) {
          onDoctorAuthSuccess(doctor);
        }
        onAuthSuccess(userAccount);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Doctor authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for development test doctor
  const handleFillTestDoctor = () => {
    setDoctorId('DOC-AYU-001');
    setDoctorPassword('AyurDoc@2026!');
    setErrorMsg('');
  };

  // One-click instant login for test doctor
  const handleQuickLoginAsTestDoctor = async () => {
    resetFormState();
    setDoctorId('DOC-AYU-001');
    setDoctorPassword('AyurDoc@2026!');
    setIsLoading(true);
    try {
      const { doctor } = await apiLoginDoctor('DOC-AYU-001', 'AyurDoc@2026!');
      setSuccessMsg(`Welcome, ${doctor.name}! Accessing clinical desk...`);

      const userAccount: UserAccount = {
        uid: doctor.id,
        email: doctor.email,
        displayName: doctor.name,
        phone: doctor.phone || '',
        abhaId: '',
        role: 'admin',
        createdAt: doctor.createdAt,
      };

      setTimeout(() => {
        if (onDoctorAuthSuccess) {
          onDoctorAuthSuccess(doctor);
        }
        onAuthSuccess(userAccount);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Doctor authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="auth-modal-card"
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-150">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                activePortal === 'doctor'
                  ? 'bg-slate-900 text-teal-400'
                  : 'bg-teal-600 text-white'
              }`}
            >
              {activePortal === 'doctor' ? (
                <Stethoscope className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {activePortal === 'doctor' ? 'Doctor Clinical Authentication' : 'MediKiosk Patient Portal'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {activePortal === 'doctor'
                  ? 'Restricted to authorized hospital practitioners'
                  : 'Sign in to access your consultations or register a new profile'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice if triggered by unauthorized access */}
        {intendedActionNotice && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
            <BadgeInfo className="w-4 h-4 shrink-0 text-amber-700" />
            <span>{intendedActionNotice}</span>
          </div>
        )}

        {/* Portal Switcher Tabs: Patient vs Doctor */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-250">
          <button
            type="button"
            onClick={() => {
              setActivePortal('patient');
              resetFormState();
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortal === 'patient'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-teal-600" />
            <span>Patient Portal</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActivePortal('doctor');
              resetFormState();
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortal === 'doctor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <span>Doctor Login</span>
          </button>
        </div>

        {/* Alerts: Error & Success */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* TAB 1: PATIENT PORTAL */}
        {activePortal === 'patient' && (
          <div className="mt-5">
            {/* Sub-tabs: Sign In vs Register */}
            <div className="flex border-b border-slate-200 mb-5">
              <button
                type="button"
                onClick={() => {
                  setPatientMode('login');
                  resetFormState();
                }}
                className={`pb-2.5 px-4 text-xs font-black border-b-2 cursor-pointer transition-all ${
                  patientMode === 'login'
                    ? 'border-teal-600 text-teal-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In (Existing Patient)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientMode('register');
                  resetFormState();
                }}
                className={`pb-2.5 px-4 text-xs font-black border-b-2 cursor-pointer transition-all ${
                  patientMode === 'register'
                    ? 'border-teal-600 text-teal-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                New Patient / Create Account
              </button>
            </div>

            {/* Mode A: Patient Sign In */}
            {patientMode === 'login' && (
              <form onSubmit={handlePatientLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Patient ID or Registered Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={patientIdentifier}
                      onChange={(e) => setPatientIdentifier(e.target.value)}
                      placeholder="e.g. PAT-2026-0001 or 9876543210"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    You can enter your generated Patient ID or your 10-digit registered phone number.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={patientPassword}
                      onChange={(e) => setPatientPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Patient...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to MediKiosk</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500 font-medium">
                    Don't have a Patient ID yet?{' '}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientMode('register');
                      resetFormState();
                    }}
                    className="text-xs font-black text-teal-700 hover:underline cursor-pointer"
                  >
                    Register here
                  </button>
                </div>
              </form>
            )}

            {/* Mode B: New Patient Registration */}
            {patientMode === 'register' && (
              <form onSubmit={handlePatientRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      10-Digit Mobile Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Age (Years) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={125}
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      placeholder="e.g. 42"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                      disabled={isLoading}
                    >
                      <option value="male">Male (पुरुष)</option>
                      <option value="female">Female (महिला)</option>
                      <option value="other">Other (अन्य)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Preferred Language
                    </label>
                    <select
                      value={regLang}
                      onChange={(e) => setRegLang(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                      disabled={isLoading}
                    >
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="en">English</option>
                      <option value="bn">Bengali (বাংলা)</option>
                      <option value="mr">Marathi (मराठी)</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                      <option value="te">Telugu (తెలుగు)</option>
                      <option value="gu">Gujarati (ગુજરાતી)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Create Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    disabled={isLoading}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    You will use this password and your generated Patient ID to log in.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering Patient Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Complete Registration & Generate Patient ID</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <span className="text-xs text-slate-500 font-medium">
                    Already have an account?{' '}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientMode('login');
                      resetFormState();
                    }}
                    className="text-xs font-black text-teal-700 hover:underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: DOCTOR CLINICAL LOGIN */}
        {activePortal === 'doctor' && (
          <div className="mt-5 space-y-4">
            {/* Development Credential Test Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                  🧪 Development / Test Doctor Account
                </span>
                <button
                  type="button"
                  onClick={handleFillTestDoctor}
                  className="text-[11px] font-bold text-teal-300 hover:text-white underline cursor-pointer"
                >
                  Auto-fill Test Doctor
                </button>
              </div>
              <div className="text-xs font-mono space-y-0.5 text-slate-300">
                <p>Doctor Name: Dr. Ananya Sharma</p>
                <p>Doctor ID: <span className="text-teal-300 font-bold">DOC-AYU-001</span></p>
                <p>Password: <span className="text-teal-300 font-bold">AyurDoc@2026!</span></p>
                <p className="text-[11px] text-slate-400 font-sans italic pt-0.5">
                  (Notice: Development Test Account only — not a real medical practitioner)
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleQuickLoginAsTestDoctor}
                  disabled={isLoading}
                  className="w-full py-2 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-slate-950" />
                  <span>⚡ Quick Sign In as Dr. Ananya (Instant Access)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleDoctorLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Doctor ID or Institutional Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    placeholder="e.g. DOC-AYU-001 or dr.ananya@medikiosk.internal"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Doctor Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={doctorPassword}
                    onChange={(e) => setDoctorPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Practitioner Credentials...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 text-teal-400" />
                    <span>Sign In to Doctor Workstation</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
