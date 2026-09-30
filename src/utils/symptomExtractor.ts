import { LanguageCode } from '../types';
import { REGIONAL_VOICE_CONFIGS } from './languageSpeechModule';

export interface ExtractedSymptomFields {
  chiefComplaint?: string;
  duration?: string;
  location?: string;
  triggers?: string;
  associations?: string;
  severity?: string;
  redFlagDetected?: boolean;
  redFlagReason?: string;
  confidenceScore?: number;
  fieldsExtracted: string[];
}

/**
 * Standard clinical chief complaints list in English
 */
export const CHIEF_COMPLAINT_KEYS = [
  'Stomach Pain & Gas',
  'Severe Chest Pain',
  'Joint or Knee Pain',
  'High Fever & Chills',
  'Cough & Throat Pain',
  'Headache & Dizziness',
  'Skin Itching or Rash',
  'Difficulty Breathing',
] as const;

/**
 * Fast, instant client-side heuristic parser for sub-100ms real-time feedback
 * as the user is actively speaking into the microphone.
 *
 * Fully incorporates Hindi (हिन्दी), Marathi (मराठी), Telugu (తెలుగు),
 * Bengali, Tamil, and English multilingual clinical vocabularies.
 */
export function extractSymptomsLocally(
  narration: string,
  language: LanguageCode = 'en'
): ExtractedSymptomFields {
  if (!narration || !narration.trim()) {
    return { fieldsExtracted: [] };
  }

  const lower = narration.toLowerCase();
  const fieldsExtracted: string[] = [];
  const result: ExtractedSymptomFields = { fieldsExtracted };

  // 1. Red Flags Check (Hindi, Marathi, Telugu, English, Bengali)
  const hasChestRedFlag =
    lower.includes('chest pain') ||
    lower.includes('heart') ||
    lower.includes('सीने') ||
    lower.includes('छाती') ||
    lower.includes('छातीत') ||
    lower.includes('हृदय') ||
    lower.includes('ఛాతీ') ||
    lower.includes('గుండె') ||
    lower.includes('বুকে ব্যথা');

  const hasSevereBreathing =
    lower.includes('difficulty breathing') ||
    lower.includes('cannot breathe') ||
    lower.includes('shortness of breath') ||
    lower.includes('सांस फूल') ||
    lower.includes('दम घुट') ||
    lower.includes('श्वास') ||
    lower.includes('दम लागणे') ||
    lower.includes('శ్వాస') ||
    lower.includes('ఆయాసం') ||
    lower.includes('ఊపిరి') ||
    lower.includes('दम बंद');

  if (hasChestRedFlag || hasSevereBreathing) {
    result.redFlagDetected = true;
    result.redFlagReason = hasChestRedFlag
      ? 'Acute thoracic / chest pain presentation'
      : 'Acute respiratory distress detected';
  }

  // 2. Chief Complaint Matching with Multi-Language Coverage (Hindi, Marathi, Telugu & others)
  if (
    // Stomach & Gastrointestinal
    lower.includes('stomach') ||
    lower.includes('belly') ||
    lower.includes('abdomen') ||
    lower.includes('gastric') ||
    lower.includes('gas') ||
    lower.includes('acidity') ||
    lower.includes('heartburn') ||
    lower.includes('पेट') ||
    lower.includes('पोट') ||
    lower.includes('पोटात') ||
    lower.includes('मळमळ') ||
    lower.includes('उलटी') ||
    lower.includes('कడుపు') ||
    lower.includes('మంట') ||
    lower.includes('వికారం') ||
    lower.includes('వాంతి') ||
    lower.includes('వాంతులు') ||
    lower.includes('హజమ్') ||
    lower.includes('খাবার') ||
    lower.includes('হজম')
  ) {
    result.chiefComplaint = 'Stomach Pain & Gas';
    fieldsExtracted.push('chiefComplaint');
  } else if (
    // Joints & Musculoskeletal
    lower.includes('joint') ||
    lower.includes('knee') ||
    lower.includes('arthritis') ||
    lower.includes('back pain') ||
    lower.includes('घुटने') ||
    lower.includes('घुटना') ||
    lower.includes('जोड़') ||
    lower.includes('हड्डी') ||
    lower.includes('कमर') ||
    lower.includes('गुडघा') ||
    lower.includes('गुडघे') ||
    lower.includes('सांधे') ||
    lower.includes('सांधेदुखी') ||
    lower.includes('कंबर') ||
    lower.includes('మోకాలు') ||
    lower.includes('మోకాళ్ళు') ||
    lower.includes('మోకాళ్ళ') ||
    lower.includes('కీళ్ళు') ||
    lower.includes('కీళ్ల') ||
    lower.includes('నడుము') ||
    lower.includes('হাঁটু') ||
    lower.includes('மூட்டு')
  ) {
    result.chiefComplaint = 'Joint or Knee Pain';
    fieldsExtracted.push('chiefComplaint');
  } else if (
    // Fever & Chills
    lower.includes('fever') ||
    lower.includes('chills') ||
    lower.includes('temperature') ||
    lower.includes('shivering') ||
    lower.includes('बुखार') ||
    lower.includes('ताप') ||
    lower.includes('थंडी') ||
    lower.includes('कापरे') ||
    lower.includes('ज్వరం') ||
    lower.includes('జ్వరం') ||
    lower.includes('చలి') ||
    lower.includes('వణుకు') ||
    lower.includes('জ্বর') ||
    lower.includes('காய்ச்சல்')
  ) {
    result.chiefComplaint = 'High Fever & Chills';
    fieldsExtracted.push('chiefComplaint');
  } else if (
    // Cough & Throat
    lower.includes('cough') ||
    lower.includes('throat') ||
    lower.includes('sore') ||
    lower.includes('phlegm') ||
    lower.includes('खांसी') ||
    lower.includes('खराश') ||
    lower.includes('गले') ||
    lower.includes('गला') ||
    lower.includes('खोकला') ||
    lower.includes('घसा') ||
    lower.includes('खवखव') ||
    lower.includes('దగ్గు') ||
    lower.includes('గొంతు') ||
    lower.includes('కఫం') ||
    lower.includes('কাশি')
  ) {
    result.chiefComplaint = 'Cough & Throat Pain';
    fieldsExtracted.push('chiefComplaint');
  } else if (
    // Headache & Dizziness
    lower.includes('headache') ||
    lower.includes('head ache') ||
    lower.includes('dizzy') ||
    lower.includes('migraine') ||
    lower.includes('सिरदर्द') ||
    lower.includes('सर दर्द') ||
    lower.includes('माथा') ||
    lower.includes('चक्कर') ||
    lower.includes('डोकेदुखी') ||
    lower.includes('डोके') ||
    lower.includes('भोवळ') ||
    lower.includes('తలనొప్పి') ||
    lower.includes('తల నొప్పి') ||
    lower.includes('తలతిరుగుడు') ||
    lower.includes('തലവേദന') ||
    lower.includes('தலைவலி')
  ) {
    result.chiefComplaint = 'Headache & Dizziness';
    fieldsExtracted.push('chiefComplaint');
  } else if (
    // Skin & Rash
    lower.includes('itching') ||
    lower.includes('rash') ||
    lower.includes('allergy') ||
    lower.includes('skin') ||
    lower.includes('खुजली') ||
    lower.includes('चकत्ते') ||
    lower.includes('दाने') ||
    lower.includes('खाज') ||
    lower.includes('पुरळ') ||
    lower.includes('గాంధी') ||
    lower.includes('దురద') ||
    lower.includes('దద్దుర్లు') ||
    lower.includes('మచ్చలు') ||
    lower.includes('చర్మం') ||
    lower.includes('চুলকানি')
  ) {
    result.chiefComplaint = 'Skin Itching or Rash';
    fieldsExtracted.push('chiefComplaint');
  } else if (hasChestRedFlag) {
    result.chiefComplaint = 'Severe Chest Pain';
    fieldsExtracted.push('chiefComplaint');
  } else if (hasSevereBreathing) {
    result.chiefComplaint = 'Difficulty Breathing';
    fieldsExtracted.push('chiefComplaint');
  }

  // 3. Duration Matching across Hindi, Marathi, Telugu, English
  const durationDaysMatch = lower.match(
    /(\d+|दोन|तीन|चार|రెండు|మూడు|నాలుగు)\s*(days?|दिन|दिनों|दिवस|दिवसांपासून|நாட்கள்|రోజులు|రోజుల)/i
  );
  const durationWeeksMatch = lower.match(
    /(\d+|दोन|तीन|రెండు|మూడు)\s*(weeks?|हफ्ते|सप्ताह|हफ़्ते|आठवडे|आठवड्यांपासून|সপ্তাহ|வாரங்கள்|వారాలు|వారాల)/i
  );
  const durationHoursMatch = lower.match(
    /(\d+)\s*(hours?|घंटे|तास|ঘণ্টা|గంటలు|மணி)/i
  );
  const durationMonthsMatch = lower.match(
    /(\d+)\s*(months?|महीने|महिने|महिन्यांपासून|মাস|నెలలు|నెలల)/i
  );

  if (
    lower.includes('today') ||
    lower.includes('आज') ||
    lower.includes('काही तास') ||
    lower.includes('ఈ రోజు') ||
    lower.includes('ఇప్పుడే') ||
    lower.includes('আজ') ||
    lower.includes('few hours') ||
    durationHoursMatch
  ) {
    result.duration = 'Today (Few hours ago)';
    fieldsExtracted.push('duration');
  } else if (durationDaysMatch) {
    const rawVal = durationDaysMatch[1];
    let num = parseInt(rawVal, 10);
    if (isNaN(num)) {
      if (rawVal.includes('दोन') || rawVal.includes('రెండు')) num = 2;
      else if (rawVal.includes('तीन') || rawVal.includes('మూడు')) num = 3;
      else num = 2;
    }
    if (num <= 3) {
      result.duration = '2 to 3 days ago';
    } else {
      result.duration = `${num} days ago`;
    }
    fieldsExtracted.push('duration');
  } else if (durationWeeksMatch) {
    const rawVal = durationWeeksMatch[1];
    let num = parseInt(rawVal, 10);
    if (isNaN(num)) {
      if (rawVal.includes('दोन') || rawVal.includes('రెండు')) num = 2;
      else if (rawVal.includes('तीन') || rawVal.includes('మూడు')) num = 3;
      else num = 2;
    }
    if (num <= 2) {
      result.duration = '1 to 2 weeks ago';
    } else {
      result.duration = `${num} weeks ago`;
    }
    fieldsExtracted.push('duration');
  } else if (
    durationMonthsMatch ||
    lower.includes('months') ||
    lower.includes('महीनों') ||
    lower.includes('महिन्यांपासून') ||
    lower.includes('నెలల నుండి') ||
    lower.includes('साल') ||
    lower.includes('वर्ष') ||
    lower.includes('సంవత్సరం')
  ) {
    result.duration = 'More than a month';
    fieldsExtracted.push('duration');
  } else if (
    lower.includes('yesterday') ||
    lower.includes('कल से') ||
    lower.includes('कालपासून') ||
    lower.includes('నిన్నటి నుండి')
  ) {
    result.duration = '2 to 3 days ago';
    fieldsExtracted.push('duration');
  }

  // 4. Location Matching across Hindi, Marathi, Telugu, English
  if (
    lower.includes('upper stomach') ||
    lower.includes('epigastric') ||
    lower.includes('chest and throat') ||
    lower.includes('ऊपरी पेट') ||
    lower.includes('पेट के ऊपर') ||
    lower.includes('वरचे पोट') ||
    lower.includes('पोटाच्या वरच्या') ||
    lower.includes('పై కడుపు') ||
    lower.includes('కడుపు పైభాగం')
  ) {
    result.location = 'Upper Stomach (Epigastric)';
    fieldsExtracted.push('location');
  } else if (
    lower.includes('lower abdomen') ||
    lower.includes('lower stomach') ||
    lower.includes('नाभि के नीचे') ||
    lower.includes('निचले पेट') ||
    lower.includes('खालचे पोट') ||
    lower.includes('बेंबीच्या खाली') ||
    lower.includes('క్రింది కడుపు') ||
    lower.includes('పొత్తికడుపు')
  ) {
    result.location = 'Lower Abdomen';
    fieldsExtracted.push('location');
  } else if (
    lower.includes('right knee') ||
    lower.includes('दाहिने घुटने') ||
    lower.includes('दायां घुटना') ||
    lower.includes('उजवा गुडघा') ||
    lower.includes('కుడి మోకాలు')
  ) {
    result.location = 'Right Knee Joint';
    fieldsExtracted.push('location');
  } else if (
    lower.includes('left knee') ||
    lower.includes('बाएं घुटने') ||
    lower.includes('बायां घुटना') ||
    lower.includes('डावा गुडघा') ||
    lower.includes('ఎడమ మోకాలు')
  ) {
    result.location = 'Left Knee Joint';
    fieldsExtracted.push('location');
  } else if (
    lower.includes('both knees') ||
    lower.includes('दोनों घुटनों') ||
    lower.includes('दोनों घुटने') ||
    lower.includes('दोन्ही गुडघे') ||
    lower.includes('రెండు మోకాళ్ళు') ||
    lower.includes('రెండు కాళ్ళు')
  ) {
    result.location = 'Both Knee Joints (Bilateral)';
    fieldsExtracted.push('location');
  } else if (
    lower.includes('throat') ||
    lower.includes('गले') ||
    lower.includes('गला') ||
    lower.includes('घसा') ||
    lower.includes('घशात') ||
    lower.includes('గొంతు')
  ) {
    result.location = 'Throat & Pharynx';
    fieldsExtracted.push('location');
  } else if (
    lower.includes('forehead') ||
    lower.includes('temple') ||
    lower.includes('माथे') ||
    lower.includes('सिर') ||
    lower.includes('कपाळ') ||
    lower.includes('నుదురు') ||
    lower.includes('కణతలు')
  ) {
    result.location = 'Frontal Forehead & Temples';
    fieldsExtracted.push('location');
  } else if (
    lower.includes('all over') ||
    lower.includes('पूरे शरीर') ||
    lower.includes('हाथ पैर') ||
    lower.includes('संपूर्ण शरीर') ||
    lower.includes('हातपाय') ||
    lower.includes('శరీరం మొత్తం') ||
    lower.includes('ఒళ్లంతా')
  ) {
    result.location = 'Generalized / Throughout Body';
    fieldsExtracted.push('location');
  }

  // 5. Triggers Matching across Hindi, Marathi, Telugu, English
  if (
    lower.includes('spicy') ||
    lower.includes('oily') ||
    lower.includes('heavy food') ||
    lower.includes('chilli') ||
    lower.includes('मसालेदार') ||
    lower.includes('तले भुने') ||
    lower.includes('तीखा') ||
    lower.includes('तिखट') ||
    lower.includes('तेलकट') ||
    lower.includes('जड जेवण') ||
    lower.includes('కారం') ||
    lower.includes('మసాలా') ||
    lower.includes('నూనె పదార్థాలు')
  ) {
    result.triggers = 'Worse after spicy, oily, or heavy meals';
    fieldsExtracted.push('triggers');
  } else if (
    lower.includes('empty stomach') ||
    lower.includes('fasting') ||
    lower.includes('खाली पेट') ||
    lower.includes('भूखे रहने') ||
    lower.includes('उपाशी पोटी') ||
    lower.includes('ఖాళీ కడుపుతో') ||
    lower.includes('ఉపవాసం')
  ) {
    result.triggers = 'Worse on empty stomach / prolonged fasting';
    fieldsExtracted.push('triggers');
  } else if (
    lower.includes('walking') ||
    lower.includes('stairs') ||
    lower.includes('standing') ||
    lower.includes('चलने') ||
    lower.includes('सीढ़ियां') ||
    lower.includes('चालताना') ||
    lower.includes('पायऱ्या') ||
    lower.includes('నడవడం') ||
    lower.includes('మెట్లు')
  ) {
    result.triggers = 'Aggravated by walking, stairs, or prolonged standing';
    fieldsExtracted.push('triggers');
  } else if (
    lower.includes('cold') ||
    lower.includes('winter') ||
    lower.includes('ice') ||
    lower.includes('ठंड') ||
    lower.includes('ठंडा पानी') ||
    lower.includes('थंडीत') ||
    lower.includes('थंड पाणी') ||
    lower.includes('చలిలో') ||
    lower.includes('చల్లని నీరు')
  ) {
    result.triggers = 'Worse in cold weather or with cold beverages';
    fieldsExtracted.push('triggers');
  } else if (
    lower.includes('stress') ||
    lower.includes('tension') ||
    lower.includes('lack of sleep') ||
    lower.includes('तनाव') ||
    lower.includes('नींद न आने') ||
    lower.includes('ताण') ||
    lower.includes('काळजी') ||
    lower.includes('झोप') ||
    lower.includes('ఒత్తిడి') ||
    lower.includes('ఆందోళన') ||
    lower.includes('నిద్రలేమి')
  ) {
    result.triggers = 'Triggered by stress, screen strain, or sleep deprivation';
    fieldsExtracted.push('triggers');
  }

  // 6. Associated Symptoms Matching across Hindi, Marathi, Telugu, English
  const associationsList: string[] = [];
  if (
    lower.includes('nausea') ||
    lower.includes('vomit') ||
    lower.includes('उल्टी') ||
    lower.includes('मतली') ||
    lower.includes('उलटी') ||
    lower.includes('मळमळ') ||
    lower.includes('వాంతులు') ||
    lower.includes('వికారం')
  ) {
    associationsList.push('Nausea & Vomiting');
  }
  if (
    lower.includes('burning') ||
    lower.includes('heartburn') ||
    lower.includes('जलन') ||
    lower.includes('खट्टी डकार') ||
    lower.includes('जळजळ') ||
    lower.includes('आंबट ढेकर') ||
    lower.includes('మంట') ||
    lower.includes('పుల్లని తేన్పులు')
  ) {
    associationsList.push('Retrosternal Burning & Acid Belching');
  }
  if (
    lower.includes('swelling') ||
    lower.includes('stiffness') ||
    lower.includes('सूजन') ||
    lower.includes('अकड़न') ||
    lower.includes('सूज') ||
    lower.includes('अकडणे') ||
    lower.includes('వాపు') ||
    lower.includes('బిగుతు') ||
    lower.includes('ফুলা')
  ) {
    associationsList.push('Joint Swelling & Stiffness');
  }
  if (
    lower.includes('dizziness') ||
    lower.includes('चक्कर') ||
    lower.includes('भोवळ') ||
    lower.includes('తలతిరుగుడు') ||
    lower.includes('నీరసం') ||
    lower.includes('माथा घुमा')
  ) {
    associationsList.push('Dizziness & Lightheadedness');
  }
  if (
    lower.includes('cough') ||
    lower.includes('fever') ||
    lower.includes('बुखार') ||
    lower.includes('खांसी') ||
    lower.includes('ताप') ||
    lower.includes('खोकला') ||
    lower.includes('జ్వరం') ||
    lower.includes('దగ్గు')
  ) {
    if (result.chiefComplaint !== 'High Fever & Chills' && result.chiefComplaint !== 'Cough & Throat Pain') {
      associationsList.push('Low-grade Fever & Dry Cough');
    }
  }

  if (associationsList.length > 0) {
    result.associations = associationsList.join(', ');
    fieldsExtracted.push('associations');
  }

  result.confidenceScore = Math.min(100, fieldsExtracted.length * 20);
  return result;
}

