import { LanguageCode, PatientProfile, MedicalDocument } from '../types';

export type KioskStep =
  | 'welcome'
  | 'language'
  | 'patient_id'
  | 'intake'
  | 'department'
  | 'consent'
  | 'interview'
  | 'red_flag'
  | 'documents'
  | 'review'
  | 'ai_summary'
  | 'queue';

export interface StoredInterviewData {
  chiefComplaint: string;
  duration: string;
  location: string;
  triggers?: string;
  associations?: string;
  allAnswers?: Record<string, string>;
  anatomicalLocation?: any;
  departmentBranch?: string;
  severity?: string;
  previousOccurrence?: string;
  pastMedicalHistory?: string[];
  currentMedications?: any[];
  familyHistory?: string[];
  redFlags?: string[];
  routingConfidence?: 'high' | 'moderate' | 'low';
  confidenceScore?: number;
  confidenceRationale?: string;
  confidenceFactors?: string[];
}

export interface KioskSessionData {
  kioskStep: KioskStep;
  currentLanguage: LanguageCode;
  audioEnabled: boolean;
  patient: PatientProfile;
  selectedDepartment: string;
  selectedBranch?: string;
  interviewData: StoredInterviewData;
  documents: MedicalDocument[];
  urgentSymptom: string;
  tokenNumber: string;
  roomNumber: string;
  assignedDoctor: string;
  updatedAt: number;
}

const STORAGE_KEY = 'medikiosk_patient_session_v2';
const SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours validity for clinic OPD kiosk

/**
 * Clean large assets from documents before saving to localStorage to prevent quota overflow
 */
function sanitizeDocumentsForStorage(docs: MedicalDocument[]): MedicalDocument[] {
  return (docs || []).map((doc) => {
    // If thumbnailUrl is a heavy base64 data URI (> 20KB), remove it from localStorage draft
    let safeThumbnailUrl = doc.thumbnailUrl;
    if (safeThumbnailUrl && safeThumbnailUrl.startsWith('data:') && safeThumbnailUrl.length > 20000) {
      safeThumbnailUrl = undefined;
    }
    return {
      ...doc,
      thumbnailUrl: safeThumbnailUrl,
    };
  });
}

/**
 * Save the active kiosk patient session to localStorage
 */
export function saveKioskSession(session: Omit<KioskSessionData, 'updatedAt'>): void {
  try {
    const payload: KioskSessionData = {
      ...session,
      documents: sanitizeDocumentsForStorage(session.documents),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[MediKiosk] Failed to save patient session to local storage:', error);
  }
}

/**
 * Load the active kiosk patient session from localStorage
 */
export function loadKioskSession(): KioskSessionData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as KioskSessionData;

    // Validate structure
    if (!data || typeof data !== 'object') return null;

    // Check expiration
    if (data.updatedAt && Date.now() - data.updatedAt > SESSION_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[MediKiosk] Failed to load patient session from local storage:', error);
    return null;
  }
}

/**
 * Clear the saved session from localStorage (e.g., when a patient finishes and session resets)
 */
export function clearKioskSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[MediKiosk] Failed to clear patient session from local storage:', error);
  }
}

/**
 * Check if an unexpired in-progress session exists
 */
export function hasSavedKioskSession(): boolean {
  const session = loadKioskSession();
  return Boolean(session && session.kioskStep && session.kioskStep !== 'welcome');
}
