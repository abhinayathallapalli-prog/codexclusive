import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TextEffect } from '@/components/core/text-effect';
import { ArrowLeft, ArrowRight, Volume2, Edit3, User, Building2, Activity, FileText } from 'lucide-react';
import { LanguageCode, PatientProfile, MedicalDocument, ClinicalSeverityRating } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';
import { getUIText } from '../../data/translations';
import { PatientHistorySummaryCard, PatientHistoryData } from './PatientHistorySummaryCard';
import { PatientHistoryOverview } from './PatientHistoryOverview';
import { SymptomConfidenceIndicator } from './SymptomConfidenceIndicator';

interface KioskReviewProps {
  currentLanguage: LanguageCode;
  patient: PatientProfile;
  department: string;
  departmentBranch?: string;
  chiefComplaint?: string;
  duration?: string;
  location?: string;
  triggers?: string;
  interviewData?: {
    chiefComplaint: string;
    duration: string;
    location: string;
    triggers?: string;
    associations?: string;
    allAnswers?: Record<string, string>;
    departmentBranch?: string;
    severity?: string;
    severityRating?: ClinicalSeverityRating;
    anatomicalLocation?: any;
    previousOccurrence?: string;
    pastMedicalHistory?: string[];
    currentMedications?: any[];
    familyHistory?: string[];
    routingConfidence?: 'high' | 'moderate' | 'low';
    confidenceScore?: number;
    confidenceRationale?: string;
    confidenceFactors?: string[];
  };
  documents: MedicalDocument[];
  onEditSection: (section: 'patient' | 'intake' | 'documents' | any) => void;
  onUpdateHistory?: (updated: {
    pastMedicalHistory: string[];
    familyHistory: string[];
    currentMedications?: any[];
    previousOccurrence?: string;
  }) => void;
  onNext?: () => void;
  onConfirm?: () => void;
  onBack: () => void;
  audioEnabled: boolean;
}