/**
 * Call the Gemini AI extraction endpoint on the server for deep semantic extraction
 */
export async function extractSymptomsWithGemini(
  narration: string,
  language: LanguageCode = 'en',
  existingAnswers?: Record<string, string>
): Promise<ExtractedSymptomFields> {
  // Always run local fast extractor first
  const localResult = extractSymptomsLocally(narration, language);

  try {
    const response = await fetch('/api/gemini/extract-symptoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narration,
        language,
        existingAnswers,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.data) {
      const serverData = data.data;
      const mergedFields = Array.from(
        new Set([...localResult.fieldsExtracted, ...(serverData.fieldsExtracted || [])])
      );

      return {
        chiefComplaint: serverData.chiefComplaint || localResult.chiefComplaint,
        duration: serverData.duration || localResult.duration,
        location: serverData.location || localResult.location,
        triggers: serverData.triggers || localResult.triggers,
        associations: serverData.associations || localResult.associations,
        severity: serverData.severity || localResult.severity,
        redFlagDetected: Boolean(serverData.redFlagDetected || localResult.redFlagDetected),
        redFlagReason: serverData.redFlagReason || localResult.redFlagReason,
        confidenceScore: serverData.confidenceScore || localResult.confidenceScore || 85,
        fieldsExtracted: mergedFields,
      };
    }
  } catch (err) {
    console.warn('Gemini symptom extraction call failed, using local extraction fallback:', err);
  }

  return localResult;
}
