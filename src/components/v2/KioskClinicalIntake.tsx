import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  ShieldAlert,
  Loader2,
  Building2,
  MapPin,
  Clock,
  Pill,
  FileQuestion,
  Camera,
  ScanLine,
  HelpCircle,
  FileText,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LanguageCode,
  PatientProfile,
  AnatomicalLocationSelection,
  MedicalDocument,
  ClinicalSeverityRating,
} from '../../types';
import { speakPrompt, stopSpeech } from '../../utils/speechHelper';
import {
  playAudioConfirmation,
  INTAKE_AUDIO_CONFIRMATIONS,
} from '../../utils/audioConfirmationEngine';
import { VoiceToTextInput, VoiceLanguage } from './VoiceToTextInput';
import { PrescriptionScannerModal } from './PrescriptionScannerModal';
import { GeminiProcessingIndicator } from './GeminiProcessingIndicator';
import { DEPARTMENTS_DATA, getDeptInfoByCode } from '../../data/symptomRoutingData';
import { PatientHistorySummaryCard, PatientHistoryData } from './PatientHistorySummaryCard';
import { SymptomConfidenceIndicator } from './SymptomConfidenceIndicator';
import { AdaptiveRatingScale, getClinicalScaleConfig } from './AdaptiveRatingScale';

export interface StructuredCaseResult {
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  severity: string;
  severityRating?: ClinicalSeverityRating;
  previousOccurrence: string;
  pastMedicalHistory: string[];
  currentMedications: string[];
  familyHistory: string[];
  anatomicalLocation?: AnatomicalLocationSelection | null;
  department: string;
  departmentBranch: string;
  routingRationale: string;
  routingConfidence?: 'high' | 'moderate' | 'low';
  confidenceScore?: number;
  confidenceRationale?: string;
  confidenceFactors?: string[];
  isEmergency: boolean;
  emergencyReason?: string | null;
  documents: MedicalDocument[];
}

interface KioskClinicalIntakeProps {
  currentLanguage: LanguageCode;
  patient: PatientProfile;
  initialComplaint?: string;
  onComplete: (caseResult: StructuredCaseResult) => void;
  onTriggerRedFlag?: (reason: string) => void;
  onBack: () => void;
  audioEnabled: boolean;
}

// 6 Core Clinical Questions asked one at a time, followed by Review
export type QuestionIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface ClinicalQuestionDef {
  index: QuestionIndex;
  key: string;
  title: { en: string; hi: string; te: string };
  subtitle: { en: string; hi: string; te: string };
  audioPrompt: { en: string; hi: string; te: string };
  suggestions: Array<{ en: string; hi: string; te: string }>;
}

