import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  Mic,
  MicOff,
  Leaf,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  Compass,
  FileCheck2,
  Loader2,
  ShieldAlert,
  Send,
  Edit3,
  MapPin,
  Clock,
  Gauge,
  Activity,
  Check,
  Layers,
  ChevronRight,
  Upload,
  FileText,
  Boxes,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LanguageCode,
  SymptomTriageResponse,
  DepartmentCode,
  AnatomicalLocationSelection,
} from '../../types';
import { speakPrompt, stopSpeech } from '../../utils/speechHelper';
import { SpeechAudioEngine, SpeechEngineResult } from '../../utils/audioSpeechEngine';
import {
  DEPARTMENTS_DATA,
  SYMPTOM_UI_TEXT,
  DepartmentInfo,
  getDeptInfoByCode,
  getDeptInfoByLegacyId,
} from '../../data/symptomRoutingData';
import {
  MAJOR_ANATOMICAL_REGIONS,
  ANATOMICAL_LOCALIZATION_DATA,
  getSuggestedBranchesForDepartment,
  getAnatomicalLocationQuickSymptoms,
  getControlledBranchInfo,
} from '../../data/anatomicalData';
import {
  apiTriageDepartment,
  apiInterpretComplaint,
  apiAnalyzeDocumentOcr,
} from '../../lib/api';
import { GeminiProcessingIndicator } from './GeminiProcessingIndicator';
import { SymptomConfidenceIndicator, SymptomConfidenceGauge } from './SymptomConfidenceIndicator';
import { AdaptiveRatingScale, getClinicalScaleConfig } from './AdaptiveRatingScale';
import { ClinicalSeverityRating } from '../../types';

interface KioskDepartmentProps {
  currentLanguage: LanguageCode;
  selectedDepartment: string;
  patient?: any;
  initialComplaint?: string;
  onSelectDepartment: (dept: string, triageData?: SymptomTriageResponse) => void;
  onNext?: () => void;
  onBack: () => void;
  audioEnabled: boolean;
  onTriggerRedFlag?: (symptom: string) => void;
}

type FlowView =
  | 'anatomy' // Step 1: Guided Anatomical Body Navigation
  | 'symptom_inquiry' // Step 2: What are you experiencing at this location?
  | 'review_speech' // Step 2b: Verify spoken narration before AI routing
  | 'severity_rating' // Step 2c: Adaptive disease/symptom severity scale
  | 'analyzing' // Step 3: AI Clinical reasoning & Red-flag screening
  | 'follow_up' // Step 4: Targeted clarifying question (if needed)
  | 'red_flag' // Step 5a: Emergency red flag alert
  | 'result' // Step 5b: Suggested Department + Clinical Branch result
  | 'manual'; // Fallback: Manual 6-department browser

interface ConversationTurn {
  role: 'patient' | 'ai';
  content: string;
}

