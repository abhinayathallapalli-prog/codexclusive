export type LanguageCode =
  | 'en'
  | 'hi'
  | 'bn'
  | 'mr'
  | 'gu'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'pa';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
  voiceCode: string;
}

export type OPDTrack = 'allopathic' | 'ayush';

export type SeverityScaleType =
  | '0-10'
  | '0-4'
  | 'mild-moderate-severe'
  | 'frequency'
  | 'qualifiers';

export interface ClinicalSeverityRating {
  symptom: string;
  location?: string;
  severity: number;
  severityScale: SeverityScaleType;
  severityLabel: string;
  qualifier?: string;
  timestamp?: string;
}

export interface PatientProfile {
  id: string;
  abhaId: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  address: string;
  district: string;
  state: string;
  photoUrl?: string;
  tokenNumber: string;
  department: string;
  departmentBranch?: string;
  anatomicalLocation?: string;
  chiefComplaint?: string;
  routingConfidence?: 'high' | 'moderate' | 'low';
  confidenceScore?: number;
  confidenceRationale?: string;
  confidenceFactors?: string[];
  severityRating?: ClinicalSeverityRating;
  opdTrack: OPDTrack;
  isAyushSpecific: boolean;
  registeredAt: string;
  consentGranted: boolean;
  consentTimestamp?: string;
}

export interface SocratesHPI {
  site: string;
  onset: string;
  character: string;
  radiation: string;
  associations: string[];
  timing: string;
  exacerbatingFactors: string;
  relievingFactors: string;
  severity: number; // 1-10
}

export interface DashavidhaPariksha {
  prakriti: 'Vata' | 'Pitta' | 'Kapha' | 'Vata-Pitta' | 'Pitta-Kapha' | 'Vata-Kapha' | 'Tridoshaja';
  vikriti: string;
  sara: 'Pravara' | 'Madhyama' | 'Avara'; // Tissue excellence
  samhanana: 'Susamhata' | 'Madhyama' | 'Hina'; // Body build/compactness
  pramana: 'Sama' | 'Hina' | 'Ati'; // Anthropometry
  satmya: 'Sarva-rasa' | 'Eka-rasa' | 'Madhyama'; // Adaptability
  sattva: 'Pravara' | 'Madhyama' | 'Avara'; // Mental resilience
  aharaShakti: {
    abhyavaharana: 'Uttama' | 'Madhyama' | 'Hina'; // Ingestion
    jarana: 'Uttama' | 'Madhyama' | 'Hina'; // Digestion
  };
  vyayamaShakti: 'Uttama' | 'Madhyama' | 'Hina'; // Physical work capacity
  vaya: 'Bala' | 'Madhya' | 'Jirna'; // Age group
  agni: 'Sama' | 'Vishama' | 'Tikshna' | 'Manda';
  koshtha: 'Mridu' | 'Madhyama' | 'Krura';
  aharaVihara: {
    dietType: 'Shakahari (Veg)' | 'Mishrahari (Non-Veg)' | 'Alpahari';
    sleepPattern: 'Samyak (Normal)' | 'Anidra (Insomnia)' | 'Atinidra (Excessive)';
    dailyRoutine: string;
  };
}

export interface RedFlagAlert {
  id: string;
  severity: 'CRITICAL_EMERGENCY' | 'URGENT_PRIORITY' | 'STANDARD';
  symptom: string;
  triggerReason: string;
  actionRequired: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedBy?: string;
  datePrescribed?: string;
}

export interface ExtractedLabResult {
  testName: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  flagType?: 'HIGH' | 'LOW' | 'CRITICAL';
}

export interface MedicalDocument {
  id: string;
  name: string;
  documentType: 'Prescription' | 'Lab Report' | 'Discharge Summary' | 'Radiology / X-Ray';
  date: string;
  hospitalName: string;
  fileSize: string;
  thumbnailUrl?: string;
  ocrStatus: 'completed' | 'processing' | 'queued';
  extractedText: string;
  extractedDiagnoses: string[];
  extractedMedications: ExtractedMedication[];
  extractedLabResults: ExtractedLabResult[];
  notes: string;
  abnormalWarnings: string[];
  legibilityVerified?: boolean;
  scanQualityScore?: number;
  scanClarityIssues?: string[];
}

export interface ClinicalHistoryRecord {
  chiefComplaint: string;
  durationOfComplaint: string;
  hpi: SocratesHPI;
  pastMedicalHistory: string[];
  pastSurgicalHistory: string[];
  drugAllergies: string[];
  foodAllergies: string[];
  currentMedications: ExtractedMedication[];
  familyHistory: string[];
  personalHistory: {
    smoking: 'Never' | 'Former' | 'Active';
    alcohol: 'Never' | 'Occasional' | 'Regular';
    diet: string;
    physicalActivity: 'Sedentary' | 'Moderate' | 'Active';
  };
  reviewOfSystems: {
    system: string;
    symptoms: string[];
    isPositive: boolean;
  }[];
  ayushAssessment?: DashavidhaPariksha;
  redFlags: RedFlagAlert[];
  documents: MedicalDocument[];
  physicianNotes?: string;
  verifiedByPhysician: boolean;
  fhirBundleId?: string;
}

