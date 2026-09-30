import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, Volume2, Info, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageCode, ClinicalSeverityRating, SeverityScaleType } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';

export interface ScaleTier {
  min: number;
  max: number;
  label: { en: string; hi: string; te: string };
  description: { en: string; hi: string; te: string };
  color: string;
  badgeBg: string;
}

export interface AdaptiveScaleConfig {
  isRateable: boolean;
  scaleType: SeverityScaleType;
  title: { en: string; hi: string; te: string };
  subtitle: { en: string; hi: string; te: string };
  minLabel: { en: string; hi: string; te: string };
  maxLabel: { en: string; hi: string; te: string };
  options?: Array<{
    value: number;
    label: { en: string; hi: string; te: string };
    detail: { en: string; hi: string; te: string };
  }>;
  tiers: ScaleTier[];
}

/**
 * Evaluates patient complaint & location to determine if a severity rating scale
 * is clinically meaningful, and configures the appropriate scale format.
 * Returns isRateable: false when symptom severity rating is not clinically indicated.
 */
export function getClinicalScaleConfig(
  complaintText: string = '',
  locationText: string = ''
): AdaptiveScaleConfig {
  const combined = `${complaintText} ${locationText}`.toLowerCase();

  // Non-rateable complaints (administrative, reports, renewal, routine checkup, vaccination)
  const nonRateableKeywords = [
    'report', 'prescription', 'checkup', 'routine', 'renewal', 'vaccin',
    'certificate', 'slip', 'card', 'appointment', 'test result', 'billing', 'discharge',
  ];
  if (nonRateableKeywords.some((kw) => combined.includes(kw))) {
    return {
      isRateable: false,
      scaleType: '0-10',
      title: { en: '', hi: '', te: '' },
      subtitle: { en: '', hi: '', te: '' },
      minLabel: { en: '', hi: '', te: '' },
      maxLabel: { en: '', hi: '', te: '' },
      tiers: [],
    };
  }

  // 1. Headache / Head Pain
  if (combined.includes('headache') || combined.includes('सिरदर्द') || combined.includes('తలనొప్పి') || combined.includes('migraine')) {
    return {
      isRateable: true,
      scaleType: '0-10',
      title: {
        en: 'How severe is your headache from 0 to 10?',
        hi: 'आपका सिरदर्द 0 से 10 के पैमाने पर कितना तेज है?',
        te: 'మీ తలనొప్పి 0 నుండి 10 వరకు ఎంత తీవ్రంగా ఉంది?',
      },
      subtitle: {
        en: 'Tap a number or speak using the microphone. 0 is no headache, 10 is the worst possible.',
        hi: 'संख्या चुनें या माइक से बोलें। 0 का अर्थ कोई सिरदर्द नहीं, 10 अत्यधिक तेज सिरदर्द है।',
        te: 'సంఖ్యను ఎంచుకోండి లేదా మైక్ ఉపయోగించి మాట్లాడండి. 0 అంటే నొప్పి లేదు, 10 అత్యంత తీవ్రమైనది.',
      },
      minLabel: { en: '0 — No headache', hi: '0 — कोई सिरदर्द नहीं', te: '0 — తలనొప్పి లేదు' },
      maxLabel: { en: '10 — Worst possible', hi: '10 — असहनीय सिरदर्द', te: '10 — భరించలేని నొప్పి' },
      tiers: getStandardPainTiers(),
    };
  }

  // 2. Itching / Pruritus / Skin Rashes / Irritation
  if (
    combined.includes('itch') || combined.includes('खुजली') || combined.includes('దురద') ||
    combined.includes('rash') || combined.includes('चकत्ते') || combined.includes('ददोरे') ||
    combined.includes('irritat') || combined.includes('allergy') || combined.includes('दाद')
  ) {
    return {
      isRateable: true,
      scaleType: '0-10',
      title: {
        en: 'How severe is the itching from 0 to 10?',
        hi: 'खुजली 0 से 10 के पैमाने पर कितनी तेज है?',
        te: 'దురద 0 నుండి 10 వరకు ఎంత తీవ్రంగా ఉంది?',
      },
      subtitle: {
        en: '0 indicates no itching, and 10 indicates extremely severe, intolerable itching.',
        hi: '0 का अर्थ खुजली नहीं, और 10 अत्यधिक गंभीर व असहनीय खुजली है।',
        te: '0 అంటే దురద లేదు, 10 అంటే భరించలేని తీవ్రమైన దురద.',
      },
      minLabel: { en: '0 = No itching', hi: '0 = कोई खुजली नहीं', te: '0 = దురద లేదు' },
      maxLabel: { en: '10 = Extremely severe', hi: '10 = अत्यंत गंभीर खुजली', te: '10 = తీవ్రమైన దురద' },
      tiers: [
        {
          min: 0,
          max: 0,
          label: { en: 'No Itching', hi: 'कोई खुजली नहीं', te: 'దురద లేదు' },
          description: { en: 'Completely comfortable; no urge to scratch', hi: 'कोई समस्या नहीं', te: 'సమస్య లేదు' },
          color: 'text-[#26312B]',
          badgeBg: 'bg-[#C9C5AF] text-[#26312B] border-[#A9AA94]',
        },
        {
          min: 1,
          max: 3,
          label: { en: 'Mild Itching', hi: 'हल्की खुजली', te: 'తేలికపాటి దురద' },
          description: { en: 'Occasional itch, easily ignored; does not disrupt rest', hi: 'हल्की खुजली, सामान्य दिनचर्या जारी', te: 'సాధారణం' },
          color: 'text-[#29483C]',
          badgeBg: 'bg-[#B5B7A1] text-[#29483C] border-[#29483C]',
        },
        {
          min: 4,
          max: 6,
          label: { en: 'Moderate Itching', hi: 'मध्यम खुजली', te: 'మధ్యస్థ దురద' },
          description: { en: 'Frequent itching, bothersome during routine tasks', hi: 'बार-बार खुजलाने की इच्छा होती है', te: 'తరచుగా వస్తుంది' },
          color: 'text-[#26312B]',
          badgeBg: 'bg-[#B5B7A1] text-[#26312B] border-[#A9AA94]',
        },
        {
          min: 7,
          max: 9,
          label: { en: 'Severe Itching', hi: 'तेज खुजली', te: 'తీవ్రమైన దురద' },
          description: { en: 'Persistent itching disrupting sleep or causing skin marks', hi: 'नींद में खलल, त्वचा छिलने का डर', te: 'निद्रకు భంగം' },
          color: 'text-[#A65F49]',
          badgeBg: 'bg-[#C9C5AF] text-[#A65F49] border-[#A65F49]',
        },
        {
          min: 10,
          max: 10,
          label: { en: 'Extremely Severe', hi: 'असहनीय खुजली', te: 'అత్యంత తీవ్రమైనది' },
          description: { en: 'Unbearable constant itching with intense skin distress', hi: 'लगातार असहनीय जलन व खुजली', te: 'భరించలేనిది' },
          color: 'text-[#A65F49]',
          badgeBg: 'bg-[#A65F49] text-white border-[#A65F49]',
        },
      ],
    };
  }

  // 3. Breathing Difficulty / Shortness of Breath (Categorical Dyspnea Scale)
  if (
    combined.includes('breath') || combined.includes('सांस') || combined.includes('శ్వాస') ||
    combined.includes('wheez') || combined.includes('asthma') || combined.includes('दम') ||
    combined.includes('dyspnea') || combined.includes('suffocat')
  ) {
    return {
      isRateable: true,
      scaleType: '0-4',
      title: {
        en: 'How does the breathing difficulty affect you?',
        hi: 'सांस लेने में तकलीफ आपको किस प्रकार प्रभावित कर रही है?',
        te: 'శ్వాస తీసుకోవడంలో ఇబ్బంది మిమ్మల్ని ఎలా ప్రభావితం చేస్తోంది?',
      },
      subtitle: {
        en: 'Select the statement that best describes when you feel short of breath.',
        hi: 'वह विकल्प चुनें जो आपकी सांस फूलने की स्थिति का सही वर्णन करता हो।',
        te: 'మీ పరిస్థితికి తగిన ఎంపికను ఎంచుకోండి.',
      },
      minLabel: { en: '0 — No breathlessness', hi: '0 — सामान्य सांस', te: '0 — శ్వాస ఇబ్బంది లేదు' },
      maxLabel: { en: '4 — Breathless at rest', hi: '4 — आराम करने पर भी सांस फूलना', te: '4 — విశ్రాంతిలోనూ శ్వాస కష్టం' },
      options: [
        {
          value: 0,
          label: { en: '0 — Normal Breathing', hi: '0 — सामान्य सांस', te: '0 — సాధారణ శ్వాస' },
          detail: { en: 'Only breathless with strenuous exercise', hi: 'केवल भारी व्यायाम पर', te: 'వ్యాయామం చేసినప్పుడు మాత్రమే' },
        },
        {
          value: 1,
          label: { en: '1 — Mild Breathlessness', hi: '1 — हल्की सांस फूलना', te: '1 — తేలికపాటి శ్వాస కష్టం' },
          detail: { en: 'Short of breath when hurrying or walking up a slight hill', hi: 'तेज चलने या सीढ़ियां चढ़ने पर', te: 'వేగంగా నడిచినప్పుడు' },
        },
        {
          value: 2,
          label: { en: '2 — Moderate Breathlessness', hi: '2 — मध्यम सांस फूलना', te: '2 — మధ్యస్థ శ్వాస కష్టం' },
          detail: { en: 'Walks slower than people of the same age on level ground', hi: 'समतल जमीन पर दूसरों से धीमा चलना पड़ता है', te: 'సాధారణ నడకలో ఆయాసం' },
        },
        {
          value: 3,
          label: { en: '3 — Severe Breathlessness', hi: '3 — तेज सांस फूलना', te: '3 — తీవ్రమైన శ్వాస కష్టం' },
          detail: { en: 'Stops for breath after walking 100 meters or a few minutes', hi: '100 मीटर चलने के बाद सांस के लिए रुकना', te: 'కొద్ది దూరం నడిస్తే ఆయాసం' },
        },
        {
          value: 4,
          label: { en: '4 — Very Severe / At Rest', hi: '4 — अत्यधिक गंभीर / आराम में भी', te: '4 — విశ్రాంతిలోనూ తీవ్రమైన ఆయాసం' },
          detail: { en: 'Too breathless to leave house or breathless when dressing', hi: 'बैठे-बैठे या कपड़े पहनते समय भी सांस फूलना', te: 'కూర్చున్నా ఆయాసం' },
        },
      ],
      tiers: [
        {
          min: 0,
          max: 0,
          label: { en: 'Normal', hi: 'सामान्य', te: 'సాధారణం' },
          description: { en: 'No dyspnea with regular activity', hi: 'सामान्य सांस', te: 'సాధారణ శ్వాస' },
          color: 'text-[#26312B]',
          badgeBg: 'bg-[#C9C5AF] text-[#26312B] border-[#A9AA94]',
        },
        {
          min: 1,
          max: 1,
          label: { en: 'Mild', hi: 'हल्का', te: 'తేలికపాటి' },
          description: { en: 'On brisk exertion', hi: 'तेज चलने पर', te: 'వేగంగా నడిస్తే' },
          color: 'text-[#29483C]',
          badgeBg: 'bg-[#B5B7A1] text-[#29483C] border-[#29483C]',
        },
        {
          min: 2,
          max: 2,
          label: { en: 'Moderate', hi: 'मध्यम', te: 'మధ్యస్థం' },
          description: { en: 'On flat walking', hi: 'समतल चलने पर', te: 'సాధారణ నడక' },
          color: 'text-[#26312B]',
          badgeBg: 'bg-[#B5B7A1] text-[#26312B] border-[#A9AA94]',
        },
        {
          min: 3,
          max: 3,
          label: { en: 'Severe', hi: 'गंभीर', te: 'తీవ్రమైనది' },
          description: { en: 'Minimal movement (<100m)', hi: 'थोड़ा चलने पर', te: 'కొద్దిపాటి నడక' },
          color: 'text-[#A65F49]',
          badgeBg: 'bg-[#C9C5AF] text-[#A65F49] border-[#A65F49]',
        },
        {
          min: 4,
          max: 4,
          label: { en: 'Very Severe', hi: 'अत्यधिक गंभीर', te: 'అత్యంత తీవ్రమైనది' },
          description: { en: 'Breathless at rest', hi: 'आराम करने पर भी', te: 'విశ్రాంతిలోనూ' },
          color: 'text-[#A65F49]',
          badgeBg: 'bg-[#A65F49] text-white border-[#A65F49]',
        },
      ],
    };
  }

  // 4. Pain / Ache (Stomach, Back, Joint, Chest, Abdomen, Muscle, etc.)
  const painKeywords = [
    'pain', 'ache', 'दर्द', 'नొప్పి', 'hurt', 'stomach', 'abdomen', 'back',
    'knee', 'joint', 'chest', 'cramp', 'throat', 'shoulder', 'spine', 'neck',
  ];
  if (painKeywords.some((kw) => combined.includes(kw))) {
    const areaName =
      combined.includes('stomach') || combined.includes('abdomen') || combined.includes('पेट') || combined.includes('కడుపు')
        ? 'stomach / abdominal pain'
        : combined.includes('knee') || combined.includes('घुटने') || combined.includes('మోకాలు')
        ? 'knee & joint pain'
        : combined.includes('back') || combined.includes('कमर') || combined.includes('पीठ') || combined.includes('నడుము')
        ? 'back pain'
        : 'pain';

    return {
      isRateable: true,
      scaleType: '0-10',
      title: {
        en: `How severe is your ${areaName} from 0 to 10?`,
        hi: 'आपका दर्द 0 से 10 के पैमाने पर कितना तेज है?',
        te: 'మీ నొప్పి 0 నుండి 10 వరకు ఎంత తీవ్రంగా ఉంది?',
      },
      subtitle: {
        en: 'Select a number from 0 (no pain) to 10 (worst possible pain), or speak into the microphone.',
        hi: '0 (कोई दर्द नहीं) से 10 (असहनीय दर्द) के बीच संख्या चुनें, या माइक से बोलें।',
        te: '0 (నొప్పి లేదు) నుండి 10 (తీవ్రమైన నొప్పి) వరకు సంఖ్యను ఎంచుకోండి లేదా మాట్లాడండి.',
      },
      minLabel: { en: '0 — No pain', hi: '0 — कोई दर्द नहीं', te: '0 — నొప్పి లేదు' },
      maxLabel: { en: '10 — Worst possible', hi: '10 — असहनीय दर्द', te: '10 — భరించలేని నొప్పి' },
      tiers: getStandardPainTiers(),
    };
  }

  // 5. Default General Rateable (Fatigue, Weakness, Dizziness, Cough, Nausea)
  const gradableGeneral = [
    'cough', 'खांसी', 'దగ్గు', 'dizzy', 'चक्कर', 'మైకం', 'weak', 'कमजोरी',
    'नीरसता', 'fatigue', 'थकान', 'ఆలసట', 'nausea', 'उल्टी', 'వాంతులు', 'fever', 'बुखार', 'జ్వరం',
  ];
  if (gradableGeneral.some((kw) => combined.includes(kw))) {
    return {
      isRateable: true,
      scaleType: '0-10',
      title: {
        en: 'How severe is this symptom from 0 to 10?',
        hi: 'यह लक्षण 0 से 10 के पैमाने पर कितना गंभीर है?',
        te: 'ఈ లక్షణం 0 నుండి 10 వరకు ఎంత తీవ్రంగా ఉంది?',
      },
      subtitle: {
        en: 'Rate how significantly this symptom is affecting your day-to-day comfort.',
        hi: 'बताएं कि यह समस्या आपकी दिनचर्या को कितनी अधिक प्रभावित कर रही है।',
        te: 'ఈ సమస్య మీ దైనందిన జీవితాన్ని ఎంతవరకు ప్రభావితం చేస్తుందో తెలపండి.',
      },
      minLabel: { en: '0 — No symptoms', hi: '0 — कोई लक्षण नहीं', te: '0 — లక్షణం లేదు' },
      maxLabel: { en: '10 — Worst possible', hi: '10 — अत्यधिक गंभीर', te: '10 — భరించలేనిది' },
      tiers: getStandardPainTiers(),
    };
  }

  // Otherwise, no clinical severity rating needed for this symptom
  return {
    isRateable: false,
    scaleType: '0-10',
    title: { en: '', hi: '', te: '' },
    subtitle: { en: '', hi: '', te: '' },
    minLabel: { en: '', hi: '', te: '' },
    maxLabel: { en: '', hi: '', te: '' },
    tiers: [],
  };
}

