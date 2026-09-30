/**
 * MediKiosk API Client Layer with Structured Logging & Performance Monitoring Middleware
 * Tracks request performance, error rates, and latency — specifically monitoring AI processing times
 * for clinical history intake and vision OCR tasks.
 */

// ============================================================================
// 1. Core Data Models & Types
// ============================================================================

export interface ApiPatient {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  preferredLanguage: string;
  address?: string;
  createdAt: string;
}

export interface ApiDoctor {
  id: string;
  doctorId: string;
  name: string;
  email: string;
  phone?: string;
  specialization: string;
  department: string;
  opdRoom: string;
  role: 'doctor';
  accountType: 'Development / Test Account';
  createdAt: string;
}

export interface ApiPatientCase {
  id: string;
  caseId: string;
  patientId: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    abhaId?: string;
    department: string;
  };
  tokenNumber: string;
  department: string;
  roomNumber: string;
  status: 'Waiting' | 'In Consultation' | 'Verified';
  chiefComplaint: string;
  duration?: string;
  location?: string;
  triggers?: string;
  associations?: string;
  allAnswers?: Record<string, string>;
  documents?: any[];
  physicianNotes?: string;
  ayushAssessment?: any;
  prescriptions?: any[];
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OcrAnalysisResult {
  documentType: 'Prescription' | 'Lab Report' | 'Discharge Summary' | 'Radiology / X-Ray';
  hospitalName: string;
  date: string;
  extractedText: string;
  extractedDiagnoses: string[];
  extractedMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  extractedLabResults: Array<{
    testName: string;
    resultValue: string;
    unit: string;
    referenceRange: string;
    isAbnormal: boolean;
    flagType?: 'HIGH' | 'LOW' | 'CRITICAL';
  }>;
  abnormalWarnings: string[];
  notes: string;
}

export interface DynamicIntakeResponse {
  isComplete: boolean;
  isEmergency: boolean;
  emergencyReason?: string | null;
  nextQuestion?: {
    fieldKey: string;
    question: string;
    questionLocalized?: string;
    options: string[];
    allowFreeText: boolean;
    allowDocumentUpload: boolean;
    clinicalRationale?: string;
  } | null;
  structuredData: {
    chiefComplaint: string;
    symptoms: string[];
    duration: string;
    severity: string;
    previousOccurrence: string;
    pastMedicalHistory: string[];
    currentMedications: string[];
    familyHistory: string[];
    redFlags: string[];
  };
  routing: {
    department: string;
    branch: string;
    rationale: string;
  };
}

// ============================================================================
// 2. Structured Logging & Observability Middleware Definitions
// ============================================================================

export type ApiCallCategory =
  | 'ai-history'
  | 'ai-ocr'
  | 'ai-routing'
  | 'auth'
  | 'cases'
  | 'doctor'
  | 'general';

export interface ApiRequestLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  category: ApiCallCategory;
  operationName: string;
  durationMs: number;
  status: number;
  success: boolean;
  error?: {
    message: string;
    code?: string;
    status?: number;
  };
  metadata?: {
    modelUsed?: string;
    documentType?: string;
    payloadSizeApprox?: number;
    language?: string;
    itemCount?: number;
    [key: string]: any;
  };
}

export interface CategoryPerformanceMetric {
  category: ApiCallCategory;
  count: number;
  successCount: number;
  errorCount: number;
  errorRatePercent: number;
  totalDurationMs: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  lastDurationMs: number;
}

export interface ApiPerformanceMetrics {
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  overallErrorRatePercent: number;
  overallAvgLatencyMs: number;
  categories: Record<ApiCallCategory, CategoryPerformanceMetric>;
  aiMetrics: {
    ocrTotalRequests: number;
    ocrAvgDurationMs: number;
    ocrLastDurationMs: number;
    ocrErrorRatePercent: number;
    historyTotalRequests: number;
    historyAvgDurationMs: number;
    historyLastDurationMs: number;
    historyErrorRatePercent: number;
    routingTotalRequests: number;
    routingAvgDurationMs: number;
    routingLastDurationMs: number;
    routingErrorRatePercent: number;
  };
  lastUpdated: string;
}

export interface ApiFetchOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  category: ApiCallCategory;
  operationName: string;
  metadata?: Record<string, any>;
  skipAuth?: boolean;
}

// ============================================================================
// 3. In-Memory Metrics Store & Ring Buffer
// ============================================================================

const MAX_LOGS_HISTORY = 100;
const requestLogsRingBuffer: ApiRequestLog[] = [];