export interface ConversationTurn {
  id: string;
  sender: 'ai' | 'patient';
  text: string;
  audioPrompt?: string;
  stepKey?: string;
  options?: {
    label: string;
    subLabel?: string;
    value: string;
    icon?: string;
    isRedFlag?: boolean;
  }[];
  timestamp: string;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  abhaId?: string;
  role?: 'patient' | 'doctor' | 'admin';
  phoneVerified?: boolean;
  verificationToken?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface AppointmentBooking {
  id: string;
  userId: string;
  patientName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  abhaId: string;
  department: string;
  opdTrack: OPDTrack;
  appointmentDate: string;
  timeSlot: string;
  tokenNumber: string;
  status: 'confirmed' | 'checked-in' | 'in-consultation' | 'completed' | 'cancelled';
  chiefComplaint: string;
  roomNumber: string;
  createdAt: string;
  clinicalRecordId?: string;
}

export interface GeminiDifferentialDiagnosis {
  condition: string;
  probability: 'High' | 'Moderate' | 'Low';
  code: string;
  reasoning: string;
}

export interface GeminiInvestigation {
  test: string;
  urgency: 'Stat / Immediate' | 'Routine' | 'Next Follow-up';
  purpose: string;
}

export interface GeminiClinicalInsights {
  summary: string;
  differentialDiagnoses: GeminiDifferentialDiagnosis[];
  recommendedInvestigations: GeminiInvestigation[];
  ayushAnalysis?: {
    doshaDominance: string;
    agniStatus: string;
    dhatuInvolvement: string;
    chikitsaPrinciples: string[];
  };
  redFlagReview: {
    triageLevel: 'RED' | 'YELLOW' | 'GREEN';
    isEmergency: boolean;
    warningPoints: string[];
    immediateAction?: string;
  };
  patientCounseling: {
    pathyaDiet: string[];
    apathyaDiet: string[];
    lifestyle: string[];
  };
  generatedAt?: string;
  source?: 'gemini' | 'clinical_protocol_fallback';
  modelUsed?: string;
}

export interface GeminiChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  extractedHpi?: Partial<SocratesHPI>;
  redFlagsDetected?: string[];
  suggestedAnswers?: string[];
  speechText?: string;
}

export interface AdaptiveCheckboxOption {
  id: string;
  label: string;
  labelLocalized?: string;
  category?: string;
  isRedFlag?: boolean;
}

export interface AdaptiveQuestion {
  questionNumber: number;
  questionText: string;
  questionTextLocalized?: string;
  fieldKey: string;
  clinicalRationale?: string;
  allowMultiple?: boolean;
  options: AdaptiveCheckboxOption[];
}

export interface ClinicalProblemIdentification {
  identifiedProblem: string;
  ayushCorrelation?: string;
  confidenceScore: number;
  icd10Suggested?: string;
  department: string;
  triageLevel: 'Routine' | 'Priority' | 'Emergency';
  clinicalSummary: string;
  keyFindings: string[];
  recommendedPrecautions: string[];
  modelUsed?: string;
}

export interface AdaptiveInterviewResponse {
  isComplete: boolean;
  isEmergency: boolean;
  emergencyReason?: string | null;
  confidenceScore: number;
  currentDiagnosticHypothesis?: string;
  nextQuestion?: AdaptiveQuestion;
  identification?: ClinicalProblemIdentification;
  modelUsed?: string;
}

export type DepartmentCode =
  | 'KAYACHIKITSA'
  | 'SHALAKYA_TANTRA'
  | 'SHALYA_TANTRA'
  | 'PRASUTI_STRI_ROGA'
  | 'PANCHAKARMA'
  | 'GENERAL_OPD';

// Controlled Department Branches as specified in Section 26
export type KayachikitsaBranchCode =
  | 'DIGESTIVE'
  | 'RESPIRATORY'
  | 'METABOLIC_SYSTEMIC'
  | 'GENERAL_MEDICAL';

export type ShalakyaTantraBranchCode =
  | 'EYE'
  | 'EAR'
  | 'NOSE'
  | 'THROAT'
  | 'ORAL_HEAD_NECK';

export type ShalyaTantraBranchCode =
  | 'WOUND_INJURY'
  | 'ABSCESS_SWELLING'
  | 'ANORECTAL'
  | 'SURGICAL'
  | 'OTHER';

export type PrasutiStriRogaBranchCode =
  | 'MENSTRUAL'
  | 'PREGNANCY'
  | 'GYNECOLOGY'
  | 'REPRODUCTIVE'
  | 'PELVIC';