function getStandardPainTiers(): ScaleTier[] {
  return [
    {
      min: 0,
      max: 0,
      label: { en: 'No symptoms', hi: 'कोई लक्षण नहीं', te: 'లక్షణాలు లేవు' },
      description: { en: 'Comfortable, pain-free state', hi: 'कोई दर्द या समस्या नहीं', te: 'నొప్పి లేదు' },
      color: 'text-[#26312B]',
      badgeBg: 'bg-[#C9C5AF] text-[#26312B] border-[#A9AA94]',
    },
    {
      min: 1,
      max: 3,
      label: { en: 'Mild', hi: 'हल्का दर्द', te: 'తేలికపాటి' },
      description: { en: 'Noticeable but easily tolerated; does not prevent activity', hi: 'हल्का दर्द, सामान्य काम जारी', te: 'సాధారణ పనులు చేయవచ్చు' },
      color: 'text-[#29483C]',
      badgeBg: 'bg-[#B5B7A1] text-[#29483C] border-[#29483C]',
    },
    {
      min: 4,
      max: 6,
      label: { en: 'Moderate', hi: 'मध्यम दर्द', te: 'మధ్యస్థం' },
      description: { en: 'Interferes with tasks or concentration; needs resting', hi: 'काम करने में बाधा, आराम की आवश्यकता', te: 'పనులకు ఆటంకం' },
      color: 'text-[#26312B]',
      badgeBg: 'bg-[#B5B7A1] text-[#26312B] border-[#A9AA94]',
    },
    {
      min: 7,
      max: 9,
      label: { en: 'Severe', hi: 'तेज / गंभीर दर्द', te: 'తీవ్రమైనది' },
      description: { en: 'Disabling pain significantly disrupting normal function or sleep', hi: 'तेज दर्द, नींद या सामान्य काम में असमर्थ', te: 'తీవ్ర ఇబ్బంది' },
      color: 'text-[#A65F49]',
      badgeBg: 'bg-[#C9C5AF] text-[#A65F49] border-[#A65F49]',
    },
    {
      min: 10,
      max: 10,
      label: { en: 'Extreme / Worst possible', hi: 'असहनीय / अत्यधिक तीव्र', te: 'అత్యంత తీవ్రమైనది' },
      description: { en: 'Worst imaginable distress, unable to move or speak comfortably', hi: 'असहनीय दर्द, तुरंत चिकित्सा आवश्यक', te: 'భరించలేని నొప్పి' },
      color: 'text-[#A65F49]',
      badgeBg: 'bg-[#A65F49] text-white border-[#A65F49]',
    },
  ];
}

