/**
 * Domain-Specific Speech Adaptation Vocabulary for Google Cloud Speech-to-Text V2.
 * Adheres to Chirp 3 guidelines:
 * - Well under 1,000 total phrases
 * - Balanced boost values (10 - 15) to improve clinical recall without false-positive distortion
 * - Natural script variants (English transliterations and Devanagari originals)
 */

export interface SpeechPhrase {
  value: string;
  boost: number;
}

export const CLINICAL_AYURVEDIC_PHRASES: SpeechPhrase[] = [
  // Core Ayurvedic concepts
  { value: 'Ayurveda', boost: 12 },
  { value: 'आयुर्वेद', boost: 12 },
  { value: 'Ayush', boost: 12 },
  { value: 'आयुष', boost: 12 },
  { value: 'Dosha', boost: 12 },
  { value: 'दोष', boost: 12 },
  { value: 'Vata', boost: 12 },
  { value: 'वात', boost: 12 },
  { value: 'Pitta', boost: 12 },
  { value: 'पित्त', boost: 12 },
  { value: 'Kapha', boost: 12 },
  { value: 'कफ', boost: 12 },
  { value: 'Agni', boost: 10 },
  { value: 'अग्नि', boost: 10 },
  { value: 'Ama', boost: 10 },
  { value: 'आम', boost: 10 },
  { value: 'Dhatu', boost: 10 },
  { value: 'धातु', boost: 10 },
  { value: 'Mala', boost: 10 },
  { value: 'मल', boost: 10 },
  { value: 'Nadi', boost: 12 },
  { value: 'नाड़ी', boost: 12 },
  { value: 'Prakriti', boost: 10 },
  { value: 'प्रकृति', boost: 10 },
  { value: 'Vikriti', boost: 10 },
  { value: 'विकृति', boost: 10 },
  { value: 'Dashavidha Pariksha', boost: 12 },
  { value: 'दशविध परीक्षा', boost: 12 },
  { value: 'Ashtavidha Pariksha', boost: 10 },
  { value: 'अष्टविध परीक्षा', boost: 10 },
  { value: 'Amlapitta', boost: 12 },
  { value: 'अम्लपित्त', boost: 12 },
  { value: 'Mandagni', boost: 10 },
  { value: 'मंदाग्नि', boost: 10 },
  { value: 'Tikshnagni', boost: 10 },
  { value: 'Vishamagni', boost: 10 },
  { value: 'Vaidya', boost: 10 },
  { value: 'वैद्य', boost: 10 },
  { value: 'Rogi', boost: 10 },
  { value: 'रोगी', boost: 10 },

  // Clinical Symptoms (English & Common Indian Terminology)
  { value: 'headache', boost: 10 },
  { value: 'सिर दर्द', boost: 10 },
  { value: 'सिर में दर्द', boost: 10 },
  { value: 'migraine', boost: 10 },
  { value: 'माइग्रेन', boost: 10 },
  { value: 'chest pain', boost: 12 },
  { value: 'सीने में दर्द', boost: 12 },
  { value: 'abdominal pain', boost: 10 },
  { value: 'पेट दर्द', boost: 10 },
  { value: 'पेट में दर्द', boost: 10 },
  { value: 'stomach pain', boost: 10 },
  { value: 'fever', boost: 10 },
  { value: 'बुखार', boost: 10 },
  { value: 'cough', boost: 10 },
  { value: 'खांसी', boost: 10 },
  { value: 'dry cough', boost: 10 },
  { value: 'सूखी खांसी', boost: 10 },
  { value: 'shortness of breath', boost: 12 },
  { value: 'सांस लेने में तकलीफ', boost: 12 },
  { value: 'सांस फूलना', boost: 12 },
  { value: 'nausea', boost: 10 },
  { value: 'जी मिचलाना', boost: 10 },
  { value: 'vomiting', boost: 10 },
  { value: 'उल्टी', boost: 10 },
  { value: 'dizziness', boost: 10 },
  { value: 'चक्कर आना', boost: 10 },
  { value: 'fatigue', boost: 10 },
  { value: 'थकान', boost: 10 },
  { value: 'weakness', boost: 10 },
  { value: 'कमजोरी', boost: 10 },
  { value: 'acidity', boost: 12 },
  { value: 'एसिडिटी', boost: 12 },
  { value: 'gas', boost: 10 },
  { value: 'गैस', boost: 10 },
  { value: 'constipation', boost: 10 },
  { value: 'कब्ज', boost: 10 },
  { value: 'diarrhea', boost: 10 },
  { value: 'दस्त', boost: 10 },
  { value: 'loose motion', boost: 10 },
  { value: 'joint pain', boost: 10 },
  { value: 'जोड़ों में दर्द', boost: 10 },
  { value: 'back pain', boost: 10 },
  { value: 'कमर दर्द', boost: 10 },
  { value: 'पीठ दर्द', boost: 10 },
  { value: 'knee pain', boost: 10 },
  { value: 'घुटने में दर्द', boost: 10 },
  { value: 'skin rash', boost: 10 },
  { value: 'खुजली', boost: 10 },
  { value: 'itching', boost: 10 },
  { value: 'swelling', boost: 10 },
  { value: 'सूजन', boost: 10 },
  { value: 'burning sensation', boost: 10 },
  { value: 'जलन', boost: 10 },
  { value: 'loss of appetite', boost: 10 },
  { value: 'भूख न लगना', boost: 10 },
  { value: 'insomnia', boost: 10 },
  { value: 'नींद न आना', boost: 10 },

  // Telugu Clinical Phrases
  { value: 'తలవొప్పి', boost: 10 },
  { value: 'ఛాతీ నొప్పి', boost: 12 },
  { value: 'కడుపు నొప్పి', boost: 10 },
  { value: 'జ్వరం', boost: 10 },
  { value: 'దగ్గు', boost: 10 },
  { value: 'ఆయాసం', boost: 12 },
  { value: 'వాంతులు', boost: 10 },
  { value: 'నీరసం', boost: 10 },
  { value: 'కీళ్ల నొప్పులు', boost: 10 },

  // Common duration and qualifier phrases
  { value: 'three days', boost: 8 },
  { value: 'तीन दिन', boost: 8 },
  { value: 'since yesterday', boost: 8 },
  { value: 'कल से', boost: 8 },
  { value: 'one week', boost: 8 },
  { value: 'एक हफ्ते से', boost: 8 },
  { value: 'morning', boost: 8 },
  { value: 'सुबह', boost: 8 },
  { value: 'night', boost: 8 },
  { value: 'रात', boost: 8 },
  { value: 'after food', boost: 8 },
  { value: 'खाने के बाद', boost: 8 },
];

/**
 * Builds Google Cloud Speech-to-Text V2 inline phrase set adaptation config.
 */
export function buildSpeechAdaptationConfig() {
  return {
    phraseSets: [
      {
        inlinePhraseSet: {
          phrases: CLINICAL_AYURVEDIC_PHRASES.map((item) => ({
            value: item.value,
            boost: item.boost,
          })),
        },
      },
    ],
  };
}