const CLINICAL_QUESTIONS: Record<1 | 2 | 3 | 4 | 5 | 6, ClinicalQuestionDef> = {
  1: {
    index: 1,
    key: 'chiefComplaint',
    title: {
      en: 'What are you suffering from?',
      hi: 'आप किस समस्या से परेशान हैं?',
      te: 'మీరు ఏ సమస్యతో బాధపడుతున్నారు?',
    },
    subtitle: {
      en: 'Describe your main health symptom or reason for visiting the hospital.',
      hi: 'अपनी मुख्य बीमारी या परेशानी बताएं। आप बोलकर या लिखकर उत्तर दे सकते हैं।',
      te: 'మీ ప్రధాన ఆరోగ్య సమస్యను తెలపండి. మీరు మాట్లాడవచ్చు లేదా టైప్ చేయవచ్చు.',
    },
    audioPrompt: {
      en: 'What are you suffering from? You can speak using the microphone or type below.',
      hi: 'आप किस समस्या से परेशान हैं? आप माइक दबाकर बोल सकते हैं या नीचे लिख सकते हैं।',
      te: 'మీరు ఏ సమస్యతో బాధపడుతున్నారు? మైక్రోఫోన్ ఉపయోగించి మాట్లాడండి లేదా కింద టైప్ చేయండి.',
    },
    suggestions: [
      { en: 'Severe Stomach Pain & Gas', hi: 'पेट में तेज दर्द व गैस', te: 'తీవ్రమైన కడుపు నొప్పి మరియు గ్యాస్' },
      { en: 'Fever, Shivering & Bodyache', hi: 'तेज बुखार, ठंड व बदन दर्द', te: 'జ్వరం, వణుకు మరియు ఒళ్లు నొప్పులు' },
      { en: 'Persistent Cough & Cold', hi: 'लगातार खांसी और जुकाम', te: 'నిరంతర దగ్గు మరియు జలుబు' },
      { en: 'Knee & Joint Stiffness', hi: 'घुटनों व जोड़ों में अकड़न व दर्द', te: 'మోకాళ్లు మరియు కీళ్ల నొప్పులు' },
      { en: 'Headache & Dizziness', hi: 'तेज सिरदर्द और चक्कर आना', te: 'తీవ్రమైన తలనొప్పి మరియు మైకం' },
      { en: 'Skin Itching & Red Rashes', hi: 'त्वचा पर खुजली व लाल चकत्ते', te: 'చర్మంపై దురద మరియు దద్దుర్లు' },
    ],
  },
  2: {
    index: 2,
    key: 'duration',
    title: {
      en: 'Since how many days have you had this problem?',
      hi: 'यह समस्या आपको कितने दिनों से है?',
      te: 'ఈ సమస్య మీకు ఎన్ని రోజులుగా ఉంది?',
    },
    subtitle: {
      en: 'Select or speak how long this trouble has been continuing.',
      hi: 'परेशानी कितने समय से चल रही है, बताएं या नीचे से चुनें।',
      te: 'ఈ బాధ ఎంత కాలంగా ఉందో తెలపండి లేదా ఎంచుకోండి.',
    },
    audioPrompt: {
      en: 'Since how many days have you had this problem? Tap a quick option or speak.',
      hi: 'यह समस्या आपको कितने दिनों से है? विकल्प चुनें या बोलकर बताएं।',
      te: 'ఈ సమస్య మీకు ఎన్ని రోజులుగా ఉంది? ఎంపికను ఎంచుకోండి లేదా మాట్లాడండి.',
    },
    suggestions: [
      { en: 'Started today (few hours ago)', hi: 'आज ही शुरू हुई (कुछ घंटों से)', te: 'ఈరోజే మొదలైంది (కొన్ని గంటల క్రితం)' },
      { en: '1 to 3 days', hi: '1 से 3 दिन', te: '1 నుండి 3 రోజులు' },
      { en: 'About 1 week', hi: 'लगभग 1 हफ्ता', te: 'సుమారు 1 వారం' },
      { en: '2 to 4 weeks', hi: '2 से 4 हफ्ते (लगभग 1 महीना)', te: '2 నుండి 4 వారాలు' },
      { en: 'More than a month (chronic)', hi: '1 महीने से ज्यादा (काफी समय से)', te: 'నెల కంటే ఎక్కువ రోజులుగా' },
    ],
  },
  3: {
    index: 3,
    key: 'location',
    title: {
      en: 'Where exactly is the problem occurring?',
      hi: 'यह समस्या शरीर में ठीक किस जगह पर हो रही है?',
      te: 'సమస్య శరీరంలో సరిగ్గా ఎక్కడ వస్తోంది?',
    },
    subtitle: {
      en: 'Select the body area or speak/type the exact spot (e.g. upper stomach, right knee).',
      hi: 'समस्या का क्षेत्र चुनें या सटीक स्थान बोलकर या लिखकर बताएं।',
      te: 'శరీర భాగం ఎంచుకోండి లేదా ఖచ్చితమైన స్థానాన్ని మాట్లాడండి/టైప్ చేయండి.',
    },
    audioPrompt: {
      en: 'Where exactly is the problem occurring? Select a body area or speak the location.',
      hi: 'समस्या ठीक किस जगह पर हो रही है? नीचे से क्षेत्र चुनें या बोलकर बताएं।',
      te: 'సమస్య శరీరంలో సరిగ్గా ఎక్కడ వస్తోంది? కింద ఎంచుకోండి లేదా మాట్లాడండి.',
    },
    suggestions: [
      { en: 'Head, Eyes & Neck', hi: 'सिर, आंखें और गर्दन', te: 'తల, కళ్ళు మరియు మెడ' },
      { en: 'Chest & Heart Area', hi: 'छाती और सीने का भाग', te: 'ఛాతీ మరియు గుండె భాగం' },
      { en: 'Stomach & Abdomen', hi: 'पेट और नाभि के आसपास', te: 'కడుపు మరియు నాభి చుట్టూ' },
      { en: 'Back & Spine', hi: 'कमर और पीठ (रीढ़ की हड्डी)', te: 'నడుము మరియు వెన్నుపాము' },
      { en: 'Arms & Hands', hi: 'हाथ, कंधे और बाजू', te: 'చేతులు మరియు భుజాలు' },
      { en: 'Legs, Knees & Feet', hi: 'पैर, घुटने और तलवे', te: 'కాళ్ళు, మోకాళ్ళు మరియు పాదాలు' },
      { en: 'Skin & Allergy Surfaces', hi: 'त्वचा / दाद / खुजली', te: 'చర్మం మరియు దురద' },
      { en: 'Whole Body / General', hi: 'पूरा शरीर / सामान्य कमजोरी', te: 'మొత్తం శరీరం / సాధారణం' },
    ],
  },
  4: {
    index: 4,
    key: 'previousOccurrence',
    title: {
      en: 'Have you experienced this problem before?',
      hi: 'क्या आपको यह समस्या पहले भी कभी हुई है?',
      te: 'ఈ సమస్య మీకు ఇంతకు ముందు ఎప్పుడైనా వచ్చిందా?',
    },
    subtitle: {
      en: 'Tell us if this is your first time or if you have had this trouble in the past.',
      hi: 'बताएं कि क्या यह पहली बार हुआ है या पहले भी कभी हो चुका है।',
      te: 'ఇది మొదటిసారి వచ్చిందా లేదా గతంలో కూడా వచ్చిందా తెలపండి.',
    },
    audioPrompt: {
      en: 'Have you experienced this problem before? Let us know your past occurrence.',
      hi: 'क्या आपको यह समस्या पहले भी कभी हुई है? बोलकर या विकल्प चुनकर बताएं।',
      te: 'ఈ సమస్య మీకు గతంలో ఎప్పుడైనా వచ్చిందా? మాట్లాడండి లేదా ఎంచుకోండి.',
    },
    suggestions: [
      { en: 'No, this is the very first time', hi: 'नहीं, यह पहली बार हुआ है', te: 'లేదు, ఇది మొదటిసారి వచ్చింది' },
      { en: 'Yes, happens frequently (recurring)', hi: 'हाँ, बार-बार होती रहती है', te: 'అవును, తరచుగా వస్తూ ఉంటుంది' },
      { en: 'Had it once a few months/years ago', hi: 'कुछ महीने या साल पहले एक बार हुई थी', te: 'కొన్ని నెలల లేదా సంవత్సరాల క్రితం ఒకసారి వచ్చింది' },
      { en: 'It is an ongoing chronic condition', hi: 'यह पुरानी बीमारी है जो चलती रहती है', te: 'ఇది దీర్ఘకాలిక సమస్య' },
    ],
  },
  5: {
    index: 5,
    key: 'currentMedications',
    title: {
      en: 'Have you taken any medicine for it?',
      hi: 'क्या आपने इसके लिए कोई दवा ली है?',
      te: 'దీని కోసం మీరు ఏదైనా మందులు తీసుకున్నారా?',
    },
    subtitle: {
      en: 'Mention any tablets, home remedies, or ayurvedic/allopathic medicines taken.',
      hi: 'कोई गोली, घरेलू नुस्खा या दवा ली हो तो बोलें या लिखें।',
      te: 'ఏవైనా మాత్రలు, ఇంటి చిట్కాలు లేదా మందులు తీసుకున్నారా తెలపండి.',
    },
    audioPrompt: {
      en: 'Have you taken any medicine for it? Speak any medicine names or select an option.',
      hi: 'क्या आपने इसके लिए कोई दवा ली है? दवाओं के नाम बोलें या विकल्प चुनें।',
      te: 'దీని కోసం మీరు ఏదైనా మందులు తీసుకున్నారా? మందుల పేర్లు చెప్పండి లేదా ఎంచుకోండి.',
    },
    suggestions: [
      { en: 'No, have not taken any medicine', hi: 'नहीं, कोई दवा नहीं ली है', te: 'లేదు, ఎలాంటి మందులూ తీసుకోలేదు' },
      { en: 'Took Paracetamol / Painkiller', hi: 'पैरासिटामोल या दर्द की गोली ली', te: 'పారాసిటమాల్ లేదా నొప్పి నివారణ మందు తీసుకున్నాను' },
      { en: 'Took Antacid / Gas tablet', hi: 'गैस या बदहजमी की गोली ली', te: 'ఎంటాసిడ్ లేదా గ్యాస్ మాత్ర తీసుకున్నాను' },
      { en: 'Taking regular BP / Diabetes medicines', hi: 'नियमित बीपी या शुगर की दवाएं ले रहा हूँ', te: 'రెగ్యులర్ బీపీ లేదా షుగర్ మందులు వాడుతున్నాను' },
      { en: 'Tried home herbal remedy', hi: 'घरेलू काढ़ा या नुस्खा लिया', te: 'ఇంటి వైద్యం లేదా కషాయం తీసుకున్నాను' },
    ],
  },
  6: {
    index: 6,
    key: 'documents',
    title: {
      en: 'Do you have any previous medical reports or prescriptions related to this problem?',
      hi: 'क्या आपके पास इस समस्या से संबंधित कोई पुराना पर्चा या जांच रिपोर्ट है?',
      te: 'ఈ సమస్యకు సంబంధించి మీ వద్ద పాత ప్రిస్క్రిప్షన్ లేదా వైద్య నివేదికలు ఏమైనా ఉన్నాయా?',
    },
    subtitle: {
      en: 'You can scan your paper with the kiosk camera, or proceed directly if you do not have any.',
      hi: 'यदि पर्चा है तो कैमरे से तुरंत स्कैन करें, या बिना पर्चे के सीधे आगे बढ़ें।',
      te: 'ప్రిస్క్రిప్షన్ ఉంటే కెమెరాతో స్కాన్ చేయండి, లేకుంటే నేరుగా ముందుకు వెళ్లండి.',
    },
    audioPrompt: {
      en: 'Do you have any previous medical reports or prescriptions? Scan now, or tap proceed if you do not have any.',
      hi: 'क्या आपके पास कोई पुराना पर्चा या रिपोर्ट है? स्कैन करें या बिना पर्चे के आगे बढ़ें।',
      te: 'మీ వద్ద పాత ప్రిస్క్రిప్షన్ ఉందా? స్కాన్ చేయండి లేదా లేకుంటే నేరుగా ముందుకు వెళ్లండి.',
    },
    suggestions: [
      { en: 'No old prescriptions or papers', hi: 'कोई पुराना पर्चा या कागज नहीं है', te: 'ఎలాంటి పాత ప్రిస్క్రిప్షన్లు లేవు' },
      { en: 'Prescription is at home', hi: 'पर्चा घर पर छूट गया है', te: 'ప్రిస్క్రిప్షన్ ఇంట్లో ఉంది' },
      { en: 'Had blood test done last week', hi: 'पिछले हफ्ते खून की जांच कराई थी', te: 'గత వారం రక్త పరీక్ష చేయించాను' },
    ],
  },
};