/**
 * Natural language voice parser to map spoken numbers and severity words
 * across English, Hindi, and Telugu into a numeric value.
 */
export function parseSpokenRating(spokenText: string, maxVal: number = 10): number | null {
  if (!spokenText || typeof spokenText !== 'string') return null;
  const clean = spokenText.trim().toLowerCase();

  // Direct digits check
  const digitMatch = clean.match(/\b([0-9]|10)\b/);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    if (!isNaN(n) && n >= 0 && n <= maxVal) return n;
  }

  // Word mappings
  const map: Record<string, number> = {
    // English
    zero: 0, none: 0, no: 0,
    one: 1, mild: 2,
    two: 2,
    three: 3,
    four: 4,
    five: 5, moderate: 5, medium: 5,
    six: 6,
    seven: 7, severe: 8,
    eight: 8,
    nine: 9,
    ten: 10, extreme: 10, worst: 10, unbearable: 10,

    // Hindi
    शून्य: 0, जीरो: 0, नहीं: 0,
    एक: 1, वन: 1,
    दो: 2, टू: 2, हल्का: 2,
    तीन: 3, थ्री: 3,
    चार: 4, फोर: 4,
    पांच: 5, पाँच: 5, फाइव: 5, मध्यम: 5,
    छह: 6, छ: 6, सिक्स: 6,
    सात: 7, सेवन: 7,
    आठ: 8, एट: 8, तेज: 8, गंभीर: 8,
    नौ: 9, नाइन: 9,
    दस: 10, टेन: 10, असहनीय: 10, बहुत: 10,

    // Telugu
    సున్నా: 0, లేదు: 0,
    ఒకటి: 1,
    రెండు: 2, తేలికపాటి: 2,
    మూడు: 3,
    నాలుగు: 4,
    ఐదు: 5, మధ్యస్థం: 5, మధ్యమ: 5,
    ఆరు: 6,
    ఏడు: 7,
    ఎనిమిది: 8, తీవ్రమైన: 8,
    తొమ్మిది: 9,
    పది: 10, అత్యంత: 10,
  };

  for (const [key, val] of Object.entries(map)) {
    if (clean.includes(key) && val <= maxVal) {
      return val;
    }
  }

  return null;
}

