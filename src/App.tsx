import React, { useState, useEffect, useCallback } from 'react';
import { KioskHeader } from './components/v2/KioskHeader';
import { KioskProgressBar } from './components/v2/KioskProgressBar';
import { KioskWelcome } from './components/v2/KioskWelcome';
import { KioskLanguage } from './components/v2/KioskLanguage';
import { KioskPatientId } from './components/v2/KioskPatientId';
import { KioskClinicalIntake, StructuredCaseResult } from './components/v2/KioskClinicalIntake';
import { KioskRedFlag } from './components/v2/KioskRedFlag';
import { KioskDocuments } from './components/v2/KioskDocuments';
import { KioskReview } from './components/v2/KioskReview';
import { KioskAiSummary } from './components/v2/KioskAiSummary';
import { KioskQueue } from './components/v2/KioskQueue';
import { DoctorDashboard } from './components/v2/DoctorDashboard';
import { InactivityWarningModal } from './components/v2/InactivityWarningModal';
import { AuthModal } from './components/AuthModal';
import { MapsGroundingModal } from './components/MapsGroundingModal';
import { GeminiChatbotModal } from './components/GeminiChatbotModal';
import { GoogleWorkspaceHubModal } from './components/GoogleWorkspaceHubModal';
import { LiveVoiceAssistantModal } from './components/v2/LiveVoiceAssistantModal';
import { SearchGroundingModal } from './components/SearchGroundingModal';
import { AudioConfirmationBanner } from './components/v2/AudioConfirmationBanner';
import { unlockAudioContext } from './utils/audioConfirmationEngine';
import {
  apiGetActiveSession,
  apiLogout,
  apiFetchDoctorCases,
  apiSubmitPatientCase,
  apiUpdateDoctorCase,
} from './lib/api';
import { saveDirectPatientCaseToFirestore } from './lib/firebase';
import {
  LanguageCode,
  PatientProfile,
  ClinicalHistoryRecord,
  MedicalDocument,
  UserAccount,
} from './types';
import { DEFAULT_AYUSH_PARIKSHA } from './data/clinicalKnowledge';
import { RotateCcw, X, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { stopSpeech } from './utils/speechHelper';
import { useInactivityTimer } from './utils/useInactivityTimer';
import {
  KioskStep,
  StoredInterviewData,
  saveKioskSession,
  loadKioskSession,
  clearKioskSession,
} from './utils/kioskStorage';

/**
 * Detects if the current browser URL is attempting to route to the Doctor Dashboard
 * via query params (?view=doctor, ?tab=doctor, ?portal=doctor, etc.), hash (#doctor, #/doctor, etc.),
 * or path (/doctor, /doctor-dashboard, /emr, etc.).
 */
function isDoctorUrlRequested(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('/doctor') || pathname.includes('/emr')) {
      return true;
    }
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('doctor') || hash.includes('emr')) {
      return true;
    }
    const searchParams = new URLSearchParams(window.location.search);
    for (const key of ['view', 'tab', 'portal', 'role', 'mode', 'dashboard', 'route']) {
      const val = searchParams.get(key)?.toLowerCase();
      if (val === 'doctor' || val === 'emr' || val === 'admin') {
        return true;
      }
    }
  } catch (err) {
    console.warn('URL inspection error:', err);
  }
  return false;
}

/**
 * Strips all doctor navigation params, hash, and path segments from the browser URL,
 * replacing history state with the clean kiosk URL to prevent direct URL manipulation.
 */
function sanitizeDoctorUrl(step: KioskStep = 'welcome') {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let modified = false;

    for (const key of ['view', 'tab', 'portal', 'role', 'mode', 'dashboard', 'route']) {
      const val = url.searchParams.get(key)?.toLowerCase();
      if (val === 'doctor' || val === 'emr' || val === 'admin') {
        url.searchParams.delete(key);
        modified = true;
      }
    }

    const hash = url.hash.toLowerCase();
    if (hash.includes('doctor') || hash.includes('emr')) {
      url.hash = '';
      modified = true;
    }

    if (url.pathname.toLowerCase().includes('/doctor') || url.pathname.toLowerCase().includes('/emr')) {
      url.pathname = '/';
      modified = true;
    }

    if (modified) {
      window.history.replaceState(
        { kioskStep: step },
        '',
        url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '')
      );
    }
  } catch (e) {
    console.warn('URL sanitization error:', e);
  }
}

const DEFAULT_PATIENT: PatientProfile = {
  id: '',
  abhaId: '',
  name: '',
  age: 0,
  gender: 'male',
  phone: '',
  address: '',
  district: '',
  state: '',
  tokenNumber: '',
  department: 'Kayachikitsa',
  opdTrack: 'ayush',
  isAyushSpecific: true,
  registeredAt: '',
  consentGranted: false,
};

const DEFAULT_INTERVIEW_DATA: StoredInterviewData = {
  chiefComplaint: '',
  duration: '',
  location: '',
  triggers: '',
  associations: '',
  allAnswers: {},
};