export const KioskDepartment: React.FC<KioskDepartmentProps> = ({
  currentLanguage,
  selectedDepartment,
  patient,
  initialComplaint = '',
  onSelectDepartment,
  onBack,
  audioEnabled,
  onTriggerRedFlag,
}) => {
  // Localization text dictionary
  const ui = SYMPTOM_UI_TEXT[currentLanguage] || SYMPTOM_UI_TEXT.en;

  // Primary State Machine
  const [view, setView] = useState<FlowView>('anatomy');
  const [selectedLocation, setSelectedLocation] = useState<AnatomicalLocationSelection | null>(null);

  // Top "What is bothering you today?" Narration
  const [complaintInput, setComplaintInput] = useState<string>(initialComplaint || '');
  const [isInterpreting, setIsInterpreting] = useState<boolean>(false);
  const [detectedFeedback, setDetectedFeedback] = useState<string | null>(null);

  // Clinical Inquiry States
  const [primarySymptom, setPrimarySymptom] = useState<string>('');
  const [customNarrative, setCustomNarrative] = useState<string>(initialComplaint);
  const [duration, setDuration] = useState<string>('1-3 days');
  const [onset, setOnset] = useState<'gradual' | 'sudden'>('gradual');
  const [severity, setSeverity] = useState<string>('Moderate (4-6)');
  const [selectedAssociatedSymptoms, setSelectedAssociatedSymptoms] = useState<string[]>([]);

  // Additional Clinical Dimensions (Sections 11-16)
  const [previousOccurrence, setPreviousOccurrence] = useState<'no' | 'yes' | 'not_sure'>('no');
  const [previousOccurrenceDetails, setPreviousOccurrenceDetails] = useState<string>('');
  const [pastMedicalHistory, setPastMedicalHistory] = useState<string[]>([]);
  const [currentMedications, setCurrentMedications] = useState<string>('');
  const [familyHistory, setFamilyHistory] = useState<'no' | 'yes' | 'not_sure'>('no');
  const [familyHistoryRelation, setFamilyHistoryRelation] = useState<string>('');
  const [familyHistoryCondition, setFamilyHistoryCondition] = useState<string>('');

  // OCR Document Extraction
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState<boolean>(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [extractedMedicationCard, setExtractedMedicationCard] = useState<{
    name: string;
    dosage?: string;
    confirmed: boolean;
  } | null>(null);

  // Speech Recognition States
  const [inputMode, setInputMode] = useState<'voice' | 'touch'>('touch');
  const [interimSpeech, setInterimSpeech] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  // AI & Routing States
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [turnCount, setTurnCount] = useState<number>(1);
  const [followUpAnswer, setFollowUpAnswer] = useState<string>('');
  const [triageResult, setTriageResult] = useState<SymptomTriageResponse | null>(null);
  const [emergencyAlertSent, setEmergencyAlertSent] = useState<boolean>(false);
  const [documentedSeverityRating, setDocumentedSeverityRating] = useState<ClinicalSeverityRating | null>(null);

  // Manual Selection Highlight
  const [highlightedDept, setHighlightedDept] = useState<string>(
    selectedDepartment || 'Kayachikitsa'
  );

  // Audio Engine Ref
  const audioEngineRef = useRef<SpeechAudioEngine | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Spoken prompt helper
  useEffect(() => {
    if (audioEnabled) {
      if (view === 'anatomy') {
        const promptText =
          currentLanguage === 'hi'
            ? 'आज आपको क्या समस्या हो रही है? आप बोल सकते हैं, टाइप कर सकते हैं, या 3D शरीर मॉडल में उस स्थान को छू सकते हैं।'
            : 'What is bothering you today? You can speak, type, or tap the area on the 3D body model.';
        speakPrompt(promptText, currentLanguage);
      } else if (view === 'symptom_inquiry' && selectedLocation) {
        const promptText =
          currentLanguage === 'hi'
            ? `${selectedLocation.bodyRegionLabel || 'इस भाग में'} आप क्या महसूस कर रहे हैं? लक्षण चुनें या बोलकर बताएं।`
            : `What are you experiencing in this area? Select your symptoms or speak to narrate.`;
        speakPrompt(promptText, currentLanguage);
      }
    }
    return () => {
      stopSpeech();
    };
  }, [audioEnabled, currentLanguage, view, selectedLocation?.bodyRegionLabel]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start Voice Capture
  const handleStartRecording = async (targetField: 'top_complaint' | 'narrative' = 'narrative') => {
    stopSpeech();
    setInterimSpeech('');

    if (!audioEngineRef.current) {
      audioEngineRef.current = new SpeechAudioEngine({
        onInterimText: (txt) => {
          setInterimSpeech(txt);
        },
        onFinalText: (txt) => {
          if (targetField === 'top_complaint') {
            setComplaintInput((prev) => (prev ? `${prev} ${txt}` : txt));
            handleInterpretNaturalComplaint(txt);
          } else {
            setCustomNarrative((prev) => (prev ? `${prev} ${txt}` : txt));
          }
          setInterimSpeech('');
        },
        onVolumeChange: (vol) => {
          setVolumeLevel(vol);
        },
        onError: (err) => {
          console.warn('Speech engine notification:', err);
          setIsRecording(false);
        },
      });
    }

    try {
      await audioEngineRef.current.startListening(currentLanguage);
      setIsRecording(true);
    } catch (e) {
      console.warn('Microphone activation notice:', e);
      setIsRecording(false);
    }
  };

  // Stop Voice Capture
  const handleStopRecording = async (targetField: 'top_complaint' | 'narrative' = 'narrative') => {
    if (audioEngineRef.current) {
      try {
        const res: SpeechEngineResult = await audioEngineRef.current.stopListening();
        setIsRecording(false);
        if (res.transcript && res.transcript.trim()) {
          if (targetField === 'top_complaint') {
            setComplaintInput(res.transcript.trim());
            handleInterpretNaturalComplaint(res.transcript.trim());
          } else {
            setCustomNarrative(res.transcript.trim());
            setView('review_speech');
          }
        }
      } catch (err) {
        setIsRecording(false);
      }
    }
  };

  // Interpret natural language complaint via Gemini
  const handleInterpretNaturalComplaint = async (text: string) => {
    if (!text.trim()) return;
    setIsInterpreting(true);
    setDetectedFeedback(null);

    try {
      const res = await apiInterpretComplaint(text.trim(), currentLanguage);
      if (res && res.detectedRegion) {
        const regionLabel = res.detectedSubRegion || res.detectedRegion;
        const selection: AnatomicalLocationSelection = {
          bodyRegion: res.detectedRegion,
          subRegion: res.detectedSubRegion,
          side: res.detectedSide || 'midline',
          specificLocation: res.detectedSubRegion || res.detectedRegion,
          bodyRegionLabel: regionLabel,
          specificLocationLabel: regionLabel,
          anatomicalPath: [
            'Body',
            res.detectedRegion,
            ...(res.detectedSubRegion ? [res.detectedSubRegion] : []),
          ],
        };
        setSelectedLocation(selection);
        if (res.primarySymptom) {
          setPrimarySymptom(res.primarySymptom);
        }
        setCustomNarrative(res.chiefComplaint || text);
        setDetectedFeedback(
          currentLanguage === 'hi'
            ? `चिह्नित: ${regionLabel} (${res.detectedSide || ''})`
            : `Detected: ${regionLabel} (${res.detectedSide || ''})`
        );

        if (res.isUrgent && onTriggerRedFlag) {
          onTriggerRedFlag(res.urgentReason || 'Emergency warning detected');
        }
      }
    } catch (err) {
      console.warn('Complaint interpretation:', err);
    } finally {
      setIsInterpreting(false);
    }
  };

  // Handle location chosen on anatomical 3D viewer or 2D diagram
  const handleSelectAnatomicalLocation = (loc: AnatomicalLocationSelection) => {
    setSelectedLocation(loc);
    const quickSymptoms = getAnatomicalLocationQuickSymptoms(loc.bodyRegion, loc.subRegion);
    if (quickSymptoms.length > 0 && !primarySymptom) {
      setPrimarySymptom(quickSymptoms[0]);
    }
  };

  // Confirm location and proceed to clinical questioning
  const handleConfirmLocationAndProceed = (loc: AnatomicalLocationSelection) => {
    setSelectedLocation(loc);
    const quickSymptoms = getAnatomicalLocationQuickSymptoms(loc.bodyRegion, loc.subRegion);
    if (quickSymptoms.length > 0 && !primarySymptom) {
      setPrimarySymptom(quickSymptoms[0]);
    }
    setView('symptom_inquiry');
  };

  // OCR Document Upload Handler
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedDocName(file.name);
    setIsAnalyzingDoc(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const result = await apiAnalyzeDocumentOcr({
            imageBase64: base64Data,
            mimeType: file.type || 'image/jpeg',
            language: currentLanguage,
          });

          if (result?.data?.extractedMedications && result.data.extractedMedications.length > 0) {
            const med = result.data.extractedMedications[0];
            const medName = `${med.name} ${med.dosage || ''}`.trim();
            setExtractedMedicationCard({
              name: medName,
              dosage: med.dosage,
              confirmed: false,
            });
            setCurrentMedications((prev) => (prev ? `${prev}, ${medName}` : medName));
          }
        } catch (ocrErr) {
          console.warn('OCR error:', ocrErr);
        } finally {
          setIsAnalyzingDoc(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('File read error:', err);
      setIsAnalyzingDoc(false);
    }
  };

  // Handle confirmed rating from AdaptiveRatingScale
  const handleRatingConfirmed = (rating: ClinicalSeverityRating) => {
    setDocumentedSeverityRating(rating);
    setSeverity(rating.severityLabel);
    handleSubmitClinicalIntake(undefined, undefined, true, rating);
  };

  // Submit combined clinical context to AI Routing Engine
  const handleSubmitClinicalIntake = async (
    overrideComplaint?: string,
    historyOverride?: ConversationTurn[],
    skipRatingCheck: boolean = false,
    directRating?: ClinicalSeverityRating
  ) => {
    stopSpeech();

    const effectiveComplaint =
      overrideComplaint ||
      customNarrative ||
      complaintInput ||
      [primarySymptom, selectedLocation?.anatomicalPath?.join(' - ')].filter(Boolean).join(' in ');

    const locationStr =
      selectedLocation?.anatomicalPath?.join(' - ') ||
      selectedLocation?.bodyRegionLabel ||
      selectedLocation?.bodyRegion ||
      '';

    // If clinically rateable and not yet rated, show severity rating scale
    const activeRating = directRating || documentedSeverityRating;
    if (!skipRatingCheck && !activeRating) {
      const scaleConfig = getClinicalScaleConfig(effectiveComplaint, locationStr);
      if (scaleConfig.isRateable) {
        setView('severity_rating');
        return;
      }
    }

    setView('analyzing');

    const updatedHistory: ConversationTurn[] = historyOverride || [
      ...conversation,
      {
        role: 'patient',
        content: `Location: ${selectedLocation?.anatomicalPath?.join(' > ') || 'General'}. Symptoms: ${primarySymptom}. Duration: ${duration}. Onset: ${onset}. Severity: ${activeRating ? `${activeRating.severity}/${activeRating.severityScale === '0-4' ? 4 : 10} (${activeRating.severityLabel})` : severity}. Previous Occurrence: ${previousOccurrence}. Past History: ${pastMedicalHistory.join(', ') || 'None'}. Current Medications: ${currentMedications || 'None'}. Family History: ${familyHistory}. Details: ${effectiveComplaint}`,
      },
    ];
    setConversation(updatedHistory);

    try {
      const { data } = await apiTriageDepartment({
        complaint: effectiveComplaint,
        conversation: updatedHistory,
        language: currentLanguage,
        patientAge: patient?.age,
        patientGender: patient?.gender,
        turnCount,
        bodyRegion: selectedLocation?.bodyRegion,
        subRegion: selectedLocation?.subRegion,
        side: selectedLocation?.side,
        specificLocation: selectedLocation?.specificLocation,
        anatomicalPath: selectedLocation?.anatomicalPath,
        symptom: primarySymptom,
        duration,
        severity: activeRating ? activeRating.severityLabel : severity,
        associatedSymptoms: selectedAssociatedSymptoms,
      });

      const responseData: SymptomTriageResponse = data;
      if (activeRating) {
        responseData.severityRating = activeRating;
      }
      setTriageResult(responseData);

      // Check Red-Flag Status First
      if (
        responseData.status === 'urgent' ||
        responseData.nextAction === 'urgent_attention' ||
        responseData.redFlagsDetected ||
        responseData.needsUrgentAttention
      ) {
        setView('red_flag');
        if (onTriggerRedFlag) {
          onTriggerRedFlag(responseData.redFlagReason || responseData.chiefComplaint);
        }
        if (audioEnabled) {
          speakPrompt(
            `${ui.urgentAlertTitle} ${ui.urgentAlertInstruction}`,
            currentLanguage
          );
        }
        return;
      }

      // Check if more information is requested by Gemini (and turnCount < 3)
      if (
        (responseData.nextAction === 'ask_question' || (!responseData.isComplete && responseData.followUpQuestion)) &&
        turnCount < 3
      ) {
        setView('follow_up');
        setTurnCount((prev) => prev + 1);
        if (audioEnabled && responseData.followUpQuestion) {
          const qText =
            responseData.followUpQuestion.questionTextLocalized ||
            responseData.followUpQuestion.questionText;
          speakPrompt(qText, currentLanguage);
        }
        return;
      }

      // Conclude with Suggested Department & Branch
      setView('result');
      if (audioEnabled) {
        const deptInfo = getDeptInfoByCode(responseData.suggestedDepartment);
        const deptName = deptInfo.name[currentLanguage] || deptInfo.name.en;
        speakPrompt(
          `${ui.suggestedHeading}: ${deptName}. ${responseData.reason}`,
          currentLanguage
        );
      }
    } catch (err) {
      console.info('Clinical triage service using local routing fallback');
      const fallbackResult: SymptomTriageResponse = {
        chiefComplaint: effectiveComplaint,
        symptoms: [primarySymptom || effectiveComplaint],
        duration,
        severity,
        associatedSymptoms: selectedAssociatedSymptoms,
        redFlagsDetected: false,
        redFlagReason: null,
        needsUrgentAttention: false,
        urgentCareInstruction: null,
        suggestedDepartment: 'GENERAL_OPD',
        suggestedBranch: 'Primary Health Assessment & Clinical Triage',
        routingConfidence: 'moderate',
        reason:
          'Your symptoms and anatomical selection suggest that an initial comprehensive clinical evaluation will guide you to the right care pathway.',
        needsDoctorAssessment: true,
        isComplete: true,
        followUpQuestion: null,
        anatomicalLocation: selectedLocation || undefined,
      };
      setTriageResult(fallbackResult);
      setView('result');
    }
  };

  // Submit Answer to Follow-Up Question
  const handleAnswerFollowUp = (answer: string) => {
    if (!answer.trim()) return;
    const currentQ = triageResult?.followUpQuestion;
    const qText =
      currentQ?.questionTextLocalized || currentQ?.questionText || 'Follow-up question';

    const newHistory: ConversationTurn[] = [
      ...conversation,
      { role: 'ai', content: qText },
      { role: 'patient', content: answer.trim() },
    ];
    setFollowUpAnswer('');
    handleSubmitClinicalIntake(answer.trim(), newHistory);
  };

  // Confirm Final Department & Clinical Branch
  const handleConfirmDepartment = (departmentCodeOrLegacy: string) => {
    stopSpeech();
    const deptInfo =
      getDeptInfoByCode(departmentCodeOrLegacy) ||
      getDeptInfoByLegacyId(departmentCodeOrLegacy);

    if (triageResult && documentedSeverityRating) {
      triageResult.severityRating = documentedSeverityRating;
    }

    // Call onSelectDepartment with legacy ID and rich clinical intake details
    onSelectDepartment(deptInfo.legacyId, triageResult || undefined);
  };

  // Handle Red-Flag Emergency Notification
  const handleAlertEmergency = () => {
    setEmergencyAlertSent(true);
    if (onTriggerRedFlag && triageResult) {
      onTriggerRedFlag(triageResult.redFlagReason || 'Emergency clinical red flag');
    }
  };

  // Toggle Associated Symptom Chip
  const toggleAssociatedSymptom = (sym: string) => {
    setSelectedAssociatedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  // Toggle Past Medical History Item
  const togglePastHistory = (item: string) => {
    setPastMedicalHistory((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Dynamic quick symptoms based on chosen anatomical location
  const quickSymptomsForLocation = selectedLocation
    ? getAnatomicalLocationQuickSymptoms(selectedLocation.bodyRegion, selectedLocation.subRegion)
    : [
        'Pain / Ache',
        'Swelling',
        'Burning sensation',
        'Stiffness',
        'Weakness',
        'Recent Injury / Fall',
        'Numbness / Tingling',
        'Itching / Rash',
      ];

  const durationOptions = [
    { id: '<24h', labelEn: '< 24 Hours', labelHi: '24 घंटे से कम' },
    { id: '1-3d', labelEn: '1-3 Days', labelHi: '1-3 दिन' },
    { id: '1-2w', labelEn: '1-2 Weeks', labelHi: '1-2 हफ्ते' },
    { id: '>1m', labelEn: '> 1 Month', labelHi: '1 महीने से अधिक' },
    { id: 'chronic', labelEn: 'Chronic / Years', labelHi: 'पुराना (महीनों या सालों से)' },
  ];

  const severityOptions = [
    {
      id: 'mild',
      labelEn: 'Mild (1-3)',
      labelHi: 'हल्का (1-3)',
      color: 'bg-[#B5B7A1] border-[#29483C] text-[#29483C]',
    },
    {
      id: 'moderate',
      labelEn: 'Moderate (4-6)',
      labelHi: 'मध्यम (4-6)',
      color: 'bg-[#A9AA94] border-[#29483C] text-[#29483C]',
    },
    {
      id: 'severe',
      labelEn: 'Severe (7-10)',
      labelHi: 'गंभीर (7-10)',
      color: 'bg-[#C9C5AF] border-[#29483C] text-[#29483C]',
    },
  ];

  const commonAssociatedSymptoms = [
    { en: 'Fever / Chills', hi: 'बुखार / कंपकंपी' },
    { en: 'Nausea / Vomiting', hi: 'जी मिचलाना / उल्टी' },
    { en: 'Headache', hi: 'सिरदर्द' },
    { en: 'Weakness / Fatigue', hi: 'कमजोरी / थकान' },
    { en: 'Loss of Appetite', hi: 'भूख न लगना' },
    { en: 'Difficulty Sleeping', hi: 'नींद न आना' },
    { en: 'Redness / Warmth', hi: 'लालिमा / गर्माहट' },
    { en: 'Stiffness after waking', hi: 'सुबह सोकर उठने पर जकड़न' },
  ];

  const pastHistoryOptions = [
    { id: 'diabetes', en: 'Diabetes / Blood Sugar', hi: 'मधुमेह (शुगर)' },
    { id: 'hypertension', en: 'High Blood Pressure', hi: 'उच्च रक्तचाप (बीपी)' },
    { id: 'asthma', en: 'Asthma / Respiratory', hi: 'अस्थमा / दमा' },
    { id: 'thyroid', en: 'Thyroid Disorder', hi: 'थायरॉइड' },
    { id: 'surgery', en: 'Past Surgery / Operation', hi: 'पिछली सर्जरी / ऑपरेशन' },
    { id: 'heart', en: 'Cardiac / Heart History', hi: 'हृदय रोग इतिहास' },
  ];

  return (
    <div
      id="kiosk-anatomical-intake-container"
      className="max-w-5xl mx-auto px-4 py-3 sm:py-6 text-[#29483C]"
    >
      {/* Top Header Bar with Navigation & Spoken Assistance */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#A9AA94]">
        <button
          id="btn-back-anatomical-flow"
          onClick={() => {
            stopSpeech();
            if (view === 'symptom_inquiry') {
              setView('anatomy');
            } else if (view === 'review_speech') {
              setView('symptom_inquiry');
            } else if (view === 'severity_rating') {
              setView('symptom_inquiry');
            } else if (view === 'manual' || view === 'result') {
              setView('anatomy');
            } else if (view === 'follow_up') {
              setView('symptom_inquiry');
            } else {
              onBack();
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[#29483C] hover:text-[#29483C] bg-[#E3DDCA] hover:bg-[#A9AA94]/30 border border-[#A9AA94] rounded-xl transition shadow-xs cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 text-[#29483C]" />
          <span>
            {view === 'anatomy'
              ? currentLanguage === 'hi'
                ? 'पीछे'
                : 'Back'
              : currentLanguage === 'hi'
              ? 'स्थान बदलें'
              : 'Change Location'}
          </span>
        </button>

        {/* Current Flow Step Indicator Badge */}
        <div className="hidden sm:flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              view === 'anatomy'
                ? 'bg-[#29483C] text-white shadow-xs'
                : 'bg-[#C9C5AF] text-[#29483C] border border-[#A9AA94]'
            }`}
          >
            1. {currentLanguage === 'hi' ? 'शारीरिक स्थान' : 'Body Location'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#29483C]" />
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              view === 'symptom_inquiry' || view === 'review_speech'
                ? 'bg-[#29483C] text-white shadow-xs'
                : 'bg-[#C9C5AF] text-[#29483C] border border-[#A9AA94]'
            }`}
          >
            2. {currentLanguage === 'hi' ? 'क्लिनिकल इनटेक' : 'Clinical Intake'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#29483C]" />
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              view === 'result'
                ? 'bg-[#29483C] text-white shadow-xs'
                : 'bg-[#C9C5AF] text-[#29483C] border border-[#A9AA94]'
            }`}
          >
            3. {currentLanguage === 'hi' ? 'उपयुक्त विभाग' : 'Clinical Routing'}
          </span>
        </div>

        {/* Audio Speaker Helper */}
        {audioEnabled && (
          <button
            id="btn-listen-anatomical-prompt"
            onClick={() => {
              if (view === 'result' && triageResult) {
                const deptInfo = getDeptInfoByCode(triageResult.suggestedDepartment);
                speakPrompt(
                  `${ui.suggestedHeading}: ${deptInfo.name[currentLanguage] || deptInfo.name.en}. ${triageResult.reason}`,
                  currentLanguage
                );
              } else if (view === 'symptom_inquiry' && selectedLocation) {
                speakPrompt(
                  `${selectedLocation.bodyRegionLabel || 'चयनित अंग'}. आप क्या लक्षण महसूस कर रहे हैं?`,
                  currentLanguage
                );
              } else {
                speakPrompt(
                  'आज आपको क्या समस्या हो रही है? बोलें, लिखें या 3D शरीर को छूएं।',
                  currentLanguage
                );
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#29483C] hover:text-[#29483C] bg-[#C9C5AF] hover:bg-[#A9AA94] border border-[#A9AA94] rounded-xl transition cursor-pointer min-h-[44px]"
            title="Read instructions aloud"
          >
            <Volume2 className="w-4 h-4 text-[#29483C]" />
            <span className="hidden md:inline">
              {currentLanguage === 'hi' ? 'निर्देश सुनें' : 'Listen'}
            </span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ========================================================= */}
        {/* STEP 1: GUIDED ANATOMICAL LOCALIZATION SYSTEM */}
        {/* ========================================================= */}
        {view === 'anatomy' && (
          <motion.div
            key="view-anatomy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* FIRST CLINICAL QUESTION (SECTION 4): "WHAT IS BOTHERING YOU TODAY?" */}
            <div className="bg-[#29483C] text-white rounded-[10px] p-5 sm:p-6 border border-[#496354] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B5B7A1] animate-pulse" />
                    <span className="text-xs font-extrabold text-[#B5B7A1] uppercase tracking-wider">
                      {currentLanguage === 'hi'
                        ? 'पहला क्लिनिकल सवाल'
                        : 'First Clinical Question'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {currentLanguage === 'hi'
                      ? 'आज आपको क्या समस्या या तकलीफ हो रही है?'
                      : 'What is bothering you today?'}
                  </h2>
                </div>
              </div>

              {/* Natural Language Voice & Typing Input Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={complaintInput}
                    onChange={(e) => setComplaintInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleInterpretNaturalComplaint(complaintInput);
                      }
                    }}
                    placeholder={
                      currentLanguage === 'hi'
                        ? 'अपनी समस्या बताएं (जैसे: नाक में दर्द व रुकावट, पेट में गैस, घुटने में सूजन)...'
                        : 'Tell us your complaint (e.g., pain in nose, burning in chest, swollen knee)...'
                    }
                    className="w-full px-4 py-3.5 bg-[#E3DDCA] text-[#29483C] border border-[#A9AA94] rounded-[8px] text-sm focus:border-[#29483C] focus:outline-none placeholder-[#29483C]/50 pr-10"
                  />
                  {complaintInput && (
                    <button
                      type="button"
                      onClick={() => handleInterpretNaturalComplaint(complaintInput)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-[#29483C] hover:bg-[#29483C]/90 text-white rounded-xl cursor-pointer"
                      title="Analyze complaint"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={
                    isRecording
                      ? () => handleStopRecording('top_complaint')
                      : () => handleStartRecording('top_complaint')
                  }
                  className={`w-full sm:w-auto px-5 py-3.5 rounded-[8px] font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    isRecording
                      ? 'bg-[#29483C] ring-4 ring-[#B5B7A1] text-white animate-pulse'
                      : 'bg-[#29483C] hover:bg-[#29483C]/90 text-white'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>{ui.recordingStopAction} ({recordingDuration}s)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>{currentLanguage === 'hi' ? 'बोलकर बताएं' : 'Speak'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Complaints Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-2xs font-bold text-[#A9AA94] uppercase tracking-wider mr-1">
                  {currentLanguage === 'hi' ? 'त्वरित उदाहरण:' : 'Quick examples:'}
                </span>
                {[
                  { en: 'Pain in nose & blockage', hi: 'नाक में दर्द व रुकावट' },
                  { en: 'Stomach ache & bloating', hi: 'पेट में दर्द व गैस' },
                  { en: 'Swollen right knee', hi: 'दाहिने घुटने में सूजन' },
                  { en: 'Lower back ache', hi: 'निचली पीठ में दर्द' },
                  { en: 'Eye redness & irritation', hi: 'आंख में लालिमा' },
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setComplaintInput(sample.en);
                      handleInterpretNaturalComplaint(sample.en);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#E3DDCA]/10 hover:bg-[#E3DDCA]/20 border border-[#A9AA94]/30 text-2xs font-semibold text-white transition cursor-pointer"
                  >
                    {currentLanguage === 'hi' ? sample.hi : sample.en}
                  </button>
                ))}
              </div>

              {/* Interpretation Feedback Badge */}
              {isInterpreting && (
                <div className="flex items-center gap-2 text-xs text-[#B5B7A1] font-semibold bg-[#E3DDCA]/10 p-2 rounded-xl border border-[#A9AA94]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'जैमिनी एआई आपकी समस्या को समझकर 3D मॉडल पर केंद्रित कर रहा है...'
                      : 'Gemini AI is analyzing your complaint & focusing the 3D model...'}
                  </span>
                </div>
              )}

              {detectedFeedback && (
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#29483C] bg-[#B5B7A1] px-3 py-2 rounded-xl border border-[#29483C]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#29483C]" />
                    <span>{detectedFeedback}</span>
                  </div>
                  {selectedLocation && (
                    <button
                      type="button"
                      onClick={() => handleConfirmLocationAndProceed(selectedLocation)}
                      className="px-3 py-1 bg-[#29483C] hover:bg-[#29483C]/90 text-white rounded-lg text-2xs font-extrabold cursor-pointer"
                    >
                      {currentLanguage === 'hi' ? 'यह स्थान सही है →' : 'Correct Location →'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* CLEAN HOSPITAL BODY CATEGORIES (NO ANATOMICAL GRAPHICS) */}
            <div className="p-4 bg-[#E3DDCA] rounded-[10px] border border-[#A9AA94] space-y-3">
              <h4 className="text-xs font-bold text-[#29483C] uppercase tracking-wider">
                {currentLanguage === 'hi' ? 'समस्या का क्षेत्र चुनें' : 'Select Clinical Body Region'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'head_neck', label: 'Head & Neck', labelHi: 'सिर और गर्दन' },
                  { id: 'chest_heart', label: 'Chest & Heart', labelHi: 'छाती और हृदय' },
                  { id: 'abdomen', label: 'Abdomen & Digestion', labelHi: 'पेट और पाचन' },
                  { id: 'back_spine', label: 'Back & Spine', labelHi: 'पीठ और रीढ़' },
                  { id: 'arms_hands', label: 'Arms & Hands', labelHi: 'हाथ और बाजू' },
                  { id: 'legs_feet', label: 'Legs & Feet', labelHi: 'पैर और घुटने' },
                  { id: 'skin', label: 'Skin & Surface', labelHi: 'त्वचा और एलर्जी' },
                  { id: 'general', label: 'Whole Body / General', labelHi: 'पूरा शरीर / सामान्य' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      handleSelectAnatomicalLocation({
                        bodyRegion: item.id,
                        bodyRegionLabel: `${item.label} (${item.labelHi})`,
                        anatomicalPath: [item.label],
                      })
                    }
                    className={`p-3 rounded-[8px] text-left text-xs font-bold border transition-all cursor-pointer ${
                      selectedLocation?.bodyRegion === item.id
                        ? 'bg-[#29483C] text-white border-[#29483C] shadow-sm'
                        : 'bg-[#C9C5AF] hover:bg-[#A9AA94]/40 text-[#29483C] border-[#A9AA94]'
                    }`}
                  >
                    <div className="font-extrabold">{item.label}</div>
                    <div className="text-[11px] opacity-80">{item.labelHi}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Manual Switch Link */}
            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => setView('manual')}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#29483C] hover:text-[#29483C] transition underline cursor-pointer p-2"
              >
                <Compass className="w-4 h-4 text-[#29483C]" />
                <span>
                  {currentLanguage === 'hi'
                    ? 'या सभी 6 विभागों की सूची सीधे देखें (Manual Department Selection)'
                    : 'Or browse all hospital OPD departments directly'}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: CLINICAL INTAKE (DURATION, SEVERITY, HISTORY, OCR) */}
        {/* ========================================================= */}
        {view === 'symptom_inquiry' && selectedLocation && (
          <motion.div
            key="view-symptom-inquiry"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Header: Chosen Location Breadcrumb Highlight */}
            <div className="p-4 bg-[#29483C] text-white rounded-[8px] shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-[#E3DDCA]/10 text-[#B5B7A1] rounded-xl border border-white/20">
                  <MapPin className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-xs font-bold text-[#B5B7A1] uppercase tracking-wider">
                    {currentLanguage === 'hi' ? 'चिह्नित शारीरिक स्थान' : 'Pinpointed Location'}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {selectedLocation.anatomicalPath?.join('  →  ') || selectedLocation.bodyRegionLabel}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setView('anatomy')}
                className="px-3 py-1.5 bg-[#E3DDCA]/10 hover:bg-[#E3DDCA]/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {currentLanguage === 'hi' ? 'स्थान बदलें' : 'Change Location'}
              </button>
            </div>

            {/* Main Clinical Card */}
            <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-7 shadow-xs space-y-6">
              {/* Question 1: What is the main symptom? */}
              <div className="space-y-3">
                <label className="text-base sm:text-lg font-bold text-[#29483C] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#29483C]" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'यहाँ आपको मुख्य रूप से क्या समस्या हो रही है?'
                      : 'What are you experiencing at this location?'}
                  </span>
                </label>

                {/* Quick Touch Symptom Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {quickSymptomsForLocation.map((sym, idx) => {
                    const isSelected = primarySymptom === sym;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrimarySymptom(sym)}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-98 min-h-[44px] ${
                          isSelected
                            ? 'bg-[#29483C] text-white border-[#29483C] shadow-xs'
                            : 'bg-[#C9C5AF] text-[#29483C] border-[#A9AA94] hover:bg-[#A9AA94]/30'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        <span>{sym}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Duration Selector & Onset */}
              <div className="space-y-3 pt-4 border-t border-[#A9AA94]/40">
                <div className="flex items-center justify-between">
                  <label className="text-sm sm:text-base font-bold text-[#29483C] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#29483C]" />
                    <span>
                      {currentLanguage === 'hi'
                        ? 'यह समस्या कब से है और कैसे शुरू हुई?'
                        : 'How long have you had this problem & how did it start?'}
                    </span>
                  </label>
                  <div className="flex items-center gap-1 bg-[#C9C5AF] border border-[#A9AA94] p-0.5 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setOnset('gradual')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        onset === 'gradual' ? 'bg-[#29483C] text-white' : 'text-[#29483C]'
                      }`}
                    >
                      {currentLanguage === 'hi' ? 'धीरे-धीरे (Gradual)' : 'Gradual'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnset('sudden')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        onset === 'sudden' ? 'bg-[#29483C] text-white' : 'text-[#29483C]'
                      }`}
                    >
                      {currentLanguage === 'hi' ? 'अचानक (Sudden)' : 'Sudden'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {durationOptions.map((opt) => {
                    const isSelected = duration === opt.labelEn;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDuration(opt.labelEn)}
                        className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer text-center min-h-[44px] ${
                          isSelected
                            ? 'bg-[#29483C] text-white border-[#29483C] shadow-xs'
                            : 'bg-[#C9C5AF] text-[#29483C] border-[#A9AA94] hover:bg-[#A9AA94]/30'
                        }`}
                      >
                        {currentLanguage === 'hi' ? opt.labelHi : opt.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 3: Severity Scale */}
              <div className="space-y-3 pt-4 border-t border-[#A9AA94]/40">
                <label className="text-sm sm:text-base font-bold text-[#29483C] flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[#29483C]" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'तकलीफ की गंभीरता कितनी है? (Severity)'
                      : 'How severe is your discomfort?'}
                  </span>
                </label>

                <div className="grid grid-cols-3 gap-3">
                  {severityOptions.map((opt) => {
                    const isSelected = severity === opt.labelEn;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSeverity(opt.labelEn)}
                        className={`p-3.5 rounded-[8px] border transition cursor-pointer text-center font-bold text-xs sm:text-sm min-h-[48px] ${
                          isSelected
                            ? 'bg-[#29483C] text-white border-[#29483C]'
                            : `${opt.color} hover:border-[#29483C]`
                        }`}
                      >
                        {currentLanguage === 'hi' ? opt.labelHi : opt.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 4: Previous Occurrence (Section 11) */}
              <div className="space-y-3 pt-4 border-t border-[#A9AA94]/40">
                <label className="text-sm sm:text-base font-bold text-[#29483C] flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#29483C]" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'क्या यह समस्या पहले भी कभी हुई है? (Previous Occurrence)'
                      : 'Have you experienced this problem before?'}
                  </span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'no', en: 'No (First time)', hi: 'नहीं (पहली बार)' },
                    { id: 'yes', en: 'Yes (Happened before)', hi: 'हाँ (पहले भी हुआ है)' },
                    { id: 'not_sure', en: 'Not Sure', hi: 'निश्चित नहीं' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreviousOccurrence(item.id as any)}
                      className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer text-center min-h-[44px] ${
                        previousOccurrence === item.id
                          ? 'bg-[#29483C] text-white border-[#29483C] shadow-xs'
                          : 'bg-[#C9C5AF] text-[#29483C] border-[#A9AA94] hover:bg-[#A9AA94]/30'
                      }`}
                    >
                      {currentLanguage === 'hi' ? item.hi : item.en}
                    </button>
                  ))}
                </div>

                {previousOccurrence === 'yes' && (
                  <input
                    type="text"
                    value={previousOccurrenceDetails}
                    onChange={(e) => setPreviousOccurrenceDetails(e.target.value)}
                    placeholder={
                      currentLanguage === 'hi'
                        ? 'कब हुआ था, और तब क्या उपचार मिला था? (वैकल्पिक)'
                        : 'When did it occur and what treatment was given? (Optional)'
                    }
                    className="w-full px-4 py-2.5 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl text-xs text-[#29483C] outline-none"
                  />
                )}
              </div>

              {/* Question 5: Past Medical History & Chronic Conditions (Section 12) */}
              <div className="space-y-3 pt-4 border-t border-[#A9AA94]/40">
                <label className="text-sm sm:text-base font-bold text-[#29483C] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#29483C]" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'पिछला चिकित्सा इतिहास (Previous Medical History)'
                      : 'Any important past medical conditions?'}
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {pastHistoryOptions.map((item) => {
                    const isChecked = pastMedicalHistory.includes(item.en);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => togglePastHistory(item.en)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-2 text-left min-h-[44px] ${
                          isChecked
                            ? 'bg-[#B5B7A1] text-[#29483C] border-[#29483C]'
                            : 'bg-[#C9C5AF] text-[#29483C] border-[#A9AA94] hover:bg-[#A9AA94]/30'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? 'bg-[#29483C] border-[#29483C] text-white'
                              : 'border-[#A9AA94] bg-[#E3DDCA]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span>{currentLanguage === 'hi' ? item.hi : item.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 6: Current Medicines & Prescription Upload (Section 13, 15) */}
              <div className="space-y-3 pt-4 border-t border-[#A9AA94]/40">
                <div className="flex items-center justify-between">
                  <label className="text-sm sm:text-base font-bold text-[#29483C] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#29483C]" />
                    <span>
                      {currentLanguage === 'hi'
                        ? 'वर्तमान दवाइयां या पर्चा (Medicines / Prescription)'
                        : 'Are you taking any current medicines?'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C9C5AF] hover:bg-[#A9AA94] border border-[#A9AA94] text-[#29483C] rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#29483C]" />
                    <span>
                      {currentLanguage === 'hi' ? 'दवा पर्चा अपलोड करें' : 'Upload Prescription'}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                </div>

                <input
                  type="text"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder={
                    currentLanguage === 'hi'
                      ? 'दवाइयों के नाम लिखें (जैसे: Paracetamol, Metformin) या पर्चा अपलोड करें'
                      : 'Type medicine names (e.g., Paracetamol, Metformin) or upload prescription'
                  }
                  className="w-full px-4 py-3 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl text-xs sm:text-sm text-[#29483C] outline-none"
                />

                {isAnalyzingDoc && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#29483C] bg-[#A9AA94]/30 p-2.5 rounded-xl border border-[#A9AA94]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#29483C]" />
                    <span>
                      {currentLanguage === 'hi'
                        ? 'जैमिनी विज़न ओसीआर दस्तावेज़ पढ़ रहा है...'
                        : 'Gemini Vision OCR is reading prescription medications...'}
                    </span>
                  </div>
                )}

                {/* Patient Verification Card for OCR extracted medicine (Section 15) */}
                {extractedMedicationCard && (
                  <div className="p-3.5 bg-[#B5B7A1] border border-[#29483C] rounded-[8px] flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#29483C]">
                        {currentLanguage === 'hi' ? 'दस्तावेज़ में खोजी गई दवा:' : 'Found in document:'}
                      </span>
                      <p className="text-sm font-black text-[#29483C]">
                        {extractedMedicationCard.name}
                      </p>
                      <p className="text-xs text-[#29483C]/80">
                        {currentLanguage === 'hi'
                          ? 'क्या यह जानकारी सही है?'
                          : 'Is this information correct?'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExtractedMedicationCard((prev) =>
                            prev ? { ...prev, confirmed: true } : null
                          )
                        }
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 bg-[#29483C] hover:bg-[#29483C]/90 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{currentLanguage === 'hi' ? 'हाँ, सही है' : 'Yes, Correct'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExtractedMedicationCard(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#29483C] hover:bg-[#A9AA94]/30 transition cursor-pointer"
                      >
                        {currentLanguage === 'hi' ? 'हटाएं' : 'Dismiss'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Question 7: Family History & Safeguard (Section 14) */}
              <div className="space-y-3 pt-4 border-t border-[#A9AA94]/40">
                <label className="text-sm sm:text-base font-bold text-[#29483C] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#29483C]" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'परिवार में किसी को ऐसी समस्या या गंभीर बीमारी रही है? (Family History)'
                      : 'Has anyone in your immediate family had a similar condition?'}
                  </span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'no', en: 'No', hi: 'नहीं' },
                    { id: 'yes', en: 'Yes', hi: 'हाँ' },
                    { id: 'not_sure', en: 'Not Sure', hi: 'निश्चित नहीं' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFamilyHistory(item.id as any)}
                      className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer text-center min-h-[44px] ${
                        familyHistory === item.id
                          ? 'bg-[#29483C] text-white border-[#29483C] shadow-xs'
                          : 'bg-[#C9C5AF] text-[#29483C] border-[#A9AA94] hover:bg-[#A9AA94]/30'
                      }`}
                    >
                      {currentLanguage === 'hi' ? item.hi : item.en}
                    </button>
                  ))}
                </div>

                {familyHistory === 'yes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      value={familyHistoryRelation}
                      onChange={(e) => setFamilyHistoryRelation(e.target.value)}
                      placeholder={
                        currentLanguage === 'hi'
                          ? 'परिवार सदस्य (माता, पिता, भाई/बहन)'
                          : 'Family Member (Parent, Sibling, Grandparent)'
                      }
                      className="w-full px-3 py-2 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl text-xs text-[#29483C] outline-none"
                    />
                    <input
                      type="text"
                      value={familyHistoryCondition}
                      onChange={(e) => setFamilyHistoryCondition(e.target.value)}
                      placeholder={
                        currentLanguage === 'hi' ? 'बीमारी का नाम' : 'Condition or Diagnosis'
                      }
                      className="w-full px-3 py-2 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl text-xs text-[#29483C] outline-none"
                    />
                  </div>
                )}

                {/* Important Clinical Safeguard Note (Section 14) */}
                <div className="p-3 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl flex items-start gap-2 text-2xs text-[#29483C]">
                  <Info className="w-4 h-4 text-[#29483C] shrink-0 mt-0.5" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'आपका पारिवारिक इतिहास क्लिनिकल मूल्यांकन के लिए महत्वपूर्ण हो सकता है। चिकित्सक यह तय करेंगे कि क्या आगे की जांच आवश्यक है।'
                      : 'Your family history may be relevant to your clinical assessment. The qualified doctor will determine whether genetic or specialized evaluation is appropriate.'}
                  </span>
                </div>
              </div>

              {/* Narrate in Your Own Voice / Additional Note */}
              <div className="pt-4 border-t border-[#A9AA94]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#29483C] flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#29483C]" />
                    <span>
                      {currentLanguage === 'hi'
                        ? 'बोलकर अतिरिक्त विवरण जोड़ें (वैकल्पिक)'
                        : 'Narrate additional details in voice (Optional)'}
                    </span>
                  </label>
                  <span className="text-xs text-[#29483C]/70 font-medium">
                    {currentLanguage === 'hi' ? 'आवाज या टाइप' : 'Voice or typing'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={
                      isRecording
                        ? () => handleStopRecording('narrative')
                        : () => handleStartRecording('narrative')
                    }
                    className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[48px] ${
                      isRecording
                        ? 'bg-[#29483C] ring-4 ring-[#B5B7A1] text-white animate-pulse'
                        : 'bg-[#C9C5AF] text-[#29483C] border border-[#A9AA94] hover:bg-[#A9AA94]/40'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>{ui.recordingStopAction} ({recordingDuration}s)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-[#29483C]" />
                        <span>{ui.recordingStartAction}</span>
                      </>
                    )}
                  </button>

                  <input
                    type="text"
                    value={customNarrative}
                    onChange={(e) => setCustomNarrative(e.target.value)}
                    placeholder={
                      currentLanguage === 'hi'
                        ? 'या यहाँ अतिरिक्त विवरण लिखें (जैसे: चलने में लचक, छूने पर दर्द)'
                        : 'Or type additional details (e.g. sharp when bending, worse in morning)'
                    }
                    className="flex-1 w-full px-4 py-3 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl text-sm focus:bg-[#E3DDCA] focus:ring-2 focus:ring-[#29483C] text-[#29483C] focus:outline-none"
                  />
                </div>
              </div>

              {/* Action: Proceed to AI Clinical Routing */}
              <div className="pt-5 border-t border-[#A9AA94]/40 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setView('anatomy')}
                  className="text-xs font-semibold text-[#29483C] hover:text-[#29483C] transition cursor-pointer"
                >
                  {currentLanguage === 'hi' ? '← शारीरिक आरेख पर वापस जाएं' : '← Back to Body Diagram'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitClinicalIntake()}
                  className="px-8 py-3.5 bg-[#29483C] hover:bg-[#29483C]/90 text-white font-bold rounded-[8px] transition-all cursor-pointer flex items-center gap-2 active:scale-98 min-h-[48px] border border-[#29483C]"
                >
                  <Leaf className="w-4 h-4" />
                  <span>
                    {currentLanguage === 'hi'
                      ? 'लक्षणों का विश्लेषण करें व विभाग सुझाएं'
                      : 'Analyze Symptoms & Find Department'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 2b: VOICE REVIEW SCREEN */}
        {/* ========================================================= */}
        {view === 'review_speech' && (
          <motion.div
            key="view-review-speech"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-xl mx-auto space-y-5"
          >
            <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#29483C]">
                <CheckCircle2 className="w-5 h-5 text-[#29483C]" />
                <h3 className="text-base font-bold text-[#29483C]">{ui.youSaidHeading}</h3>
              </div>

              <div className="p-4 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl">
                <p className="text-lg font-medium text-[#29483C] italic leading-relaxed">
                  “{customNarrative}”
                </p>
              </div>

              <p className="text-xs text-[#29483C]/70">
                {currentLanguage === 'hi'
                  ? 'कृपया जांचें कि यह आपके लक्षणों से मेल खाता है।'
                  : 'Please verify this matches your symptoms. You can edit the text or continue.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => setView('symptom_inquiry')}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#29483C] bg-[#C9C5AF] hover:bg-[#A9AA94]/40 border border-[#A9AA94] rounded-xl transition cursor-pointer min-h-[44px]"
                >
                  <Edit3 className="w-4 h-4 text-[#29483C]" />
                  <span>{ui.editTextAction}</span>
                </button>

                <button
                  onClick={() => handleSubmitClinicalIntake()}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#29483C] hover:bg-[#29483C]/90 rounded-xl transition shadow-xs cursor-pointer min-h-[44px]"
                >
                  <span>{ui.submitSymptomAction}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 2c: ADAPTIVE SYMPTOM RATING SCALE */}
        {/* ========================================================= */}
        {view === 'severity_rating' && (
          <motion.div
            key="view-severity-rating"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="max-w-2xl mx-auto space-y-5"
          >
            <AdaptiveRatingScale
              symptomName={primarySymptom || customNarrative || complaintInput || 'Reported Symptom'}
              locationName={selectedLocation?.bodyRegionLabel || selectedLocation?.anatomicalPath?.join(' - ')}
              currentLanguage={currentLanguage}
              initialValue={documentedSeverityRating?.severity}
              audioEnabled={audioEnabled}
              onConfirm={handleRatingConfirmed}
              onSkip={() => handleSubmitClinicalIntake(undefined, undefined, true)}
            />
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: ANALYZING STATE (GEMINI CLINICAL PROCESSING) */}
        {/* ========================================================= */}
        {view === 'analyzing' && (
          <motion.div
            key="view-analyzing"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="py-12"
          >
            <GeminiProcessingIndicator currentLanguage={currentLanguage} />
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: TARGETED FOLLOW-UP QUESTION */}
        {/* ========================================================= */}
        {view === 'follow_up' && triageResult?.followUpQuestion && (
          <motion.div
            key="view-follow-up"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="max-w-2xl mx-auto space-y-5"
          >
            <div className="p-3 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl flex items-center justify-between text-xs text-[#29483C]">
              <div className="truncate max-w-md">
                <span className="font-semibold text-[#29483C]">
                  {currentLanguage === 'hi' ? 'लक्षण:' : 'Symptom:'}{' '}
                </span>
                <span>
                  {primarySymptom || selectedLocation?.bodyRegionLabel || customNarrative}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-[#B5B7A1] text-[#29483C] rounded-full font-mono text-2xs">
                Question {turnCount - 1} of 2
              </span>
            </div>

            <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] shadow-xs p-6 space-y-5">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[#29483C] uppercase tracking-wider">
                  {ui.singleFollowUpHint}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#29483C] leading-snug">
                  {triageResult.followUpQuestion.questionTextLocalized ||
                    triageResult.followUpQuestion.questionText}
                </h2>
              </div>

              {triageResult.followUpQuestion.quickOptions &&
                triageResult.followUpQuestion.quickOptions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {triageResult.followUpQuestion.quickOptions.map((opt) => {
                      const label = opt.labelLocalized || opt.label;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleAnswerFollowUp(label)}
                          className="w-full text-left p-3.5 bg-[#C9C5AF] hover:bg-[#A9AA94]/30 hover:border-[#29483C] border border-[#A9AA94] rounded-xl transition font-medium text-[#29483C] flex items-center justify-between cursor-pointer min-h-[48px]"
                        >
                          <span>{label}</span>
                          <ArrowRight className="w-4 h-4 text-[#29483C]" />
                        </button>
                      );
                    })}
                  </div>
                )}

              <div className="pt-2 border-t border-[#A9AA94]/40 flex items-center gap-2">
                <input
                  type="text"
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder={
                    currentLanguage === 'hi'
                      ? 'या यहाँ उत्तर टाइप करें...'
                      : 'Or type another detail here...'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && followUpAnswer.trim()) {
                      handleAnswerFollowUp(followUpAnswer);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-sm bg-[#C9C5AF] border border-[#A9AA94] rounded-xl focus:bg-[#E3DDCA] focus:ring-2 focus:ring-[#29483C] text-[#29483C] focus:outline-none"
                />
                <button
                  id="btn-send-follow-up"
                  disabled={!followUpAnswer.trim()}
                  onClick={() => handleAnswerFollowUp(followUpAnswer)}
                  className="px-4 py-2.5 bg-[#29483C] hover:bg-[#29483C]/90 disabled:opacity-40 text-white rounded-xl font-semibold transition cursor-pointer min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setTriageResult((prev) => (prev ? { ...prev, isComplete: true } : null));
                    setView('result');
                  }}
                  className="text-xs font-semibold text-[#29483C] hover:text-[#29483C] underline cursor-pointer py-1"
                >
                  {ui.skipToResult}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 5a: RED-FLAG EMERGENCY ALERT */}
        {/* ========================================================= */}
        {view === 'red_flag' && (
          <motion.div
            key="view-red-flag"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-xl mx-auto space-y-5"
          >
            <div className="bg-[#C9C5AF] border-2 border-[#29483C] rounded-[8px] shadow-sm p-6 sm:p-7 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#29483C] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldAlert className="w-6 h-6 text-[#B5B7A1]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-[#29483C]">
                    {ui.urgentAlertTitle}
                  </h2>
                  <p className="text-sm text-[#29483C] font-medium">
                    {triageResult?.redFlagReason ||
                      'Symptoms indicate possible acute medical urgency.'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#E3DDCA] border border-[#A9AA94] rounded-xl space-y-2">
                <p className="text-sm font-semibold text-[#29483C]">
                  {ui.urgentAlertInstruction}
                </p>
                <p className="text-xs text-[#29483C]/80">
                  {currentLanguage === 'hi'
                    ? 'छाती में तेज दर्द, सांस में गंभीर रुकावट, अत्यधिक रक्तस्राव या गंभीर चोट वाले मरीजों को तुरंत आपातकालीन वार्ड में देखा जाता है।'
                    : 'Patients with potential acute breathing distress, severe chest pain, major bleeding, or trauma receive priority emergency evaluation.'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  id="btn-alert-emergency-staff"
                  onClick={handleAlertEmergency}
                  className={`w-full py-3.5 px-5 font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer min-h-[48px] ${
                    emergencyAlertSent
                      ? 'bg-[#29483C] text-white'
                      : 'bg-[#29483C] hover:bg-[#29483C]/90 text-white'
                  }`}
                >
                  {emergencyAlertSent ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>{ui.emergencyNotifiedBadge}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-[#B5B7A1]" />
                      <span>{ui.alertStaffButton}</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-bypass-emergency-to-opd"
                  onClick={() => handleConfirmDepartment('GENERAL_OPD')}
                  className="w-full text-center text-xs font-semibold text-[#29483C] hover:underline py-2 cursor-pointer min-h-[44px]"
                >
                  {ui.stillProceedOpd}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 5b: SUGGESTED DEPARTMENT & DYNAMIC BRANCH RESULT */}
        {/* ========================================================= */}
        {view === 'result' && triageResult && (
          <motion.div
            key="view-result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {(() => {
              const deptInfo = getDeptInfoByCode(triageResult.suggestedDepartment);
              const DeptIcon = deptInfo.icon;
              const deptName = deptInfo.name[currentLanguage] || deptInfo.name.en;
              const deptSubtitle = deptInfo.subtitle[currentLanguage] || deptInfo.subtitle.en;
              const isPanchakarma = triageResult.suggestedDepartment === 'PANCHAKARMA';

              return (
                <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-6 sm:p-8 space-y-6 relative overflow-hidden">
                  {/* Eyebrow and Subtitle */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#29483C] uppercase tracking-wider bg-[#B5B7A1] border border-[#29483C] px-3 py-1 rounded-[6px] inline-flex items-center gap-1.5">
                        <Leaf className="w-3.5 h-3.5 text-[#29483C]" />
                        <span>
                          {currentLanguage === 'hi'
                            ? 'आपके उत्तरों के आधार पर अनुशंसित देखभाल पथ'
                            : 'Suggested Care Pathway Based on Your Intake'}
                        </span>
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-[#29483C]/70">
                      {ui.suggestedHeading}
                    </h2>
                  </div>

                  {/* Primary Department & Dynamic Branch Block */}
                  <div className="p-5 bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-[8px] bg-[#29483C] text-white flex items-center justify-center shrink-0">
                        <DeptIcon className="w-7 h-7 text-[#B5B7A1]" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-2xl font-black text-[#29483C] tracking-tight">
                            {deptName}
                          </h3>
                          <SymptomConfidenceIndicator
                            confidenceLevel={triageResult.routingConfidence}
                            confidenceScore={triageResult.confidenceScore}
                            confidenceRationale={triageResult.confidenceRationale || triageResult.reason}
                            confidenceFactors={triageResult.confidenceFactors}
                            extractedHistory={{
                              chiefComplaint: triageResult.chiefComplaint,
                              duration: triageResult.duration,
                              location:
                                selectedLocation?.anatomicalPath?.join(' - ') ||
                                selectedLocation?.bodyRegionLabel ||
                                selectedLocation?.bodyRegion,
                              severity: triageResult.severity,
                              previousOccurrence,
                              pastMedicalHistory,
                              currentMedications,
                              familyHistory,
                            }}
                            departmentName={deptName}
                            departmentBranch={
                              triageResult.suggestedBranchCode || triageResult.routing?.branch
                            }
                            currentLanguage={currentLanguage}
                            size="md"
                          />
                        </div>
                        <p className="text-sm font-semibold text-[#29483C]">{deptSubtitle}</p>
                      </div>
                    </div>

                    {/* Dynamic Clinical Branch Highlight */}
                    {(() => {
                      const branchInfo = getControlledBranchInfo(
                        triageResult.suggestedDepartment,
                        triageResult.suggestedBranchCode || triageResult.routing?.branch
                      );
                      const branchTitle =
                        branchInfo?.name[currentLanguage] ||
                        branchInfo?.name.en ||
                        triageResult.suggestedBranch;
                      const branchSubtitle =
                        branchInfo?.subtitle[currentLanguage] || branchInfo?.subtitle.en;
                      const branchDesc =
                        branchInfo?.description[currentLanguage] || branchInfo?.description.en;

                      return (
                        <div className="p-4 bg-[#C9C5AF] border border-[#A9AA94] rounded-[8px] space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-[#B5B7A1] text-[#29483C] rounded-lg">
                                <Compass className="w-4 h-4 text-[#29483C]" />
                              </span>
                              <span className="text-2xs font-bold uppercase tracking-wider text-[#29483C]/70">
                                {currentLanguage === 'hi'
                                  ? 'विशिष्ट क्लिनिकल शाखा (Clinical Branch)'
                                  : 'Targeted Clinical Branch'}
                              </span>
                            </div>
                            {branchInfo?.code && (
                              <span className="px-2.5 py-0.5 bg-[#B5B7A1] border border-[#A9AA94] text-[#29483C] text-2xs font-bold rounded-full font-mono">
                                {branchInfo.code}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-base font-extrabold text-[#29483C]">
                              {branchTitle}
                            </h4>
                            {branchSubtitle && (
                              <p className="text-xs font-semibold text-[#29483C] mt-0.5">
                                {branchSubtitle}
                              </p>
                            )}
                            {branchDesc && (
                              <p className="text-xs text-[#29483C]/80 mt-1.5 leading-relaxed">
                                {branchDesc}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <p className="text-xs text-[#29483C]/80 leading-relaxed">
                      {deptInfo.description[currentLanguage] || deptInfo.description.en}
                    </p>

                    {/* Dedicated Clinical Symptom Confidence Gauge Evaluation Panel */}
                    <div className="p-4 bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] flex flex-col sm:flex-row items-center gap-4 shadow-2xs">
                      <div className="shrink-0 flex items-center justify-center">
                        <SymptomConfidenceGauge
                          score={
                            triageResult.confidenceScore ??
                            (triageResult.routingConfidence === 'high' ? 92 : triageResult.routingConfidence === 'moderate' ? 74 : 52)
                          }
                          level={triageResult.routingConfidence || 'moderate'}
                          variant="full"
                          showLabels={true}
                          showReadout={true}
                          currentLanguage={currentLanguage}
                          className="scale-95 origin-center"
                        />
                      </div>
                      <div className="flex-1 space-y-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="text-2xs font-extrabold uppercase tracking-wider text-[#29483C] bg-[#B5B7A1] px-2.5 py-0.5 rounded-full border border-[#A9AA94]">
                            {currentLanguage === 'hi' ? 'AI क्लिनिकल विश्लेषण' : 'AI Clinical Evaluation'}
                          </span>
                          <span className="text-xs font-bold text-[#29483C]">
                            {triageResult.routingConfidence === 'high'
                              ? (currentLanguage === 'hi' ? 'उच्च संरेखण (High)' : 'High Alignment')
                              : triageResult.routingConfidence === 'moderate'
                              ? (currentLanguage === 'hi' ? 'मध्यम संरेखण (Medium)' : 'Medium Correlation')
                              : (currentLanguage === 'hi' ? 'समीक्षा आवश्यक' : 'Review Required')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#29483C]">
                          {currentLanguage === 'hi'
                            ? `रोगी इनटेक और ${deptName} प्रोटोकॉल मिलान`
                            : `Patient Intake & ${deptName} Protocol Alignment`}
                        </h4>
                        <p className="text-xs text-[#29483C]/80 leading-relaxed">
                          {triageResult.confidenceRationale || triageResult.reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Anatomical Summary Pill Bar */}
                  {selectedLocation && (
                    <div className="p-3.5 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl flex items-center justify-between text-xs text-[#29483C]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#29483C] shrink-0" />
                        <span className="font-semibold">
                          {selectedLocation.anatomicalPath?.join('  →  ') || selectedLocation.bodyRegionLabel}
                        </span>
                      </div>
                      {duration && (
                        <span className="text-[#29483C]/70 font-medium">
                          {duration} • {severity}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Clinical Rationale Text */}
                  <div className="p-4 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl space-y-1.5">
                    <p className="text-sm text-[#29483C] leading-relaxed font-medium">
                      {triageResult.reason}
                    </p>
                    {isPanchakarma && (
                      <p className="text-xs text-[#29483C] font-semibold italic">
                        {currentLanguage === 'hi'
                          ? 'नोट: उपस्थित चिकित्सक यह निर्धारित करेंगे कि क्या आपकी स्थिति के लिए पंचकर्म उपयुक्त है।'
                          : 'Note: The attending practitioner will evaluate whether Panchakarma therapy is suitable for your condition.'}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      id="btn-confirm-suggested-dept"
                      onClick={() => handleConfirmDepartment(triageResult.suggestedDepartment)}
                      className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#29483C] hover:bg-[#29483C] active:bg-[#29483C] text-white font-extrabold rounded-[8px] transition-all cursor-pointer min-h-[50px] active:scale-98 border border-[#29483C]"
                    >
                      <span>
                        {ui.continueWithDept} {deptName}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      id="btn-choose-another-dept"
                      onClick={() => setView('manual')}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-4 text-sm font-bold text-[#29483C] hover:bg-[#A9AA94]/30 bg-[#E3DDCA] border border-[#29483C] rounded-[8px] transition cursor-pointer min-h-[50px]"
                    >
                      {ui.chooseAnotherDept}
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 5c: MANUAL DEPARTMENT SELECTION (6 OPD CARDS) */}
        {/* ========================================================= */}
        {view === 'manual' && (
          <motion.div
            key="view-manual"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#29483C]">
                {ui.chooseDeptHeading}
              </h2>
              <p className="text-sm text-[#29483C]/70 font-medium">
                {ui.chooseDeptSub}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEPARTMENTS_DATA.map((dept) => {
                const isSelected = highlightedDept === dept.code || highlightedDept === dept.legacyId;
                const Icon = dept.icon;
                const name = dept.name[currentLanguage] || dept.name.en;
                const subtitle = dept.subtitle[currentLanguage] || dept.subtitle.en;
                const desc = dept.description[currentLanguage] || dept.description.en;

                return (
                  <button
                    key={dept.code}
                    onClick={() => setHighlightedDept(dept.code)}
                    className={`p-5 rounded-[10px] border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px] ${
                      isSelected
                        ? 'bg-[#B5B7A1] border-[#29483C]'
                        : 'bg-[#E3DDCA] border-[#A9AA94] hover:border-[#29483C]/60 hover:bg-[#C9C5AF]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-[8px] flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#29483C] text-white'
                            : 'bg-[#C9C5AF] text-[#29483C]'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-[#29483C] leading-snug">
                          {name}
                        </h4>
                        <p className="text-xs font-semibold text-[#29483C]">{subtitle}</p>
                        <p className="text-xs text-[#29483C]/70 line-clamp-2 pt-0.5">{desc}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#A9AA94]/60 flex items-center justify-between">
                      <span className="text-2xs font-mono text-[#29483C]/60 uppercase">
                        {dept.legacyId} OPD
                      </span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#29483C]">
                          <Check className="w-3.5 h-3.5" />
                          <span>{currentLanguage === 'hi' ? 'चयनित' : 'Selected'}</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#29483C]/70">
                          {currentLanguage === 'hi' ? 'चुनें' : 'Select'} →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setView('anatomy')}
                className="text-xs font-semibold text-[#29483C] hover:underline transition"
              >
                ← {currentLanguage === 'hi' ? 'शारीरिक आरेख पर लौटें' : 'Back to Body Diagram'}
              </button>

              <button
                onClick={() => handleConfirmDepartment(highlightedDept)}
                className="px-8 py-3.5 bg-[#29483C] hover:bg-[#29483C] active:bg-[#29483C] text-white font-bold rounded-[8px] transition cursor-pointer flex items-center gap-2 min-h-[48px] border border-[#29483C]"
              >
                <span>{ui.confirmSelection}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