function createInitialCategoryMetric(cat: ApiCallCategory): CategoryPerformanceMetric {
  return {
    category: cat,
    count: 0,
    successCount: 0,
    errorCount: 0,
    errorRatePercent: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    minDurationMs: 0,
    maxDurationMs: 0,
    lastDurationMs: 0,
  };
}

const metricsState: {
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  overallTotalDurationMs: number;
  categories: Record<ApiCallCategory, CategoryPerformanceMetric>;
  subscribers: Set<(log: ApiRequestLog, metrics: ApiPerformanceMetrics) => void>;
} = {
  totalRequests: 0,
  totalSuccess: 0,
  totalErrors: 0,
  overallTotalDurationMs: 0,
  categories: {
    'ai-history': createInitialCategoryMetric('ai-history'),
    'ai-ocr': createInitialCategoryMetric('ai-ocr'),
    'ai-routing': createInitialCategoryMetric('ai-routing'),
    auth: createInitialCategoryMetric('auth'),
    cases: createInitialCategoryMetric('cases'),
    doctor: createInitialCategoryMetric('doctor'),
    general: createInitialCategoryMetric('general'),
  },
  subscribers: new Set(),
};

/**
 * Builds the current consolidated performance snapshot.
 */
export function getApiPerformanceMetrics(): ApiPerformanceMetrics {
  const overallAvg = metricsState.totalRequests > 0
    ? Math.round(metricsState.overallTotalDurationMs / metricsState.totalRequests)
    : 0;
  const overallErrRate = metricsState.totalRequests > 0
    ? Number(((metricsState.totalErrors / metricsState.totalRequests) * 100).toFixed(1))
    : 0;

  const ocr = metricsState.categories['ai-ocr'];
  const history = metricsState.categories['ai-history'];
  const routing = metricsState.categories['ai-routing'];

  return {
    totalRequests: metricsState.totalRequests,
    totalSuccess: metricsState.totalSuccess,
    totalErrors: metricsState.totalErrors,
    overallErrorRatePercent: overallErrRate,
    overallAvgLatencyMs: overallAvg,
    categories: { ...metricsState.categories },
    aiMetrics: {
      ocrTotalRequests: ocr.count,
      ocrAvgDurationMs: ocr.avgDurationMs,
      ocrLastDurationMs: ocr.lastDurationMs,
      ocrErrorRatePercent: ocr.errorRatePercent,
      historyTotalRequests: history.count,
      historyAvgDurationMs: history.avgDurationMs,
      historyLastDurationMs: history.lastDurationMs,
      historyErrorRatePercent: history.errorRatePercent,
      routingTotalRequests: routing.count,
      routingAvgDurationMs: routing.avgDurationMs,
      routingLastDurationMs: routing.lastDurationMs,
      routingErrorRatePercent: routing.errorRatePercent,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Retrieves the ring buffer of recent structured request logs.
 */
export function getApiRequestLogs(limit?: number, category?: ApiCallCategory): ApiRequestLog[] {
  let logs = [...requestLogsRingBuffer];
  if (category) {
    logs = logs.filter((l) => l.category === category);
  }
  if (typeof limit === 'number' && limit > 0) {
    return logs.slice(-limit);
  }
  return logs;
}

/**
 * Dedicated summary specifically for AI tasks (OCR, History, Routing).
 */
export function getAiPerformanceSummary(): {
  ocr: CategoryPerformanceMetric;
  history: CategoryPerformanceMetric;
  routing: CategoryPerformanceMetric;
} {
  return {
    ocr: { ...metricsState.categories['ai-ocr'] },
    history: { ...metricsState.categories['ai-history'] },
    routing: { ...metricsState.categories['ai-routing'] },
  };
}

/**
 * Subscribe to real-time structured API logs and metrics updates.
 */
export function subscribeToApiLogs(
  callback: (log: ApiRequestLog, metrics: ApiPerformanceMetrics) => void
): () => void {
  metricsState.subscribers.add(callback);
  return () => {
    metricsState.subscribers.delete(callback);
  };
}

/**
 * Resets metrics state (for testing or session resets).
 */
export function clearApiMetrics(): void {
  metricsState.totalRequests = 0;
  metricsState.totalSuccess = 0;
  metricsState.totalErrors = 0;
  metricsState.overallTotalDurationMs = 0;
  for (const key of Object.keys(metricsState.categories) as ApiCallCategory[]) {
    metricsState.categories[key] = createInitialCategoryMetric(key);
  }
  requestLogsRingBuffer.length = 0;
}

// ============================================================================
// 4. Central Structured Logging Middleware Interceptor
// ============================================================================

/**
 * Core middleware wrapper that intercepts all backend API calls, tracks
 * precise latency, logs structured payloads, calculates error rates, and monitors
 * AI processing times (especially history extraction and vision OCR).
 */
async function apiFetchMiddleware<T>(options: ApiFetchOptions): Promise<T> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const method = options.method || 'GET';
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    'X-Client-Timestamp': new Date().toISOString(),
    ...(options.headers || {}),
  };

  // Automatically attach auth token if available and not skipped
  if (!options.skipAuth) {
    const token = getStoredToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Set Content-Type for JSON payloads if not already set
  let requestBody: any = options.body;
  if (requestBody && typeof requestBody === 'object' && !(requestBody instanceof FormData)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    requestBody = JSON.stringify(requestBody);
  }

  // Calculate approximate payload size (safe, non-PII)
  const payloadSizeApprox = requestBody
    ? typeof requestBody === 'string'
      ? requestBody.length
      : 0
    : 0;

  let response: Response | null = null;
  let resData: any = null;
  let errorToThrow: Error | null = null;
  let isSuccess = false;
  let status = 0;

  try {
    response = await fetch(options.endpoint, {
      method,
      headers,
      body: requestBody,
    });

    status = response.status;

    // Parse JSON response safely
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      resData = await response.json();
    } else {
      const text = await response.text();
      resData = { success: response.ok, rawText: text };
    }

    if (!response.ok || (resData && resData.success === false)) {
      const errMsg =
        resData?.error?.message ||
        resData?.error ||
        resData?.message ||
        `Request failed with status ${response.status} (${response.statusText})`;
      isSuccess = false;
      errorToThrow = new Error(errMsg);
      (errorToThrow as any).status = response.status;
      (errorToThrow as any).code = resData?.error?.code || `HTTP_${response.status}`;
      (errorToThrow as any).requestId = requestId;
    } else {
      isSuccess = true;
    }
  } catch (err: any) {
    isSuccess = false;
    errorToThrow = err instanceof Error ? err : new Error(String(err));
    (errorToThrow as any).requestId = requestId;
  }

  // Calculate high-resolution duration
  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const durationMs = Math.round(endTime - startTime);

  // Update In-Memory Metrics State
  metricsState.totalRequests += 1;
  metricsState.overallTotalDurationMs += durationMs;

  const catMetric = metricsState.categories[options.category];
  catMetric.count += 1;
  catMetric.totalDurationMs += durationMs;
  catMetric.lastDurationMs = durationMs;
  catMetric.avgDurationMs = Math.round(catMetric.totalDurationMs / catMetric.count);
  catMetric.minDurationMs = catMetric.minDurationMs === 0 ? durationMs : Math.min(catMetric.minDurationMs, durationMs);
  catMetric.maxDurationMs = Math.max(catMetric.maxDurationMs, durationMs);

  if (isSuccess) {
    metricsState.totalSuccess += 1;
    catMetric.successCount += 1;
  } else {
    metricsState.totalErrors += 1;
    catMetric.errorCount += 1;
  }

  catMetric.errorRatePercent = Number(((catMetric.errorCount / catMetric.count) * 100).toFixed(1));

  // Extract non-PII safe metadata
  const safeMetadata: Record<string, any> = {
    ...(options.metadata || {}),
    payloadSizeApprox,
    modelUsed: resData?.modelUsed || resData?.data?.modelUsed,
    source: resData?.source,
  };

  // Structured Log Entry
  const logEntry: ApiRequestLog = {
    id: requestId,
    timestamp: new Date().toISOString(),
    endpoint: options.endpoint,
    method,
    category: options.category,
    operationName: options.operationName,
    durationMs,
    status,
    success: isSuccess,
    error: isSuccess
      ? undefined
      : {
          message: errorToThrow?.message || 'Unknown request failure',
          code: (errorToThrow as any)?.code,
          status,
        },
    metadata: safeMetadata,
  };

  // Store in ring buffer
  requestLogsRingBuffer.push(logEntry);
  if (requestLogsRingBuffer.length > MAX_LOGS_HISTORY) {
    requestLogsRingBuffer.shift();
  }

  // Output structured console metric
  const categoryTag = `[${options.category.toUpperCase()}]`;
  const statusTag = isSuccess ? `${status || 200} OK` : `FAILED (${status || 'NET_ERR'})`;
  const timingTag = `${durationMs}ms`;

  if (isSuccess) {
    console.info(
      `%c[MediKiosk API]%c ${categoryTag} ${method} ${options.endpoint} | ${statusTag} | Latency: ${timingTag} | ReqId: ${requestId}`,
      'color: #29483C; font-weight: bold;',
      'color: #596058;'
    );
  } else {
    console.error(
      `%c[MediKiosk API ERROR]%c ${categoryTag} ${method} ${options.endpoint} | ${statusTag} | Latency: ${timingTag} | ReqId: ${requestId} | Error: ${errorToThrow?.message}`,
      'color: #A65F49; font-weight: bold;',
      'color: #26312B;'
    );
  }

  // Notify registered observers/subscribers
  const currentSnapshot = getApiPerformanceMetrics();
  metricsState.subscribers.forEach((subscriber) => {
    try {
      subscriber(logEntry, currentSnapshot);
    } catch (subErr) {
      console.warn('Error in API metrics subscriber:', subErr);
    }
  });

  if (errorToThrow) {
    throw errorToThrow;
  }

  return resData as T;
}

// ============================================================================
// 5. Session Storage Helpers
// ============================================================================

const TOKEN_KEY = 'medikiosk_auth_token';
const USER_KEY = 'medikiosk_auth_user';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: any): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to store auth session in localStorage:', err);
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.warn('Failed to clear auth session:', err);
  }
}