export function App() {
  const initialSession = loadKioskSession();

  // Navigation & View Mode
  const [activeView, setActiveView] = useState<'kiosk' | 'doctor'>('kiosk');
  const [kioskStep, setKioskStep] = useState<KioskStep>(() => initialSession?.kioskStep || 'welcome');
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => initialSession?.currentLanguage || 'hi');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => (initialSession ? initialSession.audioEnabled : true));
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [sessionRestoredNotice, setSessionRestoredNotice] = useState<boolean>(() =>
    Boolean(initialSession && initialSession.kioskStep && initialSession.kioskStep !== 'welcome')
  );

  // Doctor session & authorization state
  const [doctorUser, setDoctorUser] = useState<any | null>(null);
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const [unauthorizedWarning, setUnauthorizedWarning] = useState<string | null>(null);

  // Modals for AI Tools and Authentication
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalPortal, setAuthModalPortal] = useState<'patient' | 'doctor'>('patient');
  const [authModalNotice, setAuthModalNotice] = useState<string>('');
  const [showMapsModal, setShowMapsModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState<boolean>(false);
  const [showLiveVoiceModal, setShowLiveVoiceModal] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<'drive' | 'gmail' | 'calendar'>('drive');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Patient Intake State
  const [patient, setPatient] = useState<PatientProfile>(() => initialSession?.patient || DEFAULT_PATIENT);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(() => initialSession?.selectedDepartment || 'Kayachikitsa');
  const [selectedBranch, setSelectedBranch] = useState<string>(() => initialSession?.selectedBranch || '');
  const [interviewData, setInterviewData] = useState<StoredInterviewData>(() => initialSession?.interviewData || DEFAULT_INTERVIEW_DATA);
  const [urgentSymptom, setUrgentSymptom] = useState<string>(() => initialSession?.urgentSymptom || '');
  const [documents, setDocuments] = useState<MedicalDocument[]>(() => initialSession?.documents || []);
  const [tokenNumber, setTokenNumber] = useState<string>(() => initialSession?.tokenNumber || '');
  const [roomNumber, setRoomNumber] = useState<string>(() => initialSession?.roomNumber || '12');
  const [assignedDoctor, setAssignedDoctor] = useState<string>(() => initialSession?.assignedDoctor || 'Dr. Ananya Sharma');

  // OPD Queue List for Doctor Desk (Strictly populated with real database records)
  const [queueList, setQueueList] = useState<
    Array<{
      caseId?: string;
      patient: PatientProfile;
      record: ClinicalHistoryRecord;
      tokenNumber: string;
      department: string;
      roomNumber: string;
      status: 'Waiting' | 'In Consultation' | 'Verified';
      registeredAt: string;
    }>
  >([]);

  // 1. Check existing session on load and strictly validate URL against credentials
  useEffect(() => {
    const doctorRequestedInUrl = isDoctorUrlRequested();

    apiGetActiveSession()
      .then((session) => {
        setSessionChecked(true);
        if (session && session.role === 'doctor') {
          setDoctorUser(session.user);
          setCurrentUser({
            uid: session.user.id || session.user.doctorId,
            email: session.user.email,
            displayName: session.user.name,
            role: 'admin',
            createdAt: session.user.createdAt,
          });

          // Authenticated physician can navigate directly to doctor dashboard if requested via URL
          if (doctorRequestedInUrl) {
            setActiveView('doctor');
          }
        } else {
          // Patient session or unauthenticated visitor
          if (session && session.role === 'patient') {
            setCurrentUser({
              uid: session.user.id || session.user.patientId,
              email: `${session.user.phone}@medikiosk.internal`,
              displayName: session.user.name,
              phone: session.user.phone,
              abhaId: `${session.user.phone}@abdm`,
              role: 'patient',
              createdAt: session.user.createdAt,
            });
            setPatient((prev) => ({
              ...prev,
              id: session.user.patientId || session.user.id,
              name: session.user.name,
              phone: session.user.phone,
              age: session.user.age || prev.age,
              gender: session.user.gender || prev.gender,
            }));
          }

          // STRICT SECURITY ENFORCEMENT:
          // Prevent patients or guests from accessing Doctor Dashboard via direct URL manipulation
          if (doctorRequestedInUrl) {
            sanitizeDoctorUrl(kioskStep);
            setActiveView('kiosk');
            setUnauthorizedWarning(
              'Unauthorized Access Prevented: You attempted to access the Doctor EMR Dashboard via URL manipulation. Verified clinician credentials are strictly required.'
            );
            setAuthModalPortal('doctor');
            setAuthModalNotice('Doctor credentials required to access the clinical workstation.');
            setShowAuthModal(true);
          }
        }
      })
      .catch((err) => {
        console.warn('Session check failed:', err);
        setSessionChecked(true);
        if (doctorRequestedInUrl) {
          sanitizeDoctorUrl(kioskStep);
          setActiveView('kiosk');
          setUnauthorizedWarning(
            'Unauthorized Access Prevented: Direct URL access to the Doctor Dashboard is restricted.'
          );
        }
      });
  }, []);

  // 2. Fetch real doctor cases queue when doctor is active
  const loadDoctorQueue = useCallback(async () => {
    try {
      const cases = await apiFetchDoctorCases();
      if (!cases || !Array.isArray(cases)) return;
      const mapped = cases.map((c) => ({
        caseId: c.id || c.caseId,
        patient: {
          id: c.patient?.id || c.patientId,
          name: c.patient?.name || 'Registered Patient',
          age: c.patient?.age || 0,
          gender: (c.patient?.gender as any) || 'male',
          phone: c.patient?.phone || '',
          abhaId: c.patient?.abhaId || (c.patient?.phone ? `${c.patient.phone}@abdm` : ''),
          address: '',
          district: '',
          state: '',
          tokenNumber: c.tokenNumber,
          department: c.department,
          opdTrack: 'ayush' as const,
          isAyushSpecific: true,
          registeredAt: c.registeredAt,
          consentGranted: true,
          chiefComplaint: c.chiefComplaint,
        },
        record: {
          chiefComplaint: c.chiefComplaint,
          durationOfComplaint: c.duration || '',
          hpi: {
            site: c.location || '',
            onset: c.duration || '',
            character: '',
            radiation: '',
            associations: c.associations ? [c.associations] : [],
            timing: '',
            exacerbatingFactors: c.triggers || '',
            relievingFactors: '',
            severity: 5,
          },
          pastMedicalHistory: [],
          pastSurgicalHistory: [],
          drugAllergies: [],
          foodAllergies: [],
          currentMedications: c.prescriptions || [],
          familyHistory: [],
          personalHistory: {
            smoking: 'Never',
            alcohol: 'Never',
            diet: 'Standard',
            physicalActivity: 'Moderate',
          },
          reviewOfSystems: [],
          ayushAssessment: c.ayushAssessment || DEFAULT_AYUSH_PARIKSHA,
          redFlags: [],
          documents: c.documents || [],
          physicianNotes: c.physicianNotes || '',
          verifiedByPhysician: c.status === 'Verified',
        },
        tokenNumber: c.tokenNumber,
        department: c.department,
        roomNumber: c.roomNumber,
        status: c.status,
        registeredAt: c.registeredAt,
      }));
      setQueueList(mapped);
    } catch (err) {
      console.warn('Could not fetch doctor cases:', err);
    }
  }, []);

  useEffect(() => {
    loadDoctorQueue();
  }, [loadDoctorQueue]);

  useEffect(() => {
    if (activeView === 'doctor') {
      loadDoctorQueue();
    }
  }, [activeView, loadDoctorQueue]);

  // Handle Step transitions
  const changeKioskStep = (nextStep: KioskStep, replace = false) => {
    if (replace) {
      window.history.replaceState({ kioskStep: nextStep }, '', '');
    } else {
      window.history.pushState({ kioskStep: nextStep }, '', '');
    }
    setKioskStep(nextStep);
  };

  // Browser popstate and hashchange listeners to prevent unauthorized direct URL manipulation
  useEffect(() => {
    window.history.replaceState({ kioskStep }, '', '');

    const handlePopState = (event: PopStateEvent) => {
      // Security check: check if the destination or manipulated URL requests doctor dashboard
      const doctorRequested = isDoctorUrlRequested();
      if (doctorRequested) {
        if (!doctorUser) {
          // Block unauthorized navigation attempt
          sanitizeDoctorUrl(kioskStep);
          setActiveView('kiosk');
          setUnauthorizedWarning(
            'Unauthorized Navigation Blocked: Direct URL access to the Doctor Dashboard is restricted to verified healthcare professionals.'
          );
          setAuthModalPortal('doctor');
          setAuthModalNotice('Doctor credentials required to access the clinical workstation.');
          setShowAuthModal(true);
          return;
        } else {
          setActiveView('doctor');
          return;
        }
      }

      if (event.state && event.state.kioskStep) {
        setKioskStep(event.state.kioskStep as KioskStep);
      }
    };

    const handleHashChange = () => {
      if (isDoctorUrlRequested() && !doctorUser) {
        sanitizeDoctorUrl(kioskStep);
        setActiveView('kiosk');
        setUnauthorizedWarning(
          'Unauthorized Navigation Blocked: Direct URL hash routing to the Doctor Dashboard was blocked.'
        );
        setAuthModalPortal('doctor');
        setAuthModalNotice('Doctor credentials required to access the clinical workstation.');
        setShowAuthModal(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [kioskStep, doctorUser]);

  // Fallback security guard: If activeView is 'doctor' without an authenticated doctor, immediately revert
  useEffect(() => {
    if (sessionChecked && activeView === 'doctor' && !doctorUser) {
      console.warn('[Security Guard] Unauthorized doctor view state detected. Resetting to kiosk.');
      sanitizeDoctorUrl(kioskStep);
      setActiveView('kiosk');
      setUnauthorizedWarning(
        'Access Denied: Doctor credentials required to view the clinical workstation.'
      );
      setAuthModalPortal('doctor');
      setAuthModalNotice('Doctor credentials required to access the clinical workstation.');
      setShowAuthModal(true);
    }
  }, [activeView, doctorUser, sessionChecked, kioskStep]);

  // Save session state to localStorage
  useEffect(() => {
    saveKioskSession({
      kioskStep,
      currentLanguage,
      audioEnabled,
      patient,
      selectedDepartment,
      selectedBranch,
      interviewData,
      documents,
      urgentSymptom,
      tokenNumber,
      roomNumber,
      assignedDoctor,
    });
  }, [
    kioskStep,
    currentLanguage,
    audioEnabled,
    patient,
    selectedDepartment,
    selectedBranch,
    interviewData,
    documents,
    urgentSymptom,
    tokenNumber,
    roomNumber,
    assignedDoctor,
  ]);

  // Helpers
  const handleUpdatePatient = (updated: Partial<PatientProfile>) => {
    setPatient((prev) => ({ ...prev, ...updated }));
  };

  const handleAddDocument = (doc: MedicalDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleInterviewComplete = (data: {
    chiefComplaint: string;
    duration: string;
    location: string;
    triggers: string;
    associations: string;
    allAnswers: Record<string, string>;
  }) => {
    setInterviewData(data);
    setPatient((prev) => ({
      ...prev,
      chiefComplaint: data.chiefComplaint,
    }));
    changeKioskStep('documents');
  };

  const handleTriggerRedFlag = (symptom: string) => {
    setUrgentSymptom(symptom);
    changeKioskStep('red_flag');
  };

  // Submission to Doctor Desk (Real Backend Case Submission)
  const handleSubmitToDoctor = async () => {
    const newToken = `A-0${Math.floor(Math.random() * 20) + 24}`;
    setTokenNumber(newToken);
    const assignedRoom =
      selectedDepartment.includes('Panchakarma')
        ? '14'
        : selectedDepartment.includes('Shalya')
        ? '08'
        : selectedDepartment.includes('Shalakya')
        ? '05'
        : selectedDepartment.includes('Prasuti')
        ? '03'
        : '12';
    setRoomNumber(assignedRoom);

    const finalPatient = {
      ...patient,
      tokenNumber: newToken,
      department: selectedDepartment,
      chiefComplaint: interviewData.chiefComplaint,
      consentGranted: true,
    };
    setPatient(finalPatient);

    const newRecord: ClinicalHistoryRecord = {
      chiefComplaint: interviewData.chiefComplaint || 'General Clinical Consultation',
      durationOfComplaint: interviewData.duration || '',
      hpi: {
        site: interviewData.location || '',
        onset: interviewData.duration || '',
        character: '',
        radiation: '',
        associations: interviewData.associations ? [interviewData.associations] : [],
        timing: '',
        exacerbatingFactors: interviewData.triggers || '',
        relievingFactors: '',
        severity: 6,
      },
      pastMedicalHistory: interviewData.pastMedicalHistory || [],
      pastSurgicalHistory: [],
      drugAllergies: [],
      foodAllergies: [],
      currentMedications: (interviewData.currentMedications || []).map((m: any) =>
        typeof m === 'string' ? { name: m, dosage: '', frequency: '' } : m
      ),
      familyHistory: interviewData.familyHistory || [],
      personalHistory: {
        smoking: 'Never',
        alcohol: 'Never',
        diet: 'Standard',
        physicalActivity: 'Moderate',
      },
      reviewOfSystems: [],
      ayushAssessment: DEFAULT_AYUSH_PARIKSHA,
      redFlags: urgentSymptom ? [urgentSymptom] : (interviewData.redFlags || []),
      documents: documents,
      physicianNotes: '',
      verifiedByPhysician: false,
    };

    // Store in real backend database
    let serverGeneratedCase: any = null;
    try {
      serverGeneratedCase = await apiSubmitPatientCase({
        patientId: patient.id || `PAT-${Date.now()}`,
        patientName: patient.name || 'Registered Patient',
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        department: selectedDepartment,
        departmentBranch: selectedBranch || interviewData.departmentBranch || patient.departmentBranch,
        chiefComplaint: interviewData.chiefComplaint || 'General Consultation',
        duration: interviewData.duration,
        location: interviewData.location,
        triggers: interviewData.triggers,
        associations: interviewData.associations,
        allAnswers: interviewData.allAnswers,
        pastMedicalHistory: interviewData.pastMedicalHistory,
        currentMedications: interviewData.currentMedications,
        familyHistory: interviewData.familyHistory,
        documents: documents,
        ayushAssessment: DEFAULT_AYUSH_PARIKSHA,
      });
    } catch (err) {
      console.warn('Backend case storage result:', err);
    }

    const newCaseId = serverGeneratedCase?.id || `CASE-${Date.now()}`;
    const effectiveToken = serverGeneratedCase?.tokenNumber || newToken;

    // Dual-write directly to Firestore from client to guarantee cloud persistence
    saveDirectPatientCaseToFirestore({
      id: newCaseId,
      patientId: patient.id || `PAT-${Date.now()}`,
      patientName: patient.name || 'Registered Patient',
      age: patient.age || 45,
      gender: patient.gender || 'unspecified',
      phone: patient.phone || '',
      department: selectedDepartment,
      roomNumber: assignedRoom,
      tokenNumber: effectiveToken,
      status: 'Waiting',
      chiefComplaint: interviewData.chiefComplaint || 'General Consultation',
      duration: interviewData.duration,
      location: interviewData.location,
      triggers: interviewData.triggers,
      associations: interviewData.associations,
      documents: documents,
      ayushAssessment: DEFAULT_AYUSH_PARIKSHA,
    });

    setQueueList((prev) => [
      {
        caseId: newCaseId,
        patient: finalPatient,
        record: newRecord,
        tokenNumber: effectiveToken,
        department: selectedDepartment,
        roomNumber: assignedRoom,
        status: 'Waiting',
        registeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.filter((item) => item.tokenNumber !== effectiveToken),
    ]);

    changeKioskStep('queue');
  };

  // Reset Session for Next Patient
  const handleFinishKioskSession = useCallback(() => {
    stopSpeech();
    clearKioskSession();
    changeKioskStep('welcome', true);
    setDocuments([]);
    setUrgentSymptom('');
    setInterviewData(DEFAULT_INTERVIEW_DATA);
    setPatient(DEFAULT_PATIENT);
    setSessionRestoredNotice(false);
  }, []);

  // Inactivity timeout notification state (for toast/banner on welcome screen)
  const [inactivityResetNotice, setInactivityResetNotice] = useState(false);

  // Auto-reset callback on 3 minutes of no user interaction
  const handleInactivityTimeout = useCallback(() => {
    console.info('[MediKiosk] Session timed out after 3 minutes of inactivity. Resetting to protect patient privacy.');
    handleFinishKioskSession();
    setInactivityResetNotice(true);
  }, [handleFinishKioskSession]);

  // Inactivity timer hook (active on all in-progress kiosk steps except 'welcome' and when in Doctor Desk)
  const isTimerEnabled = activeView === 'kiosk' && kioskStep !== 'welcome';
  const {
    isWarning: isInactivityWarning,
    remainingSeconds: inactivityRemainingSeconds,
    resetTimer: handleKeepSessionActive,
  } = useInactivityTimer({
    timeoutMs: 3 * 60 * 1000, // 3 minutes total timeout
    warningMs: 30 * 1000, // 30 seconds warning dialog before reset
    enabled: isTimerEnabled,
    onTimeout: handleInactivityTimeout,
  });

  // Doctor Desk actions
  const handleUpdateRecord = async (
    patientId: string,
    updatedRecord: Partial<ClinicalHistoryRecord>,
    tokenOrCaseId?: string
  ) => {
    setQueueList((prev) =>
      prev.map((item) => {
        const matches = tokenOrCaseId
          ? item.caseId === tokenOrCaseId || item.tokenNumber === tokenOrCaseId
          : item.patient.id === patientId;
        if (matches) {
          return {
            ...item,
            record: { ...item.record, ...updatedRecord },
          };
        }
        return item;
      })
    );

    try {
      await apiUpdateDoctorCase(tokenOrCaseId || patientId, {
        chiefComplaint: updatedRecord.chiefComplaint,
        physicianNotes: updatedRecord.physicianNotes,
        prescriptions: updatedRecord.currentMedications,
      });
    } catch (err) {
      console.warn('Failed to update case in backend:', err);
    }
  };

  const handleVerifyConsultation = async (patientId: string, tokenOrCaseId?: string) => {
    setQueueList((prev) =>
      prev.map((item) => {
        const matches = tokenOrCaseId
          ? item.caseId === tokenOrCaseId || item.tokenNumber === tokenOrCaseId
          : item.patient.id === patientId;
        if (matches) {
          return {
            ...item,
            status: 'Verified',
            record: { ...item.record, isVerifiedByDoctor: true },
          };
        }
        return item;
      })
    );

    try {
      await apiUpdateDoctorCase(tokenOrCaseId || patientId, { status: 'Verified' });
    } catch (err) {
      console.warn('Failed to verify case in backend:', err);
    }
  };

  // View Change interceptor (Doctors must authenticate)
  const handleViewChange = (newView: 'kiosk' | 'doctor') => {
    if (newView === 'doctor') {
      if (!doctorUser) {
        setUnauthorizedWarning(
          'Doctor credentials required to access the clinical workstation. Direct navigation prevented.'
        );
        setAuthModalPortal('doctor');
        setAuthModalNotice('Doctor credentials required to access the clinical workstation.');
        setShowAuthModal(true);
        return;
      }
      // Authorized doctor navigation: update URL cleanly
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'doctor');
        window.history.pushState({ kioskStep, view: 'doctor' }, '', url.toString());
      } catch {}
      setActiveView('doctor');
      setUnauthorizedWarning(null);
    } else {
      sanitizeDoctorUrl(kioskStep);
      setActiveView('kiosk');
    }
  };

  // Doctor Auth Success Handler
  const handleDoctorAuthSuccess = (doctor: any) => {
    setDoctorUser(doctor);
    setCurrentUser({
      uid: doctor.id || doctor.doctorId,
      email: doctor.email,
      displayName: doctor.name,
      role: 'admin',
      createdAt: doctor.createdAt,
    });
    setActiveView('doctor');
    setUnauthorizedWarning(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'doctor');
      window.history.replaceState({ kioskStep, view: 'doctor' }, '', url.toString());
    } catch {}
  };

  // Doctor Logout Handler
  const handleDoctorLogout = async () => {
    await apiLogout();
    setDoctorUser(null);
    setCurrentUser(null);
    setActiveView('kiosk');
    sanitizeDoctorUrl(kioskStep);
    setUnauthorizedWarning(null);
  };

  const handleOpenWorkspace = (tab: 'drive' | 'gmail' | 'calendar' = 'drive') => {
    setWorkspaceInitialTab(tab);
    setShowWorkspaceModal(true);
  };

  const handleImportDocFromDrive = (doc: MedicalDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    setShowWorkspaceModal(false);
  };

  return (
    <div
      onClick={() => unlockAudioContext()}
      onTouchStart={() => unlockAudioContext()}
      className="min-h-screen bg-[#C9C5AF] bg-ayur-canvas-texture text-[#26312B] flex flex-col font-sans selection:bg-[#B99B6B]/30 selection:text-[#29483C]"
    >
      {/* Patient Kiosk Terminal Header (Shown during patient kiosk flow) */}
      {activeView === 'kiosk' && (
        <KioskHeader
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          audioEnabled={audioEnabled}
          onToggleAudio={() => setAudioEnabled((prev) => !prev)}
          activeView={activeView}
          onViewChange={handleViewChange}
          onNeedHelp={() => setShowHelpModal(true)}
          currentUser={currentUser}
          onOpenAuthModal={() => {
            setAuthModalPortal('patient');
            setAuthModalNotice('');
            setShowAuthModal(true);
          }}
          onOpenMapsModal={() => setShowMapsModal(true)}
          onOpenChatModal={() => setShowChatModal(true)}
          onOpenWorkspaceModal={() => handleOpenWorkspace('drive')}
          onOpenLiveVoiceModal={() => setShowLiveVoiceModal(true)}
          onOpenSearchModal={() => setShowSearchModal(true)}
        />
      )}

      {/* Security Alert Banner for unauthorized direct URL manipulation attempts */}
      {unauthorizedWarning && (
        <div
          id="alert-unauthorized-doctor-access"
          role="alert"
          className="bg-[#29483C] border-b border-[#496354] text-[#F0EBDD] px-4 py-3 sm:px-6 shadow-xs flex items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-1.5 bg-[#A65F49] rounded-[6px] text-white shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F0EBDD]">Security Notice: Unauthorized Access Prevented</p>
              <p className="text-xs text-[#F0EBDD]/80 mt-0.5 font-normal">{unauthorizedWarning}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAuthModalPortal('doctor');
                setAuthModalNotice('Doctor credentials required to access the clinical workstation.');
                setShowAuthModal(true);
              }}
              className="px-3 py-1.5 bg-[#B99B6B] text-[#26312B] hover:bg-[#a88a5a] text-xs font-semibold rounded-[6px] transition-colors cursor-pointer border border-[#B99B6B]"
            >
              Doctor Sign In
            </button>
            <button
              type="button"
              onClick={() => setUnauthorizedWarning(null)}
              className="p-1 text-[#F0EBDD]/80 hover:text-white rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 bg-[#C9C5AF] bg-ayur-canvas-texture">
        {activeView === 'doctor' && doctorUser ? (
          /* SEPARATE DOCTOR EXPERIENCE (STRICTLY POPULATED WITH REAL CASES) */
          <DoctorDashboard
            queueList={queueList}
            onUpdateRecord={handleUpdateRecord}
            onVerifyConsultation={handleVerifyConsultation}
            onBackToKiosk={() => handleViewChange('kiosk')}
            onLogoutDoctor={handleDoctorLogout}
            onRefresh={loadDoctorQueue}
            doctorUser={doctorUser}
            onOpenWorkspaceModal={handleOpenWorkspace}
            onOpenSearchModal={() => setShowSearchModal(true)}
            onOpenMapsModal={() => setShowMapsModal(true)}
            onOpenChatModal={() => setShowChatModal(true)}
          />
        ) : (
          /* SEPARATE PATIENT KIOSK EXPERIENCE: ONE SCREEN = ONE SIMPLE TASK */
          <div className="w-full">
            {/* Non-intrusive Top Progress Bar tracking user's journey across: Identify, Converse, Scan, Review */}
            <KioskProgressBar
              currentStep={kioskStep}
              currentLanguage={currentLanguage}
            />

            {/* Auto-Restored Session Banner */}
            {sessionRestoredNotice && kioskStep !== 'welcome' && kioskStep !== 'queue' && (
              <div className="bg-[#29483C] text-[#F0EBDD] px-4 py-2.5 flex items-center justify-between shadow-xs border-b border-[#496354]">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#B99B6B] animate-pulse shrink-0"></span>
                  <span>
                    {currentLanguage === 'hi'
                      ? 'आपका पिछला सत्र सुरक्षित है — आप वहीं से आगे बढ़ रहे हैं।'
                      : 'Your previous session was automatically restored.'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={handleFinishKioskSession}
                    className="flex items-center gap-1 text-[#B99B6B] hover:text-[#F0EBDD] underline underline-offset-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{currentLanguage === 'hi' ? 'नया मरीज (Start Over)' : 'Start Over'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionRestoredNotice(false)}
                    className="p-1 hover:bg-white/10 rounded-md cursor-pointer transition-colors"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Inactivity Privacy Reset Notice Banner on Welcome Screen */}
            {inactivityResetNotice && kioskStep === 'welcome' && (
              <div
                id="banner-inactivity-privacy-reset"
                role="status"
                className="bg-[#B5B7A1] border-b border-[#A9AA94] px-4 py-3 sm:px-6 shadow-xs flex items-center justify-between gap-3 text-[#26312B] animate-in fade-in slide-in-from-top-2 duration-200 select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#C9C5AF] border border-[#A9AA94] rounded-[6px] text-[#29483C] shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#26312B]">
                      {currentLanguage === 'hi'
                        ? 'सत्र स्वतः रीसेट किया गया (Patient Privacy Protected)'
                        : 'Session Reset: Patient Privacy Protected'}
                    </p>
                    <p className="text-xs text-[#596058] font-normal">
                      {currentLanguage === 'hi'
                        ? '3 मिनट की निष्क्रियता के बाद मरीज की गोपनीयता सुरक्षित रखने के लिए टर्मिनल रीसेट किया गया।'
                        : 'The terminal was automatically cleared after 3 minutes of inactivity to protect patient health records.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInactivityResetNotice(false)}
                  className="p-1 text-[#596058] hover:text-[#26312B] rounded-lg transition-colors cursor-pointer"
                  aria-label="Dismiss notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {kioskStep === 'welcome' && (
                <motion.div
                  key="step-welcome"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  <KioskWelcome
                    currentLanguage={currentLanguage}
                    onStart={() => changeKioskStep('patient_id')}
                    onNeedHelp={() => setShowHelpModal(true)}
                    audioEnabled={audioEnabled}
                    onLogin={() => {
                      setAuthModalPortal('patient');
                      setAuthModalNotice('');
                      setShowAuthModal(true);
                    }}
                    onOpenLiveVoice={() => setShowLiveVoiceModal(true)}
                    onScanDocuments={() => changeKioskStep('documents')}
                  />
                </motion.div>
              )}

              {kioskStep === 'patient_id' && (
                <motion.div
                  key="step-patient_id"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  <KioskPatientId
                    currentLanguage={currentLanguage}
                    patient={patient}
                    onUpdatePatient={handleUpdatePatient}
                    onNext={() => changeKioskStep('intake')}
                    onBack={() => changeKioskStep('welcome')}
                    audioEnabled={audioEnabled}
                  />
                </motion.div>
              )}

              {/* Primary Clinical Intake Flow: 3D Body + Gemini Dynamic Questions */}
              {(kioskStep === 'intake' ||
                kioskStep === 'department' ||
                kioskStep === 'consent' ||
                (kioskStep as string) === 'interview') && (
                <motion.div
                  key="step-clinical-intake"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  <KioskClinicalIntake
                    currentLanguage={currentLanguage}
                    patient={patient}
                    initialComplaint={interviewData.chiefComplaint}
                    onComplete={(caseResult: StructuredCaseResult) => {
                      setSelectedDepartment(caseResult.department);
                      setSelectedBranch(caseResult.departmentBranch);
                      const anatomicalStr =
                        caseResult.anatomicalLocation?.anatomicalPath?.join(' > ') ||
                        caseResult.anatomicalLocation?.bodyRegionLabel ||
                        caseResult.anatomicalLocation?.bodyRegion ||
                        '';

                      setInterviewData((prev) => ({
                        ...prev,
                        chiefComplaint: caseResult.chiefComplaint,
                        duration: caseResult.duration || prev.duration,
                        location: anatomicalStr || prev.location,
                        severity: caseResult.severity || prev.severity,
                        severityRating: caseResult.severityRating,
                        previousOccurrence: caseResult.previousOccurrence,
                        pastMedicalHistory: caseResult.pastMedicalHistory,
                        currentMedications: caseResult.currentMedications,
                        familyHistory: caseResult.familyHistory,
                        departmentBranch: caseResult.departmentBranch,
                        anatomicalLocation: caseResult.anatomicalLocation,
                        associations: caseResult.symptoms.join(', '),
                        routingConfidence: caseResult.routingConfidence,
                        confidenceScore: caseResult.confidenceScore,
                        confidenceRationale: caseResult.confidenceRationale,
                        confidenceFactors: caseResult.confidenceFactors,
                      }));

                      setPatient((prev) => ({
                        ...prev,
                        department: caseResult.department,
                        departmentBranch: caseResult.departmentBranch,
                        anatomicalLocation: anatomicalStr,
                        chiefComplaint: caseResult.chiefComplaint,
                        severityRating: caseResult.severityRating,
                        routingConfidence: caseResult.routingConfidence,
                        confidenceScore: caseResult.confidenceScore,
                        confidenceRationale: caseResult.confidenceRationale,
                        confidenceFactors: caseResult.confidenceFactors,
                      }));

                      if (caseResult.documents && caseResult.documents.length > 0) {
                        setDocuments((prev) => [...prev, ...caseResult.documents]);
                      }

                      if (caseResult.isEmergency && caseResult.emergencyReason) {
                        setUrgentSymptom(caseResult.emergencyReason);
                        changeKioskStep('red_flag');
                      } else {
                        changeKioskStep('review');
                      }
                    }}
                    onTriggerRedFlag={(reason) => {
                      setUrgentSymptom(reason);
                      changeKioskStep('red_flag');
                    }}
                    onBack={() => changeKioskStep('patient_id')}
                    audioEnabled={audioEnabled}
                  />
                </motion.div>
              )}

              {kioskStep === 'red_flag' && (
                <motion.div
                  key="step-red_flag"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <KioskRedFlag
                    currentLanguage={currentLanguage}
                    urgentSymptom={urgentSymptom}
                    symptom={urgentSymptom}
                    onStaffOverride={() => changeKioskStep('documents')}
                    onContinue={() => changeKioskStep('documents')}
                    onBack={() => changeKioskStep('intake')}
                    audioEnabled={audioEnabled}
                  />
                </motion.div>
              )}

              {kioskStep === 'documents' && (
                <motion.div
                  key="step-documents"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <KioskDocuments
                    currentLanguage={currentLanguage}
                    documents={documents}
                    onAddDocument={handleAddDocument}
                    onRemoveDocument={handleRemoveDocument}
                    onNext={() => changeKioskStep('review')}
                    onBack={() => changeKioskStep('intake')}
                    audioEnabled={audioEnabled}
                    onOpenDriveModal={() => handleOpenWorkspace('drive')}
                  />
                </motion.div>
              )}

              {kioskStep === 'review' && (
                <motion.div
                  key="step-review"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <KioskReview
                    currentLanguage={currentLanguage}
                    patient={patient}
                    department={selectedDepartment}
                    departmentBranch={selectedBranch || interviewData.departmentBranch}
                    interviewData={interviewData}
                    documents={documents}
                    onConfirm={handleSubmitToDoctor}
                    onUpdateHistory={(updated) => {
                      setInterviewData((prev) => ({
                        ...prev,
                        ...updated,
                      }));
                      setPatient((prev) => ({
                        ...prev,
                        pastMedicalHistory: updated.pastMedicalHistory,
                        familyHistory: updated.familyHistory,
                        currentMedications: updated.currentMedications,
                      }));
                    }}
                    onEditSection={(step) => {
                      if (step === 'patient' || step === 'patient_id') {
                        changeKioskStep('patient_id');
                      } else if (step === 'documents') {
                        changeKioskStep('documents');
                      } else {
                        changeKioskStep('intake');
                      }
                    }}
                    onBack={() => changeKioskStep('intake')}
                    audioEnabled={audioEnabled}
                  />
                </motion.div>
              )}

              {kioskStep === 'ai_summary' && (
                <motion.div
                  key="step-ai_summary"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <KioskAiSummary
                    currentLanguage={currentLanguage}
                    patient={patient}
                    department={selectedDepartment}
                    interviewData={interviewData}
                    documents={documents}
                    onBack={() => changeKioskStep('review')}
                    onSubmitToDoctor={handleSubmitToDoctor}
                    onProceedToQueue={handleSubmitToDoctor}
                  />
                </motion.div>
              )}

              {kioskStep === 'queue' && (
                <motion.div
                  key="step-queue"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <KioskQueue
                    currentLanguage={currentLanguage}
                    patient={patient}
                    tokenNumber={tokenNumber || 'A-024'}
                    roomNumber={roomNumber || '12'}
                    department={selectedDepartment}
                    doctorName={assignedDoctor}
                    assignedDoctor={assignedDoctor}
                    onFinishKioskSession={handleFinishKioskSession}
                    onFinish={handleFinishKioskSession}
                    audioEnabled={audioEnabled}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Staff Assistance Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-[#26312B]/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#E3DDCA] rounded-[10px] max-w-md w-full p-6 sm:p-8 shadow-xl border border-[#A9AA94] text-center"
            >
              <div className="w-12 h-12 rounded-[8px] bg-[#B5B7A1] border border-[#A9AA94] text-[#29483C] flex items-center justify-center mx-auto mb-4 shadow-xs">
                <RotateCcw className="w-6 h-6 text-[#29483C]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-serif text-[#26312B] mb-2 font-normal">Hospital Staff Assistance</h3>
              <p className="text-sm text-[#596058] mb-6 leading-relaxed">
                An OPD receptionist or AYUSH Sahayak has been notified. Please wait at the kiosk terminal.
              </p>
              <div className="p-4 rounded-[8px] bg-[#C9C5AF] border border-[#A9AA94] text-left mb-6">
                <p className="text-xs font-semibold text-[#596058] mb-1">OPD Helpdesk Helpline:</p>
                <p className="text-sm font-mono font-bold text-[#29483C]">1800-11-2233 (Toll Free)</p>
              </div>
              <motion.button
                type="button"
                onClick={() => setShowHelpModal(false)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-semibold rounded-[8px] cursor-pointer transition-colors shadow-xs text-sm"
              >
                Return to Terminal
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Patient & Doctor Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthModalNotice('');
        }}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'patient') {
            setPatient((p) => ({
              ...p,
              id: user.uid,
              name: user.displayName || p.name,
              phone: user.phone || p.phone,
              abhaId: user.abhaId || `${user.phone}@abdm`,
            }));
          }
        }}
        onDoctorAuthSuccess={handleDoctorAuthSuccess}
        initialPortal={authModalPortal}
        intendedActionNotice={authModalNotice}
      />

      {/* Google Maps Grounding with Gemini 3.5 Flash */}
      <MapsGroundingModal
        isOpen={showMapsModal}
        onClose={() => setShowMapsModal(false)}
        defaultQuery="Nearby Ayush Hospitals & Panchakarma Centers"
        context={`Department: ${selectedDepartment}, Patient Complaint: ${interviewData.chiefComplaint}`}
      />

      {/* Gemini AI Clinical Chatbot (pro for complex, flash for general, flash-lite for fast) */}
      <GeminiChatbotModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        currentUser={currentUser}
      />

      {/* Gemini 3.8 Live Voice Assistant (Real-Time Bidirectional Voice Conversation) */}
      <LiveVoiceAssistantModal
        isOpen={showLiveVoiceModal}
        onClose={() => setShowLiveVoiceModal(false)}
        currentLanguage={currentLanguage}
        initialPrompt={interviewData.chiefComplaint ? `I am at the OPD kiosk experiencing: ${interviewData.chiefComplaint}` : ''}
        onApplyIntakeSummary={(text) => {
          setInterviewData((prev) => ({
            ...prev,
            chiefComplaint: prev.chiefComplaint ? `${prev.chiefComplaint}; ${text}` : text,
          }));
          setShowLiveVoiceModal(false);
        }}
      />

      {/* Google Search Grounding with Gemini 3.5 Flash */}
      <SearchGroundingModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        defaultQuery={interviewData.chiefComplaint ? `${interviewData.chiefComplaint} clinical guidelines and Ayush care` : 'Latest Dengue & Viral Fever Advisories in Delhi & NCR'}
        context={`Department: ${selectedDepartment}, Complaint: ${interviewData.chiefComplaint || 'General OPD'}`}
      />

      {/* Google Workspace Hub Modal (Drive, Gmail, Calendar) */}
      <GoogleWorkspaceHubModal
        isOpen={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
        patient={patient}
        interviewData={interviewData}
        aiSummaryText={`Patient: ${patient.name || 'Anonymous'}\nABHA: ${patient.abhaId || 'N/A'}\nDepartment: ${selectedDepartment}\nChief Complaint: ${interviewData.chiefComplaint || patient.chiefComplaint || 'Consultation'}\nDuration: ${interviewData.duration || 'N/A'}\nTriggers: ${interviewData.triggers || 'None'}`}
        onImportDocumentToKiosk={handleImportDocFromDrive}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
        initialTab={workspaceInitialTab}
      />

      {/* Patient Privacy Inactivity Warning Modal (3-Minute Kiosk Inactivity Safeguard) */}
      <InactivityWarningModal
        isOpen={isInactivityWarning}
        remainingSeconds={inactivityRemainingSeconds}
        onStayLoggedIn={handleKeepSessionActive}
        onResetNow={handleInactivityTimeout}
        currentLanguage={currentLanguage}
        audioEnabled={audioEnabled}
      />

      {/* Floating Audio Confirmation Accessibility Bar with Replay & Waveform */}
      <AudioConfirmationBanner
        currentLanguage={currentLanguage}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
      />
    </div>
  );
}

export default App;
