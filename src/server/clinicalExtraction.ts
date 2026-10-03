import { GoogleGenAI } from '@google/genai';

export interface StructuredClinicalExtraction {
  symptoms: string[];
  duration: string | null;
  location: string | null;
  severity: string | null;
  medications: string[];
  previousOccurrence: string | null;
  ayurvedicCorrelations: string[];
}

/**
 * Extracts factual clinical entities strictly from the patient-approved transcript.
 * Never hallucinate or infer missing clinical facts.
 */
export async function extractClinicalEntitiesFromTranscript(
  patientConfirmedTranscript: string,
  languageCode: string
): Promise<StructuredClinicalExtraction> {
  const cleanText = (patientConfirmedTranscript || '').trim();
  if (!cleanText) {
    return {
      symptoms: [],
      duration: null,
      location: null,
      severity: null,
      medications: [],
      previousOccurrence: null,
      ayurvedicCorrelations: [],
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      symptoms: [cleanText],
      duration: null,
      location: null,
      severity: null,
      medications: [],
      previousOccurrence: null,
      ayurvedicCorrelations: [],
    };
  }

  const ai = new GoogleGenAI({});

  const systemInstruction = `You are a clinical NLP entity extraction service for an Ayush/Allopathic hospital kiosk.
You are given the PATIENT-CONFIRMED spoken response in language: ${languageCode}.

RULES:
1. Extract ONLY facts explicitly stated in the text.
2. NEVER infer or invent unstated clinical symptoms, severity, or medications.
3. If an entity is not mentioned, set its value to null or an empty array [].
4. Return JSON ONLY matching this schema:
{
  "symptoms": ["list of explicit symptoms mentioned"],
  "duration": "stated duration or null",
  "location": "stated anatomical body location or null",
  "severity": "stated severity or null",
  "medications": ["stated medications or null"],
  "previousOccurrence": "stated prior history or null",
  "ayurvedicCorrelations": ["explicit Ayurvedic terms mentioned like Pitta, Vata, Kapha, Amlapitta, etc. or []"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: cleanText }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      duration: parsed.duration || null,
      location: parsed.location || null,
      severity: parsed.severity || null,
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      previousOccurrence: parsed.previousOccurrence || null,
      ayurvedicCorrelations: Array.isArray(parsed.ayurvedicCorrelations) ? parsed.ayurvedicCorrelations : [],
    };
  } catch (err: any) {
    console.warn('[ClinicalExtraction] Entity extraction fallback:', err.message);
    return {
      symptoms: [cleanText],
      duration: null,
      location: null,
      severity: null,
      medications: [],
      previousOccurrence: null,
      ayurvedicCorrelations: [],
    };
  }
}