// ============================================================================
// 6. Authentication APIs (Routed via Middleware)
// ============================================================================

// 1. Patient Registration
export async function apiRegisterPatient(data: {
  name: string;
  phone: string;
  age: number;
  gender: string;
  password: string;
  preferredLanguage?: string;
  address?: string;
  pregnancyStatus?: string;
  guardianName?: string;
  guardianPhone?: string;
}): Promise<{ patient: ApiPatient; token: string }> {
  const resData = await apiFetchMiddleware<{ success: boolean; patient: ApiPatient; token: string }>({
    endpoint: '/api/auth/patient/register',
    method: 'POST',
    body: data,
    category: 'auth',
    operationName: 'Register Patient',
    metadata: {
      preferredLanguage: data.preferredLanguage,
      gender: data.gender,
    },
    skipAuth: true,
  });

  setStoredSession(resData.token, { ...resData.patient, role: 'patient' });
  return { patient: resData.patient, token: resData.token };
}

// 2. Patient Login
export async function apiLoginPatient(
  identifier: string,
  password: string
): Promise<{ patient: ApiPatient; token: string }> {
  const resData = await apiFetchMiddleware<{ success: boolean; patient: ApiPatient; token: string }>({
    endpoint: '/api/auth/patient/login',
    method: 'POST',
    body: { identifier, password },
    category: 'auth',
    operationName: 'Patient Login',
    skipAuth: true,
  });

  setStoredSession(resData.token, { ...resData.patient, role: 'patient' });
  return { patient: resData.patient, token: resData.token };
}