export const KioskClinicalIntake: React.FC<KioskClinicalIntakeProps> = ({
  currentLanguage,
  patient,
  initialComplaint = '',
  onComplete,
  onTriggerRedFlag,
  onBack,
  audioEnabled,
}) => {
  // Navigation: Step 1 through 6, then Step 7 (Summary & Department)
  const [currentStep, setCurrentStep] = useState<QuestionIndex>(1);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Active Voice-to-Text Language: Defaults to UI language or English
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => {
    if (currentLanguage === 'te') return 'te';
    if (currentLanguage === 'hi') return 'hi';
    return 'en';
  });

  // Keep voiceLang synchronized when currentLanguage changes
  useEffect(() => {
    if (currentLanguage === 'te') setVoiceLang('te');
    else if (currentLanguage === 'hi') setVoiceLang('hi');
    else setVoiceLang('en');
  }, [currentLanguage]);

  // Answers State for the 6 Questions
  const [answer1Complaint, setAnswer1Complaint] = useState<string>(initialComplaint);
  const [answer2Duration, setAnswer2Duration] = useState<string>('');
  const [answer3Location, setAnswer3Location] = useState<string>('');
  const [selectedLocationRegion, setSelectedLocationRegion] = useState<string>('');
  const [answer4Previous, setAnswer4Previous] = useState<string>('');
  const [answer5Medications, setAnswer5Medications] = useState<string>('');
  const [answer6Reports, setAnswer6Reports] = useState<string>('');

  // Documents & OCR state
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [hasNoPrescription, setHasNoPrescription] = useState<boolean>(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);

  // Verification & History Summary
  const [pastMedicalHistory, setPastMedicalHistory] = useState<string[]>([]);
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [currentMedsList, setCurrentMedsList] = useState<string[]>([]);

  // Emergency Red Flag State
  const [isEmergencyDetected, setIsEmergencyDetected] = useState<boolean>(false);
  const [emergencyReason, setEmergencyReason] = useState<string | null>(null);

  // Adaptive Disease / Symptom Rating Scale State
  const [severityRating, setSeverityRating] = useState<ClinicalSeverityRating | null>(null);
  const [isShowingRatingScale, setIsShowingRatingScale] = useState<boolean>(false);

  // Audio speech prompt on question step change
  useEffect(() => {
    if (!audioEnabled) return;

    if (currentStep >= 1 && currentStep <= 6) {
      const qDef = CLINICAL_QUESTIONS[currentStep as 1 | 2 | 3 | 4 | 5 | 6];
      const langKey = currentLanguage === 'hi' ? 'hi' : currentLanguage === 'te' ? 'te' : 'en';
      const prompt = qDef.audioPrompt[langKey] || qDef.audioPrompt.en;
      speakPrompt(prompt, currentLanguage);
    } else if (currentStep === 7) {
      const prompt =
        currentLanguage === 'hi'
          ? 'आपके उत्तरों के आधार पर उपयुक्त अस्पताल विभाग निर्धारित कर दिया गया है।'
          : currentLanguage === 'te'
          ? 'మీ సమాధానాల ఆధారంగా తగిన ఆసుపత్రి విభాగం కేటాయించబడింది.'
          : 'Based on your answers, your hospital department has been determined.';
      speakPrompt(prompt, currentLanguage);
    }

    return () => {
      stopSpeech();
    };
  }, [currentStep, currentLanguage, audioEnabled]);

  // Continuously check for acute clinical emergencies (Red Flag protocol)
  useEffect(() => {
    const fullNarrative = `${answer1Complaint} ${answer3Location} ${answer5Medications}`.toLowerCase();
    const acutePatterns = [
      { trigger: 'chest pain', reason: 'Acute chest pain indicating possible cardiac event' },
      { trigger: 'सीने में दर्द', reason: 'सीने में तीव्र दर्द (हृदय संबंधी जांच आवश्यक)' },
      { trigger: 'ఛాతీ నొప్పి', reason: 'తీవ్రమైన ఛాతీ నొప్పి' },
      { trigger: 'difficulty breathing', reason: 'Acute respiratory distress' },
      { trigger: 'सांस नहीं आ रही', reason: 'गंभीर सांस की तकलीफ' },
      { trigger: 'coughing blood', reason: 'Hemoptysis (coughing up blood)' },
      { trigger: 'खून की उल्टी', reason: 'Hematemesis (blood in vomiting)' },
      { trigger: 'unconscious', reason: 'Sudden loss of consciousness' },
      { trigger: 'बेहोश', reason: 'बेहोशी या अत्यधिक चक्कर' },
    ];

    const matched = acutePatterns.find((p) => fullNarrative.includes(p.trigger));
    if (matched) {
      setIsEmergencyDetected(true);
      setEmergencyReason(matched.reason);
      if (onTriggerRedFlag) onTriggerRedFlag(matched.reason);
    }
  }, [answer1Complaint, answer3Location, answer5Medications, onTriggerRedFlag]);

  // Synchronize medications list with answer 5
  useEffect(() => {
    if (answer5Medications.trim() && !answer5Medications.toLowerCase().includes('no') && !answer5Medications.includes('नहीं')) {
      const items = answer5Medications
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length > 0) {
        setCurrentMedsList((prev) => Array.from(new Set([...prev, ...items])));
      }
    }
  }, [answer5Medications]);

  // Department assignment algorithm based on patient answers
  const evaluatedRouting = useMemo(() => {
    const text = `${answer1Complaint} ${answer3Location} ${answer2Duration}`.toLowerCase();

    // 1. Shalya Tantra (Surgery, Orthopedic, Musculoskeletal, Wounds, Anorectal)
    if (
      text.includes('fracture') ||
      text.includes('bone') ||
      text.includes('knee') ||
      text.includes('joint') ||
      text.includes('घुटना') ||
      text.includes('हड्डी') ||
      text.includes('మోకాలు') ||
      text.includes('कील') ||
      text.includes('sprain') ||
      text.includes('मोच') ||
      text.includes('piles') ||
      text.includes('बवासीर') ||
      text.includes('wound') ||
      text.includes('घाव')
    ) {
      return {
        department: 'SHALYA_TANTRA',
        branch: 'ORTHOPEDIC_AND_SURGICAL',
        rationale: 'Symptoms involve musculoskeletal joint, bone or surgical assessment.',
        confidenceLevel: 'high' as const,
        confidenceScore: 94,
        confidenceRationale:
          'High match: Extracted complaint, physical location, and musculoskeletal symptom profile align directly with Shalya Tantra surgical and orthopedic clinical care.',
        confidenceFactors: [
          'Musculoskeletal / surgical complaint identified',
          'Localized anatomical site specified',
          'Timeline and injury history evaluated',
        ],
      };
    }

    // 2. Shalakya Tantra (ENT, Ophthalmology, Head & Neck)
    if (
      text.includes('eye') ||
      text.includes('ear') ||
      text.includes('nose') ||
      text.includes('throat') ||
      text.includes('आंख') ||
      text.includes('कान') ||
      text.includes('नाक') ||
      text.includes('गला') ||
      text.includes('కళ్ళు') ||
      text.includes('చెవులు') ||
      text.includes('ముక్కు') ||
      text.includes('గొంతు') ||
      text.includes('vision') ||
      text.includes('tonsil')
    ) {
      return {
        department: 'SHALAKYA_TANTRA',
        branch: 'ENT_AND_OPHTHALMOLOGY',
        rationale: 'Symptoms involve ENT (ear, nose, throat) or ophthalmology clinical area.',
        confidenceLevel: 'high' as const,
        confidenceScore: 95,
        confidenceRationale:
          'High match: Sensory organ presentation (eye/ear/nose/throat) exhibits 95% specificity to Shalakya Tantra clinical outpatient protocols.',
        confidenceFactors: [
          'ENT or Ophthalmology primary symptom detected',
          'Cephalic/cranial anatomical localization verified',
          'Acute onset and symptom timeline established',
        ],
      };
    }

    // 3. Stri Roga / Prasuti Tantra (Gynecology & Women’s Health)
    if (
      patient?.gender === 'female' &&
      (text.includes('pregnancy') ||
        text.includes('period') ||
        text.includes('menstrual') ||
        text.includes('माहवारी') ||
        text.includes('గర్భం') ||
        text.includes('గర్భవతి') ||
        text.includes('pelvic'))
    ) {
      return {
        department: 'PRASUTI_STRI_ROGA',
        branch: 'WOMENS_HEALTH_AND_GYNAECOLOGY',
        rationale: 'Conditions requiring dedicated obstetric and gynecological consultation.',
        confidenceLevel: 'high' as const,
        confidenceScore: 96,
        confidenceRationale:
          'High match: Gynecological and obstetric parameters match Prasuti Tantra clinical care with 96% diagnostic certainty.',
        confidenceFactors: [
          'Obstetric / gynecological primary concern reported',
          'Gender and clinical context validated',
          'Chronicity and physiological history reviewed',
        ],
      };
    }

    // 4. Kaumarbhritya (Pediatrics)
    if (patient?.age && patient.age < 15) {
      return {
        department: 'KAUMARBHRITYA',
        branch: 'PEDIATRIC_CLINICAL_CARE',
        rationale: 'Patient age under 15 routed to specialized pediatric OPD care.',
        confidenceLevel: 'high' as const,
        confidenceScore: 97,
        confidenceRationale:
          'High match: Patient chronological age (<15) matches Kaumarbhritya specialized pediatric protocol.',
        confidenceFactors: [
          'Pediatric age bracket confirmed',
          'Developmental clinical profile checked',
          'Pediatric dosage and triage safety applied',
        ],
      };
    }

    // 5. Panchakarma (Chronic Neurological, Spine, Detox, Severe Arthropathy)
    if (
      (text.includes('paralysis') ||
        text.includes('sciatica') ||
        text.includes('paralysis') ||
        text.includes('लकवा') ||
        text.includes('स्लिप डिस्क') ||
        text.includes('chronic') ||
        text.includes('पुराना')) &&
      answer2Duration.toLowerCase().includes('month')
    ) {
      return {
        department: 'PANCHAKARMA',
        branch: 'CHRONIC_REHABILITATION_AND_THERAPY',
        rationale: 'Chronic systemic condition benefiting from Panchakarma clinical therapy.',
        confidenceLevel: 'high' as const,
        confidenceScore: 91,
        confidenceRationale:
          'High match: Chronic duration (>1 month) with degenerative/neurological presentation matches Panchakarma therapeutic assessment criteria.',
        confidenceFactors: [
          'Chronic duration timeline established (>30 days)',
          'Neuromuscular / spine presentation mapped',
          'Ayush therapeutic therapy indicators present',
        ],
      };
    }

    // Default: Kayachikitsa (General Internal Medicine)
    const hasSpecificComplaint = Boolean(answer1Complaint && answer1Complaint.trim().length > 3);
    const calculatedScore = hasSpecificComplaint ? 89 : 82;
    return {
      department: 'KAYACHIKITSA',
      branch: 'GENERAL_INTERNAL_MEDICINE',
      rationale: 'Internal medicine assessment for acute/systemic medical presentation.',
      confidenceLevel: (calculatedScore >= 88 ? 'high' : 'moderate') as 'high' | 'moderate',
      confidenceScore: calculatedScore,
      confidenceRationale:
        'Solid match: Internal medicine presentation suitable for comprehensive systemic clinical evaluation in Kayachikitsa OPD.',
      confidenceFactors: [
        'Internal medical symptom pattern identified',
        'Acute/systemic timeline documented',
        'Prior medical history contextualized',
      ],
    };
  }, [answer1Complaint, answer3Location, answer2Duration, patient]);

  // Handlers for Navigation
  const handleNextStep = () => {
    // Dynamically evaluate if complaint and location warrant a severity rating scale
    if (currentStep === 3 && !severityRating && !isShowingRatingScale) {
      const scaleConfig = getClinicalScaleConfig(answer1Complaint, answer3Location);
      if (scaleConfig.isRateable) {
        setIsShowingRatingScale(true);
        return;
      }
    }

    const currentAnswer =
      currentStep === 1
        ? answer1Complaint
        : currentStep === 2
        ? answer2Duration
        : currentStep === 3
        ? answer3Location
        : currentStep === 4
        ? answer4Previous
        : currentStep === 5
        ? answer5Medications
        : answer6Reports;

    if (currentAnswer && currentAnswer.trim() && audioEnabled) {
      playAudioConfirmation({
        text: INTAKE_AUDIO_CONFIRMATIONS.symptomRecorded(currentAnswer.trim(), currentLanguage),
        language: currentLanguage,
        audioEnabled,
      });
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setIsShowingRatingScale(false);
      if (currentStep < 6) {
        setCurrentStep((prev) => ((prev + 1) as QuestionIndex));
      } else if (currentStep === 6) {
        setCurrentStep(7); // Proceed to Review & Department Reveal
      }
    }, 600);
  };

  const handlePrevStep = () => {
    if (isShowingRatingScale) {
      setIsShowingRatingScale(false);
      return;
    }
    if (currentStep === 4 && severityRating) {
      setIsShowingRatingScale(true);
      return;
    }
    if (currentStep > 1) {
      setCurrentStep((prev) => ((prev - 1) as QuestionIndex));
    } else {
      onBack();
    }
  };

  // Skip / "I don't have a prescription" button on Question 6
  const handleNoPrescriptionOption = () => {
    setHasNoPrescription(true);
    setAnswer6Reports('No past prescription or medical documents');
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentStep(7);
    }, 600);
  };

  // Submit complete structured case to existing app review workflow
  const handleFinalSubmit = () => {
    const result: StructuredCaseResult = {
      chiefComplaint: answer1Complaint.trim() || 'General Clinical Consultation',
      symptoms: [answer1Complaint.trim() || 'Discomfort', answer3Location.trim()].filter(Boolean),
      duration: answer2Duration.trim() || '1 to 3 days',
      severity: severityRating ? severityRating.severityLabel : 'Moderate',
      severityRating: severityRating || undefined,
      previousOccurrence: answer4Previous.trim() || 'First occurrence',
      pastMedicalHistory: pastMedicalHistory,
      currentMedications: currentMedsList,
      familyHistory: familyHistory,
      anatomicalLocation: {
        bodyRegion: selectedLocationRegion || 'general',
        bodyRegionLabel: answer3Location || 'General',
        anatomicalPath: [answer3Location || 'General'],
      },
      department: evaluatedRouting.department,
      departmentBranch: evaluatedRouting.branch,
      routingRationale: evaluatedRouting.rationale,
      routingConfidence: evaluatedRouting.confidenceLevel,
      confidenceScore: evaluatedRouting.confidenceScore,
      confidenceRationale: evaluatedRouting.confidenceRationale,
      confidenceFactors: evaluatedRouting.confidenceFactors,
      isEmergency: isEmergencyDetected,
      emergencyReason,
      documents,
    };

    onComplete(result);
  };

  // Current Question Object
  const activeQuestion = currentStep <= 6 ? CLINICAL_QUESTIONS[currentStep as 1 | 2 | 3 | 4 | 5 | 6] : null;
  const langKey = currentLanguage === 'hi' ? 'hi' : currentLanguage === 'te' ? 'te' : 'en';

  const deptInfo = getDeptInfoByCode(evaluatedRouting.department);

  return (
    <div id="kiosk-clinical-intake-container" className="max-w-4xl mx-auto px-4 py-4 select-none">
      {/* Top Header: Hospital Breadcrumb + Step Indicator + Emergency Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[#A9AA94]">
        <button
          type="button"
          onClick={handlePrevStep}
          className="px-4 py-2 bg-[#E3DDCA] hover:bg-[#B5B7A1] text-[#26312B] border border-[#A9AA94] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#29483C]" />
          <span>{currentLanguage === 'hi' ? 'पीछे जाएं' : currentLanguage === 'te' ? 'వెనుకకు' : 'Back'}</span>
        </button>

        {/* Question Step Progress Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((st) => (
              <button
                key={`step-dot-${st}`}
                type="button"
                onClick={() => {
                  if (!isAnalyzing) setCurrentStep(st as QuestionIndex);
                }}
                className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                  st === currentStep
                    ? 'bg-[#29483C] scale-125 ring-2 ring-[#29483C]/30'
                    : st < currentStep
                    ? 'bg-[#71866F] opacity-90'
                    : 'bg-[#A9AA94]'
                }`}
                title={`Question ${st}`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-[#29483C] uppercase tracking-wider ml-1">
            {currentStep <= 6
              ? currentLanguage === 'hi'
                ? `प्रश्न ${currentStep} / 6`
                : currentLanguage === 'te'
                ? `ప్రశ్న ${currentStep} / 6`
                : `Question ${currentStep} of 6`
              : currentLanguage === 'hi'
              ? 'सारांश एवं विभाग'
              : currentLanguage === 'te'
              ? 'సారాంశం మరియు విభాగం'
              : 'Review & Department'}
          </span>
        </div>

        {/* Red Flag Alert Badge if emergency symptoms detected */}
        {isEmergencyDetected ? (
          <div className="px-3 py-1 bg-[#A9654B] text-white rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
            <span>{currentLanguage === 'hi' ? 'प्राथमिकता ट्राइएज' : 'Priority Care Alert'}</span>
          </div>
        ) : (
          <div className="text-xs font-semibold text-[#596058] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#29483C]" />
            <span>OPD Clinical Triage</span>
          </div>
        )}
      </div>

      {/* AI THINKING STATE: While processing the patient's response before transitioning */}
      {isAnalyzing && (
        <div className="py-12">
          <GeminiProcessingIndicator currentLanguage={currentLanguage} />
        </div>
      )}

      {/* ADAPTIVE CLINICAL SEVERITY RATING STEP (DYNAMICALLY TRIGGERED FOR RATEABLE COMPLAINTS) */}
      {!isAnalyzing && isShowingRatingScale && (
        <motion.div
          key="adaptive-rating-scale-step"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22 }}
          className="space-y-6"
        >
          <AdaptiveRatingScale
            symptomName={answer1Complaint || 'Reported Symptom'}
            locationName={answer3Location}
            currentLanguage={currentLanguage}
            initialValue={severityRating?.severity}
            audioEnabled={audioEnabled}
            onConfirm={(rating) => {
              setSeverityRating(rating);
              setIsShowingRatingScale(false);
              setCurrentStep(4);
            }}
            onSkip={() => {
              setIsShowingRatingScale(false);
              setCurrentStep(4);
            }}
          />
        </motion.div>
      )}

      {/* QUESTION FLOW (QUESTIONS 1 TO 6) */}
      {!isAnalyzing && !isShowingRatingScale && currentStep <= 6 && activeQuestion && (
        <motion.div
          key={`question-${currentStep}`}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22 }}
          className="space-y-6"
        >
          {/* Question Title & Subtitle Card */}
          <div className="bg-[#E3DDCA] p-6 rounded-[10px] border border-[#A9AA94] space-y-3 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#B5B7A1] text-[#29483C] text-xs font-semibold border border-[#A9AA94]">
              <Activity className="w-3.5 h-3.5 text-[#29483C]" />
              <span>
                {currentLanguage === 'hi'
                  ? `लक्षण परीक्षण प्रश्न ${currentStep}`
                  : currentLanguage === 'te'
                  ? `క్లినికల్ ప్రశ్న ${currentStep}`
                  : `Clinical Assessment ${currentStep} of 6`}
              </span>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#26312B] leading-snug">
              {activeQuestion.title[langKey] || activeQuestion.title.en}
            </h2>

            <p className="text-sm text-[#596058] font-normal leading-relaxed">
              {activeQuestion.subtitle[langKey] || activeQuestion.subtitle.en}
            </p>
          </div>

          {/* Quick Clickable Suggestions / Options */}
          <div className="bg-[#B5B7A1]/60 p-5 rounded-[10px] border border-[#A9AA94] space-y-3 text-left">
            <span className="text-xs font-bold text-[#596058] uppercase tracking-wider block">
              {currentLanguage === 'hi'
                ? 'त्वरित चयन (या नीचे माइक से बोलें):'
                : currentLanguage === 'te'
                ? 'శీఘ్ర ఎంపికలు (లేదా కింద మాట్లాడండి):'
                : 'Quick options (or speak / type your answer below):'}
            </span>
            <div className="flex flex-wrap gap-2.5">
              {activeQuestion.suggestions.map((item, idx) => {
                const displayText = item[langKey] || item.en;
                let isSelected = false;
                if (currentStep === 1) isSelected = answer1Complaint === displayText;
                if (currentStep === 2) isSelected = answer2Duration === displayText;
                if (currentStep === 3) isSelected = answer3Location === displayText;
                if (currentStep === 4) isSelected = answer4Previous === displayText;
                if (currentStep === 5) isSelected = answer5Medications === displayText;
                if (currentStep === 6) isSelected = answer6Reports === displayText;

                return (
                  <button
                    key={`q-${currentStep}-sugg-${idx}`}
                    type="button"
                    onClick={() => {
                      if (currentStep === 1) setAnswer1Complaint(displayText);
                      if (currentStep === 2) setAnswer2Duration(displayText);
                      if (currentStep === 3) {
                        setAnswer3Location(displayText);
                        setSelectedLocationRegion(item.en);
                      }
                      if (currentStep === 4) setAnswer4Previous(displayText);
                      if (currentStep === 5) setAnswer5Medications(displayText);
                      if (currentStep === 6) setAnswer6Reports(displayText);
                    }}
                    className={`px-4 py-2.5 rounded-[8px] text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#29483C] text-white border-[#29483C] shadow-none'
                        : 'bg-[#E3DDCA] hover:bg-[#C9C5AF] text-[#26312B] border-[#A9AA94] hover:border-[#71866F]'
                    }`}
                  >
                    {displayText}
                  </button>
                );
              })}
            </div>
          </div>

          {/* QUESTION 3 SPECIAL: CLEAN HOSPITAL CATEGORY TILES */}
          {currentStep === 3 && (
            <div className="bg-[#E3DDCA] p-5 rounded-[10px] border border-[#A9AA94] space-y-3 text-left">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#29483C]" />
                <h4 className="text-xs font-bold text-[#29483C] uppercase tracking-wider">
                  {currentLanguage === 'hi'
                    ? 'शरीर का मुख्य भाग चुनें'
                    : currentLanguage === 'te'
                    ? 'శరీర ప్రాంతాన్ని ఎంచుకోండి'
                    : 'Select Body Region (Hospital Category)'}
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'head_neck', en: 'Head & Neck', hi: 'सिर और गर्दन', te: 'తల మరియు మెడ' },
                  { id: 'chest_heart', en: 'Chest & Heart', hi: 'छाती और हृदय', te: 'ఛాతీ మరియు గుండె' },
                  { id: 'abdomen', en: 'Stomach / Abdomen', hi: 'पेट और पाचन', te: 'కడుపు మరియు జీర్ణవ్యవస్థ' },
                  { id: 'back_spine', en: 'Back & Spine', hi: 'कमर और रीढ़', te: 'నడుము మరియు వెన్ను' },
                  { id: 'arms_hands', en: 'Arms & Hands', hi: 'हाथ और कंधे', te: 'చేతులు మరియు భుజాలు' },
                  { id: 'legs_feet', en: 'Legs, Knees & Feet', hi: 'पैर और घुटने', te: 'కాళ్ళు మరియు మోకాళ్ళు' },
                  { id: 'skin', en: 'Skin & Allergy', hi: 'त्वचा / एलर्जी', te: 'చర్మం మరియు అలెర్జీ' },
                  { id: 'general', en: 'Whole Body / General', hi: 'पूरा शरीर / सामान्य', te: 'మొత్తం శరీరం / సాధారణం' },
                ].map((cat) => {
                  const isCatSelected =
                    selectedLocationRegion === cat.en || answer3Location.includes(cat.en) || answer3Location.includes(cat.hi);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedLocationRegion(cat.en);
                        const label = cat[langKey] || cat.en;
                        setAnswer3Location(label);
                      }}
                      className={`p-3.5 rounded-[8px] border text-left cursor-pointer transition-all ${
                        isCatSelected
                          ? 'bg-[#29483C] text-white border-[#29483C] shadow-none'
                          : 'bg-[#E3DDCA] hover:bg-[#C9C5AF] text-[#26312B] border-[#A9AA94] hover:border-[#71866F]'
                      }`}
                    >
                      <div className="font-bold text-sm">{cat[langKey] || cat.en}</div>
                      <div className={`text-[11px] mt-0.5 ${isCatSelected ? 'text-white/80' : 'text-[#596058]'}`}>{cat.en}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUESTION 6 SPECIAL: DEDICATED OCR SCANNER + NO PRESCRIPTION PROMINENT OPTION */}
          {currentStep === 6 && (
            <div className="bg-[#E3DDCA] p-5 rounded-[10px] border border-[#A9AA94] space-y-4 text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#26312B] flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-[#29483C]" />
                    <span>
                      {currentLanguage === 'hi'
                        ? 'पर्चा स्कैन करें या सीधे आगे बढ़ें'
                        : currentLanguage === 'te'
                        ? 'ప్రిస్క్రిప్షన్ స్కాన్ చేయండి లేదా నేరుగా ముందుకు వెళ్ళండి'
                        : 'Prescription & Past Reports (Optional)'}
                    </span>
                  </h4>
                  <p className="text-xs text-[#596058] font-normal">
                    {currentLanguage === 'hi'
                      ? 'यदि आपके पास पुराना पर्चा है तो कैमरा से स्कैन करें। यदि नहीं है, तो नीचे विकल्प चुनें।'
                      : 'Scan prescription with kiosk camera, or tap "No Prescription" to proceed immediately.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsScannerModalOpen(true)}
                    className="px-4 py-2.5 bg-[#29483C] hover:bg-[#254839] active:bg-[#254839] text-white text-xs font-semibold rounded-[8px] flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {currentLanguage === 'hi'
                        ? 'पर्चा स्कैन करें (OCR)'
                        : currentLanguage === 'te'
                        ? 'ప్రిస్క్రిప్షన్ స్కాన్ చేయండి'
                        : 'Scan Prescription (OCR)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNoPrescriptionOption}
                    className="px-4 py-2.5 bg-[#E3DDCA] hover:bg-[#B5B7A1] text-[#29483C] text-xs font-semibold rounded-[8px] flex items-center gap-1.5 border border-[#29483C] cursor-pointer transition-colors"
                  >
                    <FileQuestion className="w-4 h-4 text-[#29483C]" />
                    <span>
                      {currentLanguage === 'hi'
                        ? 'मेरे पास कोई पर्चा नहीं है'
                        : currentLanguage === 'te'
                        ? 'నా వద్ద ప్రిస్క్రిప్షన్ లేదు'
                        : "I Don't Have Any Prescription"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Scanned Documents Preview */}
              {documents.length > 0 && (
                <div className="p-3.5 bg-[#B5B7A1]/60 border border-[#A9AA94] rounded-[8px] space-y-2">
                  <span className="text-xs font-bold text-[#29483C] uppercase tracking-wider">
                    Scanned Documents ({documents.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {documents.map((d) => (
                      <div
                        key={d.id}
                        className="px-3 py-1.5 bg-[#E3DDCA] border border-[#A9AA94] rounded-[6px] text-xs font-semibold text-[#26312B] flex items-center gap-2 shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#29483C]" />
                        <span>{d.name}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#71866F]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAIN ANSWER FIELD: VOICE-TO-TEXT + TYPING INPUT */}
          <div className="bg-[#E3DDCA] p-5 rounded-[10px] border border-[#A9AA94] text-left">
            <label className="text-xs font-bold text-[#29483C] uppercase tracking-wider block mb-2">
              {currentLanguage === 'hi'
                ? 'आपका उत्तर (माइक से बोलें या टाइप करें):'
                : currentLanguage === 'te'
                ? 'మీ సమాధానం (మాట్లాడండి లేదా టైప్ చేయండి):'
                : 'Your Answer (Speak using microphone or type):'}
            </label>

            <VoiceToTextInput
              value={
                currentStep === 1
                  ? answer1Complaint
                  : currentStep === 2
                  ? answer2Duration
                  : currentStep === 3
                  ? answer3Location
                  : currentStep === 4
                  ? answer4Previous
                  : currentStep === 5
                  ? answer5Medications
                  : answer6Reports
              }
              onChange={(val) => {
                if (currentStep === 1) setAnswer1Complaint(val);
                if (currentStep === 2) setAnswer2Duration(val);
                if (currentStep === 3) setAnswer3Location(val);
                if (currentStep === 4) setAnswer4Previous(val);
                if (currentStep === 5) setAnswer5Medications(val);
                if (currentStep === 6) setAnswer6Reports(val);
              }}
              placeholder={
                currentStep === 1
                  ? 'Describe your symptom (e.g. fever for 2 days, stomach pain)...'
                  : currentStep === 2
                  ? 'e.g. 3 days, since yesterday morning, 2 weeks...'
                  : currentStep === 3
                  ? 'e.g. upper right abdomen, back of neck, right knee...'
                  : currentStep === 4
                  ? 'e.g. first time, had it once last month, chronic...'
                  : currentStep === 5
                  ? 'e.g. took Paracetamol 650mg, no medicines, antacid...'
                  : 'Mention any previous report details or scan above...'
              }
              selectedVoiceLang={voiceLang}
              onVoiceLangChange={(newLang) => setVoiceLang(newLang)}
              rows={3}
            />
          </div>

          {/* Bottom Action Controls: Back & Next Question */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-6 py-3 bg-[#E3DDCA] hover:bg-[#B5B7A1] text-[#26312B] border border-[#A9AA94] text-sm font-semibold rounded-[8px] flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#29483C]" />
              <span>
                {currentLanguage === 'hi' ? 'पिछला' : currentLanguage === 'te' ? 'మునుపటి' : 'Previous'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className="px-8 py-3.5 bg-[#29483C] hover:bg-[#254839] active:bg-[#254839] text-white text-base font-semibold rounded-[8px] shadow-[0_6px_16px_rgba(41,72,60,0.15)] flex items-center gap-2.5 cursor-pointer transition-all"
            >
              <span>
                {currentStep === 6
                  ? currentLanguage === 'hi'
                    ? 'विभाग आवंटन देखें'
                    : currentLanguage === 'te'
                    ? 'విభాగ కేటాయింపు చూడండి'
                    : 'View Department Routing'
                  : currentLanguage === 'hi'
                  ? 'अगला प्रश्न'
                  : currentLanguage === 'te'
                  ? 'తదుపరి ప్రశ్న'
                  : 'Next Question'}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 7: CLINICAL DEPARTMENT ASSIGNMENT & PATIENT HISTORY SUMMARY */}
      {!isAnalyzing && currentStep === 7 && (
        <motion.div
          key="step-7-summary"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 text-left"
        >
          {/* Top Result Banner */}
          <div className="bg-[#E3DDCA] p-6 rounded-[10px] border border-[#A9AA94] space-y-4">
            <div className="flex items-center gap-2 text-[#29483C] text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-5 h-5 text-[#29483C]" />
              <span>
                {currentLanguage === 'hi'
                  ? 'क्लिनिकल इनटेक पूरा हुआ'
                  : currentLanguage === 'te'
                  ? 'క్లినికల్ ఇన్టేక్ పూర్తయింది'
                  : 'Clinical Intake Complete'}
              </span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#26312B]">
              {currentLanguage === 'hi'
                ? 'उपयुक्त विभाग आवंटित'
                : currentLanguage === 'te'
                ? 'తగిన విభాగం కేటాయించబడింది'
                : 'Assigned Hospital Department'}
            </h3>

            {/* Department Card */}
            <div className="p-5 rounded-[10px] bg-[#B5B7A1]/60 border border-[#A9AA94] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#596058] uppercase tracking-wider block">
                  OPD Department / विभाग:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h4 className="font-serif text-2xl font-normal text-[#29483C]">
                    {deptInfo.name[currentLanguage] || deptInfo.name.en}
                  </h4>
                  <SymptomConfidenceIndicator
                    confidenceLevel={evaluatedRouting.confidenceLevel}
                    confidenceScore={evaluatedRouting.confidenceScore}
                    confidenceRationale={evaluatedRouting.confidenceRationale}
                    confidenceFactors={evaluatedRouting.confidenceFactors}
                    extractedHistory={{
                      chiefComplaint: answer1Complaint,
                      duration: answer2Duration,
                      location: answer3Location,
                      previousOccurrence: answer4Previous,
                      pastMedicalHistory,
                      currentMedications: currentMedsList,
                      familyHistory,
                    }}
                    departmentName={deptInfo.name[currentLanguage] || deptInfo.name.en}
                    departmentBranch={evaluatedRouting.branch}
                    currentLanguage={currentLanguage}
                    size="md"
                  />
                </div>
                <p className="text-xs font-bold text-[#71866F]">
                  Branch: {evaluatedRouting.branch.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-[#596058] mt-1 font-normal max-w-lg">
                  {evaluatedRouting.rationale}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="px-3.5 py-1.5 bg-[#29483C] text-white text-xs font-semibold rounded-[6px] shadow-2xs">
                  {patient.opdTrack === 'ayush' ? 'AYUSH OPD' : 'Standard OPD'}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Dynamic Patient History Summary Card */}
          <PatientHistorySummaryCard
            currentLanguage={currentLanguage}
            historyData={{
              pastMedicalHistory,
              familyHistory,
              currentMedications: currentMedsList,
              previousOccurrence: answer4Previous,
            }}
            onChange={(updated: PatientHistoryData) => {
              setPastMedicalHistory(updated.pastMedicalHistory);
              setFamilyHistory(updated.familyHistory);
              if (updated.currentMedications) {
                setCurrentMedsList(updated.currentMedications);
              }
            }}
            allowEdit={true}
            interactiveVerify={true}
          />

          {/* Quick Summary of 6 Answers */}
          <div className="bg-[#E3DDCA] p-5 rounded-[10px] border border-[#A9AA94] space-y-3">
            <h4 className="text-xs font-bold text-[#29483C] uppercase tracking-wider">
              {currentLanguage === 'hi'
                ? 'दर्ज किए गए उत्तरों का संक्षिप्त विवरण:'
                : currentLanguage === 'te'
                ? 'రికార్డ్ చేయబడిన సమాధానాల సారాంశం:'
                : 'Summary of Captured Clinical History:'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#B5B7A1]/60 rounded-[8px] border border-[#A9AA94]">
                <span className="text-[#596058] font-semibold block mb-0.5">1. Chief Complaint:</span>
                <span className="font-bold text-[#26312B]">{answer1Complaint || 'General complaint'}</span>
              </div>
              <div className="p-3.5 bg-[#B5B7A1]/60 rounded-[8px] border border-[#A9AA94]">
                <span className="text-[#596058] font-semibold block mb-0.5">2. Duration:</span>
                <span className="font-bold text-[#26312B]">{answer2Duration || '1 to 3 days'}</span>
              </div>
              <div className="p-3.5 bg-[#B5B7A1]/60 rounded-[8px] border border-[#A9AA94]">
                <span className="text-[#596058] font-semibold block mb-0.5">3. Location:</span>
                <span className="font-bold text-[#26312B]">{answer3Location || 'General'}</span>
              </div>
              {severityRating && (
                <div className="p-3.5 bg-[#B5B7A1] rounded-[8px] border border-[#A9AA94]">
                  <span className="text-[#29483C] font-semibold block mb-0.5">Severity Rating:</span>
                  <span className="font-bold text-[#29483C]">
                    {severityRating.severity} / {severityRating.severityScale === '0-4' ? 4 : 10} — {severityRating.severityLabel}
                  </span>
                </div>
              )}
              <div className="p-3.5 bg-[#B5B7A1]/60 rounded-[8px] border border-[#A9AA94]">
                <span className="text-[#596058] font-semibold block mb-0.5">4. Previous Occurrence:</span>
                <span className="font-bold text-[#26312B]">{answer4Previous || 'First time'}</span>
              </div>
              <div className="p-3.5 bg-[#B5B7A1]/60 rounded-[8px] border border-[#A9AA94]">
                <span className="text-[#596058] font-semibold block mb-0.5">5. Medicines Taken:</span>
                <span className="font-bold text-[#26312B]">{answer5Medications || 'None'}</span>
              </div>
              <div className="p-3.5 bg-[#B5B7A1]/60 rounded-[8px] border border-[#A9AA94]">
                <span className="text-[#596058] font-semibold block mb-0.5">6. Reports / Prescriptions:</span>
                <span className="font-bold text-[#26312B]">
                  {documents.length > 0
                    ? `${documents.length} document(s) scanned`
                    : hasNoPrescription
                    ? 'No prescription (Proceeded directly)'
                    : answer6Reports || 'No records provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Edit Questions / Final Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#E3DDCA] hover:bg-[#B5B7A1] text-[#26312B] border border-[#A9AA94] text-sm font-semibold rounded-[8px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <RotateCcw className="w-4 h-4 text-[#29483C]" />
              <span>
                {currentLanguage === 'hi' ? 'उत्तरों में सुधार करें' : currentLanguage === 'te' ? 'సవరించండి' : 'Edit Answers'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              className="w-full sm:w-auto px-8 py-4 bg-[#29483C] hover:bg-[#254839] active:bg-[#254839] text-white text-base font-semibold rounded-[8px] shadow-[0_6px_16px_rgba(41,72,60,0.15)] flex items-center justify-center gap-3 cursor-pointer transition-all"
            >
              <span>
                {currentLanguage === 'hi'
                  ? 'केस सारांश की समीक्षा करें'
                  : currentLanguage === 'te'
                  ? 'కేస్ సారాంశాన్ని సమీక్షించండి'
                  : 'Review Case Summary & Token'}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* DEDICATED OCR CAMERA & DOCUMENT SCANNER MODAL */}
      <PrescriptionScannerModal
        isOpen={isScannerModalOpen}
        currentLanguage={currentLanguage}
        onClose={() => setIsScannerModalOpen(false)}
        onConfirmDocument={(doc, meds, diagnoses) => {
          setDocuments((prev) => [...prev, doc]);
          if (meds.length > 0) {
            setCurrentMedsList((prev) => Array.from(new Set([...prev, ...meds])));
          }
          if (diagnoses.length > 0) {
            setPastMedicalHistory((prev) => Array.from(new Set([...prev, ...diagnoses])));
          }
        }}
        onNoPrescription={() => {
          setHasNoPrescription(true);
          setIsScannerModalOpen(false);
          setAnswer6Reports('No past prescription or medical documents');
          setCurrentStep(7);
        }}
        audioEnabled={audioEnabled}
      />
    </div>
  );
};