export interface AdaptiveRatingScaleProps {
  symptomName: string;
  locationName?: string;
  currentLanguage?: LanguageCode | string;
  initialValue?: number;
  onConfirm: (rating: ClinicalSeverityRating) => void;
  onSkip?: () => void;
  configOverride?: Partial<AdaptiveScaleConfig>;
  className?: string;
  audioEnabled?: boolean;
}

export const AdaptiveRatingScale: React.FC<AdaptiveRatingScaleProps> = ({
  symptomName,
  locationName = '',
  currentLanguage = 'en',
  initialValue,
  onConfirm,
  onSkip,
  configOverride,
  className = '',
  audioEnabled = true,
}) => {
  const lang = (currentLanguage || 'en') as 'en' | 'hi' | 'te';
  const resolvedLang = lang === 'hi' ? 'hi' : lang === 'te' ? 'te' : 'en';

  // Base clinical evaluation config
  const defaultConfig = getClinicalScaleConfig(symptomName, locationName);
  const config: AdaptiveScaleConfig = {
    ...defaultConfig,
    ...configOverride,
    tiers: configOverride?.tiers || defaultConfig.tiers,
  };

  const maxVal = config.scaleType === '0-4' ? 4 : 10;
  const [selectedValue, setSelectedValue] = useState<number | null>(
    initialValue !== undefined && initialValue !== null && initialValue >= 0 && initialValue <= maxVal
      ? initialValue
      : null
  );

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Find active tier
  const activeTier =
    selectedValue !== null
      ? config.tiers.find((t) => selectedValue >= t.min && selectedValue <= t.max) ||
        config.tiers[config.tiers.length - 1]
      : null;

  // Speak initial prompt if audio enabled
  useEffect(() => {
    if (audioEnabled && config.title[resolvedLang]) {
      const timer = setTimeout(() => {
        speakPrompt(config.title[resolvedLang], resolvedLang);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [audioEnabled, resolvedLang, config.title]);

  // Voice recognition setup
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice(
        resolvedLang === 'hi'
          ? 'इस ब्राउज़र में वॉइस उपलब्ध नहीं है, कृपया नंबर चुनें।'
          : resolvedLang === 'te'
          ? 'వాయిస్ అందుబాటులో లేదు, దయచేసి సంఖ్యను ఎంచుకోండి.'
          : 'Microphone not supported. Please select a number manually.'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = resolvedLang === 'hi' ? 'hi-IN' : resolvedLang === 'te' ? 'te-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice(null);
      };

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setVoiceTranscript(spoken);

        const parsed = parseSpokenRating(spoken, maxVal);
        if (parsed !== null) {
          setSelectedValue(parsed);
          setVoiceNotice(
            resolvedLang === 'hi'
              ? `पहचाना गया: ${parsed} — पुष्टि के लिए आगे बढ़ें`
              : resolvedLang === 'te'
              ? `గుర్తించబడింది: ${parsed} — కొనసాగించండి`
              : `Recognized: ${parsed} — Tap Continue to confirm`
          );
        } else {
          setVoiceNotice(
            resolvedLang === 'hi'
              ? 'कृपया 0 से 10 के बीच अपना दर्द या लक्षण स्तर चुनें।'
              : resolvedLang === 'te'
              ? 'దయచేసి 0 నుండి 10 వరకు మీ నొప్పి స్థాయిని ఎంచుకోండి.'
              : `Please select your level from 0 to ${maxVal}.`
          );
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceNotice(
          resolvedLang === 'hi'
            ? 'कृपया 0 से 10 के बीच अपना दर्द या लक्षण स्तर चुनें।'
            : resolvedLang === 'te'
            ? 'దయచేసి 0 నుండి 10 వరకు మీ నొప్పి స్థాయిని ఎంచుకోండి.'
            : `Please select your level from 0 to ${maxVal}.`
        );
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice(
        resolvedLang === 'hi'
          ? 'कृपया 0 से 10 के बीच अपना स्तर चुनें।'
          : `Please select your level from 0 to ${maxVal}.`
      );
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleContinue = () => {
    if (selectedValue === null) return;

    const labelEn = activeTier?.label.en || 'Recorded';
    const structuredRating: ClinicalSeverityRating = {
      symptom: symptomName || 'Reported Symptom',
      location: locationName || undefined,
      severity: selectedValue,
      severityScale: config.scaleType,
      severityLabel: labelEn,
      timestamp: new Date().toISOString(),
    };

    onConfirm(structuredRating);
  };

  return (
    <div
      className={`bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-6 space-y-5 text-[#26312B] ${className}`}
    >
      {/* Title & Clinical Prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#29483C] animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#29483C] bg-[#C9C5AF] border border-[#A9AA94] px-2.5 py-0.5 rounded-[4px]">
              {resolvedLang === 'hi'
                ? 'अनुकूली लक्षण तीव्रता मूल्यांकन'
                : resolvedLang === 'te'
                ? 'లక్షణ తీవ్రత అంచనా'
                : 'Ayush Clinical Severity Rating'}
            </span>
          </div>

          {/* Read Prompt Button */}
          {audioEnabled && (
            <button
              type="button"
              onClick={() => speakPrompt(config.title[resolvedLang], resolvedLang)}
              className="p-1.5 text-[#596058] hover:text-[#29483C] hover:bg-[#C9C5AF] rounded-[8px] transition cursor-pointer"
              title="Listen to question"
            >
              <Volume2 className="w-4 h-4 text-[#29483C]" />
            </button>
          )}
        </div>

        <h3 className="text-lg sm:text-xl font-serif text-[#26312B] leading-snug">
          {config.title[resolvedLang] || config.title.en}
        </h3>
        <p className="text-xs sm:text-sm font-medium text-[#596058]">
          {config.subtitle[resolvedLang] || config.subtitle.en}
        </p>
      </div>

      {/* Voice Assistant Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#C9C5AF] border border-[#A9AA94] rounded-[8px]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-voice-rating"
            onClick={isListening ? stopListening : startListening}
            className={`w-10 h-10 rounded-[8px] flex items-center justify-center font-bold transition-all cursor-pointer active:scale-95 ${
              isListening
                ? 'bg-[#29483C] text-white animate-pulse ring-2 ring-[#A9AA94]'
                : 'bg-[#E3DDCA] hover:bg-[#B5B7A1] text-[#26312B] border border-[#A9AA94]'
            }`}
            title="Speak your rating"
          >
            {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-[#29483C]" />}
          </button>
          <div>
            <span className="text-xs font-semibold text-[#26312B] block">
              {isListening
                ? resolvedLang === 'hi'
                  ? 'सुन रहा हूँ... अपना स्तर बोलें'
                  : 'Listening... say your number'
                : resolvedLang === 'hi'
                ? 'माइक दबाकर बोलें (जैसे: "सात" या "हल्का")'
                : 'Speak rating (e.g. "Seven" or "Moderate")'}
            </span>
            <span className="text-[10px] text-[#596058]">
              {resolvedLang === 'hi' ? 'अंग्रेजी, हिंदी व अन्य भाषाएँ समर्थित' : 'Bhashini Voice Engine Active'}
            </span>
          </div>
        </div>

        {voiceTranscript && (
          <span className="text-xs font-semibold text-[#29483C] bg-[#B5B7A1] border border-[#29483C]/40 px-2.5 py-0.5 rounded-[4px]">
            "{voiceTranscript}"
          </span>
        )}
      </div>

      {voiceNotice && (
        <div className="p-2.5 bg-[#C9C5AF] border border-[#A9AA94] rounded-[8px] text-xs font-medium text-[#26312B] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#29483C] shrink-0" />
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* ======================================================= */}
      {/* 0–10 NUMERICAL SCALE UI */}
      {/* ======================================================= */}
      {config.scaleType === '0-10' && (
        <div className="space-y-3.5">
          {/* Touch-Friendly Number Buttons Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
            {Array.from({ length: 11 }, (_, i) => i).map((num) => {
              const isSelected = selectedValue === num;
              const isLow = num === 0;
              const isMild = num >= 1 && num <= 3;
              const isMod = num >= 4 && num <= 6;
              const isSevere = num >= 7 && num <= 9;

              return (
                <button
                  key={num}
                  type="button"
                  id={`btn-scale-${num}`}
                  onClick={() => {
                    setSelectedValue(num);
                    setVoiceNotice(null);
                  }}
                  className={`min-h-[46px] min-w-[42px] h-12 rounded-[8px] font-mono font-semibold text-base flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#29483C] text-white ring-2 ring-[#71866F]/40 border border-[#29483C]'
                      : 'bg-[#C9C5AF] hover:bg-[#B5B7A1] text-[#26312B] border border-[#A9AA94]'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Rating ${num}`}
                >
                  <span>{num}</span>
                  <span
                    className={`text-[9px] font-sans font-medium uppercase tracking-tight block ${
                      isSelected ? 'text-[#D6B98C]' : 'text-[#596058]'
                    }`}
                  >
                    {isLow ? 'None' : isMild ? 'Mild' : isMod ? 'Mod' : isSevere ? 'Sev' : 'Max'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contextual Tier Guide below the buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center">
            <div className="p-2 rounded-[8px] bg-[#C9C5AF] border border-[#A9AA94] text-2xs space-y-0.5">
              <span className="font-semibold text-[#26312B] block text-xs">0</span>
              <span className="text-[#596058] block">
                {resolvedLang === 'hi' ? 'कोई लक्षण नहीं' : resolvedLang === 'te' ? 'లక్షణాలు లేవు' : 'No symptoms'}
              </span>
            </div>
            <div className="p-2 rounded-[8px] bg-[#C9C5AF] border border-[#A9AA94] text-2xs space-y-0.5">
              <span className="font-semibold text-[#26312B] block text-xs">1–3</span>
              <span className="text-[#596058] block">
                {resolvedLang === 'hi' ? 'हल्का (Mild)' : resolvedLang === 'te' ? 'తేలికపాటి' : 'Mild'}
              </span>
            </div>
            <div className="p-2 rounded-[8px] bg-[#C9C5AF] border border-[#A9AA94] text-2xs space-y-0.5">
              <span className="font-semibold text-[#26312B] block text-xs">4–6</span>
              <span className="text-[#596058] block">
                {resolvedLang === 'hi' ? 'मध्यम (Moderate)' : resolvedLang === 'te' ? 'మధ్యస్థం' : 'Moderate'}
              </span>
            </div>
            <div className="p-2 rounded-[8px] bg-[#C9C5AF] border border-[#A9AA94] text-2xs space-y-0.5">
              <span className="font-semibold text-[#26312B] block text-xs">7–9</span>
              <span className="text-[#596058] block">
                {resolvedLang === 'hi' ? 'गंभीर (Severe)' : resolvedLang === 'te' ? 'తీవ్రమైనది' : 'Severe'}
              </span>
            </div>
            <div className="p-2 rounded-[8px] bg-[#C9C5AF] border border-[#A65F49]/30 text-2xs space-y-0.5 col-span-2 sm:col-span-1">
              <span className="font-semibold text-[#A65F49] block text-xs">10</span>
              <span className="text-[#A65F49] block">
                {resolvedLang === 'hi' ? 'अत्यधिक (Worst)' : resolvedLang === 'te' ? 'అత్యంత తీవ్రమైనది' : 'Extreme / Worst'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 0–4 CATEGORICAL SCALE UI */}
      {/* ======================================================= */}
      {config.scaleType === '0-4' && config.options && (
        <div className="space-y-2">
          {config.options.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedValue(opt.value)}
                className={`w-full p-3.5 rounded-[8px] border text-left flex items-start gap-3 transition-all cursor-pointer min-h-[50px] ${
                  isSelected
                    ? 'border-[#29483C] bg-[#C9C5AF] ring-2 ring-[#71866F]/20'
                    : 'border-[#A9AA94] bg-[#C9C5AF] hover:bg-[#B5B7A1] text-[#26312B]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-[4px] font-mono font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'bg-[#29483C] text-white' : 'bg-[#E3DDCA] border border-[#A9AA94] text-[#26312B]'
                  }`}
                >
                  {opt.value}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-[#26312B] block">
                    {opt.label[resolvedLang] || opt.label.en}
                  </span>
                  <span className="text-xs font-normal text-[#596058] block mt-0.5">
                    {opt.detail[resolvedLang] || opt.detail.en}
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-[#29483C] shrink-0 mt-1 stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ======================================================= */}
      {/* INTERPRETATION PREVIEW CALLOUT */}
      {/* ======================================================= */}
      <AnimatePresence mode="wait">
        {selectedValue !== null && activeTier && (
          <motion.div
            key={`preview-${selectedValue}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 bg-[#C9C5AF] border border-[#29483C]/30 rounded-[8px] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-[8px] flex flex-col items-center justify-center font-mono font-bold shrink-0 border border-[#29483C] bg-[#29483C] text-white"
              >
                <span className="text-[9px] uppercase tracking-wider opacity-80">Score</span>
                <span className="text-lg leading-none">{selectedValue}</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-[#596058]">
                    {resolvedLang === 'hi' ? 'दर्ज की गई तीव्रता:' : 'Selected Severity:'}
                  </span>
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-[4px] bg-[#29483C] text-white">
                    {activeTier.label[resolvedLang] || activeTier.label.en}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#26312B]">
                  {activeTier.description[resolvedLang] || activeTier.description.en}
                </p>
              </div>
            </div>

            <span className="text-xs font-normal text-[#596058] italic">
              {resolvedLang === 'hi'
                ? 'पुष्टि करने से पहले आप संख्या बदल सकते हैं'
                : 'You may adjust before continuing'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Controls & Clinical Disclaimer */}
      <div className="pt-2 border-t border-[#A9AA94] flex flex-col sm:flex-row items-center justify-between gap-3">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-[#596058] hover:text-[#26312B] transition py-2 px-3 rounded-[8px] hover:bg-[#C9C5AF] cursor-pointer"
          >
            {resolvedLang === 'hi' ? 'स्किप करें (बिना रेटिंग आगे बढ़ें)' : 'Skip without rating'}
          </button>
        )}

        <button
          type="button"
          id="btn-confirm-rating"
          disabled={selectedValue === null}
          onClick={handleContinue}
          className="w-full sm:w-auto ml-auto px-6 py-2.5 bg-[#29483C] hover:bg-[#1d332a] active:bg-[#1d332a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-[8px] transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
        >
          <span>
            {resolvedLang === 'hi'
              ? 'पुष्टि करें व आगे बढ़ें'
              : resolvedLang === 'te'
              ? 'నిర్ధారించి కొనసాగించండి'
              : 'Continue'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Clinical Safety & Intake Governance Disclaimer */}
      <p className="text-[11px] text-[#596058] leading-tight pt-1 border-t border-[#A9AA94] flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#596058] shrink-0 mt-0.5" />
        <span>
          {resolvedLang === 'hi'
            ? 'क्लिनिकल सुरक्षा नियम: यह रेटिंग स्केल केवल रोगी इनटेक व दस्तावेजीकरण उपकरण है। यह कोई अंतिम चिकित्सा निदान नहीं है।'
            : 'Clinical Safety Notice: This rating scale is an intake and documentation tool only. Final clinical evaluation belongs to your attending physician.'}
        </span>
      </p>
    </div>
  );
};