// 3. Doctor Login
export async function apiLoginDoctor(
  doctorId: string,
  password: string
): Promise<{ doctor: ApiDoctor; token: string }> {
  const resData = await apiFetchMiddleware<{ success: boolean; doctor: ApiDoctor; token: string }>({
    endpoint: '/api/auth/doctor/login',
    method: 'POST',
    body: { doctorId, password },
    category: 'auth',
    operationName: 'Doctor Login',
    metadata: { doctorId },
    skipAuth: true,
  });

  setStoredSession(resData.token, { ...resData.doctor, role: 'doctor' });
  return { doctor: resData.doctor, token: resData.token };
}

// 4. Verify Active Session
export async function apiGetActiveSession(): Promise<{ user: any; role: 'patient' | 'doctor' } | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const resData = await apiFetchMiddleware<{ success: boolean; user: any; role: 'patient' | 'doctor' }>({
      endpoint: '/api/auth/me',
      method: 'GET',
      category: 'auth',
      operationName: 'Verify Active Session',
    });

    if (resData.success && resData.user) {
      setStoredSession(token, { ...resData.user, role: resData.role });
      return { user: resData.user, role: resData.role };
    }
    clearStoredSession();
    return null;
  } catch {
    clearStoredSession();
    return null;
  }
}

// 5. Logout
export async function apiLogout(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await apiFetchMiddleware({
        endpoint: '/api/auth/logout',
        method: 'POST',
        category: 'auth',
        operationName: 'Logout',
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  clearStoredSession();
}

// ============================================================================
// 7. Clinical Cases & Doctor Queue APIs (Routed via Middleware)
// ============================================================================

// 6. Submit Patient Case
export async function apiSubmitPatientCase(caseData: {
  patientId: string;
  patientName?: string;
  age?: number;
  gender?: string;
  phone?: string;
  department: string;
  departmentBranch?: string;
  chiefComplaint: string;
  duration?: string;
  location?: string;
  severity?: string;
  triggers?: string;
  associations?: string;
  allAnswers?: Record<string, string>;
  pastMedicalHistory?: string[];
  currentMedications?: any[];
  familyHistory?: string[];
  documents?: any[];
  ayushAssessment?: any;
}): Promise<ApiPatientCase> {
  const resData = await apiFetchMiddleware<{ success: boolean; case: ApiPatientCase }>({
    endpoint: '/api/patient/cases',
    method: 'POST',
    body: caseData,
    category: 'cases',
    operationName: 'Submit Patient Case',
    metadata: {
      department: caseData.department,
      departmentBranch: caseData.departmentBranch,
      documentCount: caseData.documents?.length || 0,
      hasSeverity: !!caseData.severity,
    },
  });

  return resData.case;
}

// 7. Fetch Doctor Cases Queue
export async function apiFetchDoctorCases(department?: string): Promise<ApiPatientCase[]> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Please log in with doctor credentials.');
  }

  const endpoint = department && department !== 'All'
    ? `/api/doctor/cases?department=${encodeURIComponent(department)}`
    : '/api/doctor/cases';

  const resData = await apiFetchMiddleware<{ success: boolean; cases: ApiPatientCase[] }>({
    endpoint,
    method: 'GET',
    category: 'doctor',
    operationName: 'Fetch Doctor Cases Queue',
    metadata: { departmentFilter: department || 'All' },
  });

  return resData.cases || [];
}