export const KioskReview: React.FC<KioskReviewProps> = ({
  currentLanguage,
  patient,
  department,
  departmentBranch,
  chiefComplaint,
  duration,
  location,
  triggers,
  interviewData,
  documents,
  onEditSection,
  onUpdateHistory,
  onNext,
  onConfirm,
  onBack,
  audioEnabled,
}) => {
  const t = getUIText(currentLanguage);

  const activeChiefComplaint =
    chiefComplaint || interviewData?.chiefComplaint || patient.chiefComplaint || 'Consultation request';
  const activeDuration = duration || interviewData?.duration || '1-3 days';
  const activeLocation = location || interviewData?.location || patient.anatomicalLocation || 'Anatomical region';
  const activeBranch = departmentBranch || interviewData?.departmentBranch || patient.departmentBranch || 'General Medical';
  const activeSeverity = interviewData?.severity || 'Moderate';
  const activePrevOccurrence = interviewData?.previousOccurrence || 'First occurrence';
  const activePastHistory = interviewData?.pastMedicalHistory || [];
  const activeCurrentMeds = interviewData?.currentMedications || [];
  const activeFamilyHistory = interviewData?.familyHistory || [];

  const [historyData, setHistoryData] = useState<PatientHistoryData>({
    pastMedicalHistory: activePastHistory,
    familyHistory: activeFamilyHistory,
    currentMedications: activeCurrentMeds,
    previousOccurrence: activePrevOccurrence,
    isVerified: false,
  });

  const handleHistoryChange = (updated: PatientHistoryData) => {
    setHistoryData(updated);
    onUpdateHistory?.({
      pastMedicalHistory: updated.pastMedicalHistory,
      familyHistory: updated.familyHistory,
      currentMedications: updated.currentMedications,
      previousOccurrence: updated.previousOccurrence,
    });
  };

  const handleProceed = onConfirm || onNext;

  useEffect(() => {
    if (audioEnabled) {
      speakPrompt(t.reviewAudio, currentLanguage);
    }
  }, [currentLanguage, audioEnabled]);

  return (
    <div id="kiosk-case-review-view" className="max-w-4xl mx-auto px-4 py-6 sm:py-8 select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-[8px] bg-[#E3DDCA] border border-[#A9AA94] hover:bg-[#B5B7A1] text-[#26312B] font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#29483C]" />
          <span>{t.back}</span>
        </button>

        <button
          type="button"
          onClick={() => speakPrompt(t.reviewAudio, currentLanguage)}
          className="px-3.5 py-2 rounded-[8px] bg-[#B5B7A1]/60 border border-[#A9AA94] text-[#29483C] font-semibold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#B5B7A1] transition-all"
        >
          <Volume2 className="w-4 h-4 text-[#29483C]" />
          <span>{t.listen}</span>
        </button>
      </div>

      {/* Screen Task Heading */}
      <div className="text-center mb-8">
        <TextEffect
          key={`rev-title-${currentLanguage}`}
          per="word"
          as="h2"
          preset="slide"
          className="font-serif text-2xl sm:text-4xl font-normal text-[#26312B] mb-2 cursor-default"
        >
          {currentLanguage === 'hi' ? 'केस सारांश एवं समीक्षा' : 'Clinical Case Summary'}
        </TextEffect>
        <TextEffect
          key={`rev-sub-${currentLanguage}`}
          per="word"
          as="p"
          preset="fade"
          delay={0.12}
          className="text-sm sm:text-base text-[#596058] font-normal cursor-default max-w-xl mx-auto"
        >
          {currentLanguage === 'hi'
            ? 'कृपया चिकित्सक परामर्श से पहले दर्ज की गई जानकारी की जांच करें।'
            : 'Please review the captured clinical intake details before consulting the physician.'}
        </TextEffect>
      </div>

      {/* Structured Case Summary Grid */}
      <div className="space-y-4 mb-8">
        {/* Card 1: Patient Identity */}
        <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-6 shadow-none flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[8px] bg-[#B5B7A1] text-[#29483C] flex items-center justify-center shrink-0 font-bold border border-[#A9AA94]">
              <User className="w-6 h-6 text-[#29483C]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#596058] uppercase tracking-wider block mb-0.5">
                {t.patientDetailsCard}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-[#26312B]">
                {patient.name || 'Walk-in Patient'} ({patient.age || 35}y / {(patient.gender || 'male').toUpperCase()})
              </h4>
              <p className="text-xs text-[#596058] font-mono mt-0.5">
                Contact: {patient.phone || patient.abhaId || 'Direct Kiosk Check-in'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onEditSection('patient_id')}
            className="px-3.5 py-1.5 bg-[#B5B7A1]/60 hover:bg-[#B5B7A1] text-[#29483C] font-semibold text-xs rounded-[8px] flex items-center gap-1.5 cursor-pointer shrink-0 transition-all border border-[#A9AA94]"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#29483C]" />
            <span>{t.edit}</span>
          </button>
        </div>

        {/* Card 2: AI Assigned Department & Branch */}
        <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-6 shadow-none flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[8px] bg-[#29483C] text-white flex items-center justify-center shrink-0 font-bold">
              <Building2 className="w-6 h-6 text-[#B5B7A1]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#71866F] uppercase tracking-wider block mb-0.5">
                {currentLanguage === 'hi' ? 'आवंटित विभाग व विशिष्ट शाखा' : 'Assigned OPD Department & Branch'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-serif text-lg sm:text-xl font-normal text-[#26312B]">
                  {department}
                </h4>
                <SymptomConfidenceIndicator
                  confidenceLevel={interviewData?.routingConfidence || patient.routingConfidence}
                  confidenceScore={interviewData?.confidenceScore || patient.confidenceScore}
                  confidenceRationale={interviewData?.confidenceRationale || patient.confidenceRationale}
                  confidenceFactors={interviewData?.confidenceFactors || patient.confidenceFactors}
                  extractedHistory={{
                    chiefComplaint: interviewData?.chiefComplaint || patient.chiefComplaint,
                    duration: interviewData?.duration,
                    location: interviewData?.location,
                    previousOccurrence: interviewData?.previousOccurrence,
                    pastMedicalHistory: interviewData?.pastMedicalHistory,
                    currentMedications: interviewData?.currentMedications,
                    familyHistory: interviewData?.familyHistory,
                  }}
                  departmentName={department}
                  departmentBranch={activeBranch}
                  currentLanguage={currentLanguage}
                  size="sm"
                />
              </div>
              <p className="text-xs sm:text-sm text-[#71866F] font-semibold mt-0.5">
                Branch: {activeBranch.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onEditSection('intake')}
            className="px-3.5 py-1.5 bg-[#B5B7A1]/60 hover:bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] font-semibold text-xs rounded-[8px] flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#29483C]" />
            <span>{t.edit}</span>
          </button>
        </div>

        {/* Card 3: Clinical Intake Breakdown */}
        <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-6 shadow-none space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#A9AA94]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#B5B7A1] text-[#29483C] flex items-center justify-center font-bold border border-[#A9AA94]">
                <Activity className="w-5 h-5 text-[#29483C]" />
              </div>
              <h4 className="font-serif text-base sm:text-lg font-normal text-[#26312B]">
                {currentLanguage === 'hi' ? 'लक्षण एवं शारीरिक विवरण' : 'Clinical Symptom Profile'}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => onEditSection('intake')}
              className="px-3.5 py-1.5 bg-[#B5B7A1]/60 hover:bg-[#B5B7A1] text-[#29483C] font-semibold text-xs rounded-[8px] flex items-center gap-1.5 cursor-pointer transition-all border border-[#A9AA94]"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#29483C]" />
              <span>{t.edit}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="p-3 bg-[#B5B7A1]/50 rounded-[8px] border border-[#A9AA94]">
              <span className="text-[#596058] block font-semibold mb-0.5 uppercase tracking-wider text-[11px]">
                {currentLanguage === 'hi' ? 'मुख्य समस्या' : 'Main Problem'}
              </span>
              <span className="font-bold text-[#26312B] text-sm">{activeChiefComplaint}</span>
            </div>

            <div className="p-3 bg-[#B5B7A1]/50 rounded-[8px] border border-[#A9AA94]">
              <span className="text-[#596058] block font-semibold mb-0.5 uppercase tracking-wider text-[11px]">
                {currentLanguage === 'hi' ? 'शारीरिक स्थान' : 'Anatomical Location'}
              </span>
              <span className="font-bold text-[#26312B] text-sm">{activeLocation}</span>
            </div>

            <div className="p-3 bg-[#B5B7A1]/50 rounded-[8px] border border-[#A9AA94]">
              <span className="text-[#596058] block font-semibold mb-0.5 uppercase tracking-wider text-[11px]">
                {currentLanguage === 'hi' ? 'समयावधि व तीव्रता' : 'Duration & Severity'}
              </span>
              <span className="font-bold text-[#26312B] text-sm block">
                {activeDuration} • {activeSeverity}
              </span>
              {(interviewData?.severityRating || patient?.severityRating) && (
                <span className="inline-block mt-1 text-2xs font-semibold px-2 py-0.5 bg-[#B5B7A1] text-[#29483C] rounded-[4px] border border-[#A9AA94]">
                  Rating: {(interviewData?.severityRating || patient?.severityRating)?.severity} / {(interviewData?.severityRating || patient?.severityRating)?.severityScale === '0-4' ? 4 : 10} ({(interviewData?.severityRating || patient?.severityRating)?.severityLabel})
                </span>
              )}
            </div>

            <div className="p-3 bg-[#B5B7A1]/50 rounded-[8px] border border-[#A9AA94]">
              <span className="text-[#596058] block font-semibold mb-0.5 uppercase tracking-wider text-[11px]">
                {currentLanguage === 'hi' ? 'पिछला इतिहास' : 'Previous Occurrence'}
              </span>
              <span className="font-bold text-[#26312B] text-sm">{activePrevOccurrence}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Dynamic & Interactive Patient History Summary Card */}
        <PatientHistorySummaryCard
          currentLanguage={currentLanguage}
          historyData={historyData}
          onChange={handleHistoryChange}
          allowEdit={true}
          interactiveVerify={true}
          isLiveDuringInterview={false}
        />

        {/* Card 5: Chronological Timeline of Past Medical Encounters from Firestore */}
        <PatientHistoryOverview
          patientId={patient?.id || patient?.patientId}
          phone={patient?.phone}
          abhaId={patient?.abhaId}
          patientName={patient?.name}
          currentLanguage={currentLanguage}
        />

        {/* Card 6: Attached Documents & OCR Verification */}
        <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-6 shadow-none flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[8px] bg-[#B5B7A1] text-[#29483C] flex items-center justify-center shrink-0 font-bold border border-[#A9AA94]">
              <FileText className="w-6 h-6 text-[#29483C]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#596058] uppercase tracking-wider block mb-0.5">
                {t.docsCard}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-[#26312B]">
                {documents.length > 0 ? `${documents.length} ${t.addedDocs}` : t.noDocsAttached}
              </h4>
              <p className="text-xs text-[#596058] font-normal">
                {documents.length > 0 ? 'Verified and attached for consulting doctor' : 'No previous files attached'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onEditSection('documents')}
            className="px-3.5 py-1.5 bg-[#B5B7A1]/60 hover:bg-[#B5B7A1] text-[#29483C] font-semibold text-xs rounded-[8px] flex items-center gap-1.5 cursor-pointer shrink-0 transition-all border border-[#A9AA94]"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#29483C]" />
            <span>{t.edit}</span>
          </button>
        </div>
      </div>

      {/* Clinical Safeguard & Medical Responsibility Notice */}
      <div className="mb-8 p-4 bg-[#B5B7A1]/60 border border-[#A9AA94] rounded-[10px] flex items-start gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#29483C] shrink-0 mt-1" />
        <p className="text-xs sm:text-sm text-[#26312B] font-normal leading-relaxed">
          {currentLanguage === 'hi'
            ? 'महत्वपूर्ण सूचना: मेडीकियोस्क का उद्देश्य आपकी समस्या को समझकर सही विभाग और चिकित्सक तक पहुंचाना है। अंतिम निदान (Diagnosis) और उपचार का निर्णय केवल योग्य चिकित्सक द्वारा ही किया जाएगा।'
            : 'Clinical Notice: MediKiosk organizes patient intake and guides routing to the appropriate department. The final diagnosis and treatment decisions remain exclusively with qualified healthcare professionals.'}
        </p>
      </div>

      {/* Primary Case Confirmation & Token Generation */}
      <div className="flex items-center justify-center">
        <motion.button
          type="button"
          onClick={() => handleProceed?.()}
          whileHover={{ translateY: -2 }}
          whileTap={{ scale: 0.985 }}
          className="group w-full sm:w-auto min-w-[280px] h-[52px] px-8 bg-[#29483C] hover:bg-[#1d332a] active:scale-95 text-[#F0EBDD] text-base font-semibold rounded-[8px] flex items-center justify-center gap-3 cursor-pointer transition-all border border-[#29483C]"
        >
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">{t.confirmSummary}</span>
          <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1 text-[#B99B6B]" />
        </motion.button>
      </div>
    </div>
  );
};