export type PanchakarmaBranchCode =
  | 'MUSCULOSKELETAL'
  | 'STIFFNESS'
  | 'REHABILITATION'
  | 'THERAPEUTIC_ASSESSMENT';

export type GeneralOpdBranchCode =
  | 'UNCLEAR'
  | 'MULTI_SYSTEM'
  | 'INITIAL_ASSESSMENT';

export type ControlledBranchCode =
  | KayachikitsaBranchCode
  | ShalakyaTantraBranchCode
  | ShalyaTantraBranchCode
  | PrasutiStriRogaBranchCode
  | PanchakarmaBranchCode
  | GeneralOpdBranchCode;

export type IntakeStatus =
  | 'needs_more_information'
  | 'routing_complete'
  | 'unclear'
  | 'urgent';

export type IntakeNextAction =
  | 'ask_question'
  | 'drill_down_anatomy'
  | 'show_department'
  | 'general_opd'
  | 'urgent_attention';

export interface NextQuestionData {
  text: string;
  textLocalized?: string;
  type: 'yes_no' | 'choice' | 'free_text';
  options?: string[];
  fieldKey?: string;
}

export interface DrillDownTargetData {
  bodyRegion: string;
  subRegion?: string;
  specificLocation?: string;
  prompt: string;
  promptLocalized?: string;
}

export interface PreviousAnswerRecord {
  question: string;
  answer: string;
}

export interface GeminiIntakeContext {
  bodyRegion?: string | null;
  side?: 'left' | 'right' | 'bilateral' | 'midline' | 'generalized' | null;
  subRegion?: string | null;
  specificLocation?: string | null;
  chiefComplaint?: string;
  symptoms?: string[];
  duration?: string | null;
  severity?: string | null;
  associatedSymptoms?: string[];
  injuryHistory?: string | null;
  previousAnswers?: PreviousAnswerRecord[];
  language?: string;
  patientAge?: number;
  patientGender?: string;
}

export interface AnatomicalLocationSelection {
  bodyRegion: string; // e.g. "upper_limb", "thorax_chest", "abdomen", "head_face_neck", "whole_body"
  bodyRegionLabel?: string;
  subRegion?: string; // e.g. "hand", "knee", "central_chest"
  subRegionLabel?: string;
  side?: 'left' | 'right' | 'bilateral' | 'midline' | 'generalized';
  specificLocation?: string; // e.g. "index_finger_middle_joint", "palm"
  specificLocationLabel?: string;
  anatomicalPath: string[]; // e.g. ["Body", "Right Arm", "Hand", "Index Finger", "Middle Joint"]
  coordinates?: { x: number; y: number };
}

export interface DepartmentBranchInfo {
  id: string;
  code?: ControlledBranchCode;
  name: string;
  nameLocalized?: string;
  description: string;
  departmentCode: DepartmentCode;
}

export interface SymptomTriageFollowUp {
  questionText: string;
  questionTextLocalized?: string;
  fieldKey: string;
  quickOptions?: Array<{
    id: string;
    label: string;
    labelLocalized?: string;
  }>;
}

export interface SymptomTriageResponse {
  status?: IntakeStatus;
  nextAction?: IntakeNextAction;
  nextQuestion?: NextQuestionData | null;
  drillDownTarget?: DrillDownTargetData | null;
  anatomy?: {
    bodyRegion: string | null;
    side: 'left' | 'right' | 'bilateral' | 'midline' | 'generalized' | null;
    subRegion: string | null;
    specificLocation: string | null;
  };
  clinicalInformation?: {
    chiefComplaint: string;
    symptoms: string[];
    duration: string | null;
    severity: string | null;
    associatedSymptoms: string[];
    injuryHistory: string | null;
  };
  redFlags?: {
    detected: boolean;
    reason: string | null;
  };
  routing?: {
    department: DepartmentCode | null;
    branch: string | null;
  };
  patientMessage?: string;

  // Flattened & legacy compatibility fields
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  severity: string;
  associatedSymptoms: string[];
  redFlagsDetected: boolean;
  redFlagReason: string | null;
  needsUrgentAttention?: boolean;
  urgentCareInstruction?: string | null;
  suggestedDepartment: DepartmentCode;
  suggestedBranch?: string;
  suggestedBranchId?: string;
  suggestedBranchCode?: ControlledBranchCode;
  suggestedBranchDetails?: DepartmentBranchInfo;
  anatomicalLocation?: AnatomicalLocationSelection;
  routingConfidence: 'high' | 'moderate' | 'low';
  confidenceScore?: number;
  confidenceRationale?: string;
  confidenceFactors?: string[];
  severityRating?: ClinicalSeverityRating;
  reason: string;
  needsDoctorAssessment: boolean;
  isComplete: boolean;
  followUpQuestion?: SymptomTriageFollowUp | null;
}