// 8. Update Doctor Case
export async function apiUpdateDoctorCase(
  caseId: string,
  updates: {
    status?: 'Waiting' | 'In Consultation' | 'Verified';
    physicianNotes?: string;
    prescriptions?: any[];
    chiefComplaint?: string;
  }
): Promise<ApiPatientCase> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Please log in with doctor credentials.');
  }

  const resData = await apiFetchMiddleware<{ success: boolean; case: ApiPatientCase }>({
    endpoint: `/api/doctor/cases/${encodeURIComponent(caseId)}`,
    method: 'PATCH',
    body: updates,
    category: 'doctor',
    operationName: 'Update Doctor Case',
    metadata: {
      caseId,
      newStatus: updates.status,
      hasNotes: !!updates.physicianNotes,
      prescriptionCount: updates.prescriptions?.length || 0,
    },
  });

  return resData.case;
}

// ============================================================================
// 8. AI Vision OCR Document Processing (Monitored via Middleware)
// ============================================================================

/**
 * 9. Real Gemini Vision OCR Document Analysis
 * Intercepted by logging middleware to accurately record OCR latency, image payload, and error rates.
 */
export async function apiAnalyzeDocumentOcr(params: {
  imageBase64: string;
  mimeType?: string;
  language?: string;
}): Promise<{ data: OcrAnalysisResult; modelUsed: string }> {
  const resData = await apiFetchMiddleware<{
    success: boolean;
    data: OcrAnalysisResult;
    modelUsed: string;
  }>({
    endpoint: '/api/ai/ocr-analyze',
    method: 'POST',
    body: params,
    category: 'ai-ocr',
    operationName: 'Gemini Vision OCR Document Analysis',
    metadata: {
      mimeType: params.mimeType || 'image/jpeg',
      language: params.language || 'en',
      imageLengthBytes: params.imageBase64?.length || 0,
    },
  });

  return {
    data: resData.data,
    modelUsed: resData.modelUsed,
  };
}

// ============================================================================
// 9. AI Symptom Routing & Triage (Monitored via Middleware)
// ============================================================================

/**
 * 10. AI Department Triage & Classification
 */
