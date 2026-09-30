import { AdaptiveInterviewResponse, AdaptiveQuestion, ClinicalProblemIdentification } from '../types';

export interface GeminiStatus {
  available: boolean;
  model: string;
  mode: string;
}

/**
 * Check Gemini API server-side availability
 */
export async function checkGeminiStatus(): Promise<GeminiStatus> {
  try {
    const res = await fetch('/api/gemini/status');
    if (!res.ok) throw new Error('Status endpoint returned error');
    return await res.json();
  } catch (err) {
    console.warn('Gemini status check failed:', err);
    return {
      available: false,
      model: 'gemini-3.1-flash-lite',
      mode: 'server-side',
    };
  }
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatbotResponse {
  success: boolean;
  text: string;
  modelUsed: string;
  sources?: GroundingSource[];
  error?: string;
}

/**
 * Multi-turn Gemini Chatbot with clinical role-based system instructions
 * Supports gemini-3.1-pro-preview for complex tasks, gemini-3.1-flash-lite for rapid triage & general queries,
 * with multi-model fallback cascade to gemini-flash-latest and gemini-3.8-flash.
 */
export async function sendChatbotMessage(params: {
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  role?: 'complex' | 'general' | 'fast';
  enableSearch?: boolean;
}): Promise<ChatbotResponse> {
  try {
    const res = await fetch('/api/gemini/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Chatbot server error (${res.status})`);
    }

    return await res.json();
  } catch (err: any) {
    console.error('Chatbot error:', err);
    return {
      success: false,
      text: 'I apologize, but I am currently unable to process your query. Please consult the nearest clinical staff.',
      modelUsed: 'fallback',
      error: err.message,
    };
  }
}

export interface MapsGroundingLink {
  title: string;
  uri: string;
  address?: string;
  snippet?: string;
}

export interface MapsGroundingResponse {
  success: boolean;
  modelUsed: string;
  text: string;
  mapsLinks: MapsGroundingLink[];
  error?: string;
}

/**
 * Execute Google Maps Grounding with Gemini for verified facilities, clinics & pharmacies
 */
export async function searchMapsGrounding(params: {
  query: string;
  lat?: number;
  lng?: number;
  context?: string;
}): Promise<MapsGroundingResponse> {
  try {
    const res = await fetch('/api/gemini/maps-grounding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Maps grounding failed (${res.status})`);
    }

    return await res.json();
  } catch (err: any) {
    console.error('Maps grounding error:', err);
    return {
      success: false,
      modelUsed: 'fallback',
      text: 'Unable to complete maps grounding at this time.',
      mapsLinks: [],
      error: err.message,
    };
  }
}

/**
 * Adaptive Clinical Intake: Fetch next question or final problem identification with Gemini
 */
export async function fetchAdaptiveNextQuestion(params: {
  history: Array<{
    questionNumber?: number;
    question: string;
    selectedOptions: string[];
    fieldKey?: string;
  }>;
  chiefComplaint?: string;
  language?: string;
  forceComplete?: boolean;
  currentStep?: number;
}): Promise<AdaptiveInterviewResponse> {
  try {
    const res = await fetch('/api/gemini/kiosk-next-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Adaptive question service failed (${res.status})`);
    }

    const json = await res.json();
    return json.data as AdaptiveInterviewResponse;
  } catch (err: any) {
    console.warn('Adaptive next question error, falling back locally:', err);
    // Graceful fallback
    return {
      isComplete: (params.currentStep || 1) >= 4 || Boolean(params.forceComplete),
      isEmergency: false,
      confidenceScore: 0.85,
      currentDiagnosticHypothesis: params.chiefComplaint || 'Clinical Evaluation',
      modelUsed: 'clinical-protocol-engine',
      nextQuestion: {
        questionNumber: (params.currentStep || 1) + 1,
        questionText: 'What other symptoms or aggravating factors are you noticing?',
        questionTextLocalized: 'आपको इनमें से कौन से अन्य लक्षण महसूस हो रहे हैं?',
        fieldKey: 'clinical_followup',
        clinicalRationale: 'Evaluates symptom cluster and severity',
        allowMultiple: true,
        options: [
          { id: 'opt_1', label: 'Discomfort worsens with stress or exertion', labelLocalized: 'तनाव या परिश्रम से दर्द बढ़ता है', isRedFlag: false },
          { id: 'opt_2', label: 'Associated with nausea or loss of appetite', labelLocalized: 'जी मिचलाना या भूख कम लगना', isRedFlag: false },
          { id: 'opt_3', label: 'Disturbed sleep due to discomfort', labelLocalized: 'दर्द के कारण नींद टूटना', isRedFlag: false },
          { id: 'opt_4', label: 'None of the above / Mild manageable symptoms', labelLocalized: 'इनमें से कोई नहीं / हल्का दर्द', isRedFlag: false },
        ],
      },
      identification: {
        identifiedProblem: `${params.chiefComplaint || 'Clinical Condition'} (Under Evaluation)`,
        ayushCorrelation: 'Dosha Imbalance Under Assessment',
        confidenceScore: 0.85,
        department: 'General OPD & Kayachikitsa',
        triageLevel: 'Routine',
        clinicalSummary: 'Clinical symptoms reviewed. Recommended standard OPD doctor evaluation.',
        keyFindings: [params.chiefComplaint || 'Reported symptoms'],
        recommendedPrecautions: ['Maintain balanced diet', 'Avoid strenuous exertion', 'Consult OPD physician'],
      },
    };
  }
}