export async function apiTriageDepartment(params: {
  complaint?: string;
  chiefComplaint?: string;
  symptoms?: string[];
  conversation?: Array<{ role: 'patient' | 'ai'; content: string }>;
  language?: string;
  patientAge?: number;
  patientGender?: string;
  turnCount?: number;
  bodyRegion?: string;
  subRegion?: string;
  side?: string;
  specificLocation?: string;
  anatomicalPath?: string[];
  symptom?: string;
  duration?: string;
  severity?: string;
  associatedSymptoms?: string[];
  injuryHistory?: string;
  previousAnswers?: Array<{ question: string; answer: string }>;
}): Promise<{ data: any; modelUsed?: string; source?: string }> {
  const resData = await apiFetchMiddleware<{
    success: boolean;
    data: any;
    modelUsed?: string;
    source?: string;
  }>({
    endpoint: '/api/gemini/department-routing',
    method: 'POST',
    body: params,
    category: 'ai-routing',
    operationName: 'Department Triage Routing',
    metadata: {
      language: params.language || 'en',
      bodyRegion: params.bodyRegion,
      symptomsCount: params.symptoms?.length || 0,
    },
  });

  return {
    data: resData.data,
    modelUsed: resData.modelUsed,
    source: resData.source,
  };
}

/**
 * 11. Interpret Complaint & Anatomical Mapping
 */
export async function apiInterpretComplaint(
  text: string,
  language: string = 'en'
): Promise<{
  detectedRegion: string;
  detectedSubRegion: string | null;
  detectedSide: 'left' | 'right' | 'bilateral' | 'midline' | 'generalized';
  chiefComplaint: string;
  primarySymptom: string;
  suggestedSymptomOptions: string[];
  confidence: number;
  isUrgent: boolean;
  urgentReason: string | null;
}> {
  const resData = await apiFetchMiddleware<{
    success: boolean;
    data: {
      detectedRegion: string;
      detectedSubRegion: string | null;
      detectedSide: 'left' | 'right' | 'bilateral' | 'midline' | 'generalized';
      chiefComplaint: string;
      primarySymptom: string;
      suggestedSymptomOptions: string[];
      confidence: number;
      isUrgent: boolean;
      urgentReason: string | null;
    };
  }>({
    endpoint: '/api/gemini/interpret-complaint',
    method: 'POST',
    body: { text, language },
    category: 'ai-routing',
    operationName: 'Interpret Complaint',
    metadata: {
      language,
      inputCharLength: text.length,
    },
  });

  return resData.data;
}

// ============================================================================
// 10. AI Clinical History Intake & Dynamic Questions (Monitored via Middleware)
// ============================================================================

/**
 * 12. Clinical History Intake Comprehensive Analysis
 * Monitored under 'ai-history' category to record AI processing latency and error metrics.
 */
export async function apiClinicalIntakeAnalyze(params: {
  patientAge?: number;
  patientGender?: string;
  language?: string;
  anatomy?: {
    bodyRegion?: string;
    subRegion?: string | null;
    side?: string | null;
    specificLocation?: string | null;
  };
  chiefComplaint: string;
  symptoms: string[];
  duration?: string;
  onset?: string;
  severity?: string;
  previousOccurrence?: boolean;
  previousOccurrenceDetails?: any;
  pastMedicalHistory?: string[];
  currentMedications?: string[];
  familyHistory?: string[];
  uploadedDocuments?: any[];
}): Promise<any> {
  const resData = await apiFetchMiddleware<{ success: boolean; data: any }>({
    endpoint: '/api/gemini/clinical-intake-analyze',
    method: 'POST',
    body: params,
    category: 'ai-history',
    operationName: 'Clinical History Intake Analysis',
    metadata: {
      language: params.language || 'en',
      chiefComplaint: params.chiefComplaint,
      symptomsCount: params.symptoms?.length || 0,
      hasDocuments: (params.uploadedDocuments?.length || 0) > 0,
      severity: params.severity,
    },
  });

  return resData.data;
}

/**
 * 13. Dynamic Patient Question Step
 * Monitored under 'ai-history' category to track turn-by-turn question generation times.
 */
export async function apiDynamicIntakeStep(params: {
  patient?: { name?: string; age?: number; gender?: string };
  complaint?: string;
  anatomy?: any;
  knownData?: any;
  history?: Array<{ question: string; answer: string; fieldKey?: string }>;
  language?: string;
}): Promise<DynamicIntakeResponse> {
  const resData = await apiFetchMiddleware<{ success: boolean; data: DynamicIntakeResponse }>({
    endpoint: '/api/gemini/dynamic-intake-step',
    method: 'POST',
    body: params,
    category: 'ai-history',
    operationName: 'Dynamic Question Step',
    metadata: {
      turnCount: params.history?.length || 0,
      language: params.language || 'en',
      hasComplaint: !!params.complaint,
    },
  });

  return resData.data;
}
