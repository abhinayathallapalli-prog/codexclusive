import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Plus,
  X,
  ShieldCheck,
  HeartPulse,
  Users,
  Pill,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LanguageCode } from '../../types';

export interface PatientHistoryData {
  pastMedicalHistory: string[];
  familyHistory: string[];
  currentMedications?: any[];
  previousOccurrence?: string;
  isVerified?: boolean;
}

interface PatientHistorySummaryCardProps {
  currentLanguage: LanguageCode;
  historyData: PatientHistoryData;
  onChange?: (updated: PatientHistoryData) => void;
  allowEdit?: boolean;
  interactiveVerify?: boolean;
  isLiveDuringInterview?: boolean;
  className?: string;
}

const COMMON_PAST_CONDITIONS = [
  { id: 'htn', en: 'Hypertension (BP)', hi: 'उच्च रक्तचाप (High BP)' },
  { id: 'dm', en: 'Diabetes (Sugar)', hi: 'मधुमेह (डायबिटीज)' },
  { id: 'asthma', en: 'Asthma / Breathing', hi: 'अस्थमा / दमा' },
  { id: 'thyroid', en: 'Thyroid Disorder', hi: 'थायरॉयड विकार' },
  { id: 'arthritis', en: 'Joint Arthritis (Amavata)', hi: 'गठिया / जोड़ों का दर्द' },
  { id: 'acidity', en: 'Chronic Acidity / Amlapitta', hi: 'अम्लपित्त / एसिडिटी' },
  { id: 'migraine', en: 'Chronic Migraine / Shirahshoola', hi: 'माइग्रेन / पुराना सिरदर्द' },
];

const COMMON_FAMILY_CONDITIONS = [
  { id: 'fam_dm', en: 'Family Diabetes (Madhumeha)', hi: 'परिवार में मधुमेह' },
  { id: 'fam_heart', en: 'Family Heart Disease (Hridroga)', hi: 'हृदय रोग का इतिहास' },
  { id: 'fam_htn', en: 'Family Hypertension', hi: 'परिवार में हाई बीपी' },
  { id: 'fam_asthma', en: 'Family Asthma / Shwasa', hi: 'दमा या एलर्जी' },
  { id: 'fam_thyroid', en: 'Family Thyroid', hi: 'परिवार में थायरॉयड' },
];

export const PatientHistorySummaryCard: React.FC<PatientHistorySummaryCardProps> = ({
  currentLanguage,
  historyData,
  onChange,
  allowEdit = true,
  interactiveVerify = true,
  isLiveDuringInterview = false,
  className = '',
}) => {
  const [isVerified, setIsVerified] = useState<boolean>(historyData.isVerified || false);
  const [showAddPastModal, setShowAddPastModal] = useState<boolean>(false);
  const [showAddFamModal, setShowAddFamModal] = useState<boolean>(false);
  const [customPastInput, setCustomPastInput] = useState<string>('');
  const [customFamInput, setCustomFamInput] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const pastHistory = historyData.pastMedicalHistory || [];
  const familyHistory = historyData.familyHistory || [];
  const currentMeds = historyData.currentMedications || [];
  const prevOccurrence = historyData.previousOccurrence || '';

  const handleToggleVerify = () => {
    const nextVal = !isVerified;
    setIsVerified(nextVal);
    onChange?.({
      ...historyData,
      isVerified: nextVal,
    });
  };

  const handleRemovePast = (item: string) => {
    const next = pastHistory.filter((h) => h !== item);
    onChange?.({
      ...historyData,
      pastMedicalHistory: next,
    });
  };

  const handleAddPast = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !pastHistory.includes(trimmed)) {
      const next = [...pastHistory, trimmed];
      onChange?.({
        ...historyData,
        pastMedicalHistory: next,
      });
      setCustomPastInput('');
    }
  };

  const handleRemoveFam = (item: string) => {
    const next = familyHistory.filter((f) => f !== item);
    onChange?.({
      ...historyData,
      familyHistory: next,
    });
  };

  const handleAddFam = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !familyHistory.includes(trimmed)) {
      const next = [...familyHistory, trimmed];
      onChange?.({
        ...historyData,
        familyHistory: next,
      });
      setCustomFamInput('');
    }
  };

  return (
    <div
      className={`ayur-card overflow-hidden text-[#26312B] select-none ${className}`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 bg-[#B5B7A1] border-b border-[#A9AA94] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-[8px] flex items-center justify-center font-bold text-white ${
              isVerified ? 'bg-[#29483C]' : 'bg-[#71866F]'
            }`}
          >
            {isVerified ? <ShieldCheck className="w-5 h-5 text-white" /> : <FileText className="w-5 h-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#596058] uppercase tracking-wider">
                {currentLanguage === 'hi' ? 'चिकित्सीय इतिहास सारांश' : 'Clinical History Profile'}
              </span>
              {isLiveDuringInterview && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-semibold bg-[#E3DDCA] text-[#29483C] border border-[#A9AA94]">
                  <span>{currentLanguage === 'hi' ? 'लाइव सिंक' : 'Live Sync'}</span>
                </span>
              )}
            </div>
            <h4 className="text-base sm:text-lg font-serif text-[#26312B]">
              {currentLanguage === 'hi'
                ? 'पूर्व व्याधि एवं कुलवृत्त (Medical & Family History)'
                : 'Medical & Hereditary History'}
            </h4>
          </div>
        </div>

        {/* Verification Status & Toggle */}
        <div className="flex items-center gap-2">
          {interactiveVerify && (
            <button
              type="button"
              onClick={handleToggleVerify}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                isVerified
                  ? 'bg-[#29483C] hover:bg-[#1d332a] text-white'
                  : 'bg-[#E3DDCA] border border-[#29483C] text-[#29483C] hover:bg-[#B5B7A1]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isVerified
                  ? currentLanguage === 'hi'
                    ? 'सत्यापित'
                    : 'Verified'
                  : currentLanguage === 'hi'
                  ? 'सत्यापित करें'
                  : 'Verify History'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-[#E3DDCA] border border-[#A9AA94] text-[#596058] hover:text-[#26312B] cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-xs text-[#596058] font-normal leading-relaxed">
            {currentLanguage === 'hi'
              ? 'यह कार्ड आपके द्वारा दिए गए उत्तरों से तैयार किया गया है। कृपया पूर्व व्याधि और कुलवृत्त की पुष्टि करें।'
              : 'Review captured past conditions and hereditary factors to assist the Vaidya in Dashavidha Pariksha.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SECTION 1: PAST MEDICAL HISTORY */}
            <div className="p-3.5 bg-[#E3DDCA] border border-[#A9AA94] rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-[#29483C]" />
                  <span className="text-xs font-semibold text-[#26312B] uppercase tracking-wider">
                    {currentLanguage === 'hi'
                      ? 'पूर्व व्याधि (Past Conditions)'
                      : 'Past Medical History'}
                  </span>
                </div>

                {allowEdit && (
                  <button
                    type="button"
                    onClick={() => setShowAddPastModal(!showAddPastModal)}
                    className="text-[11px] font-semibold text-[#29483C] hover:underline bg-[#B5B7A1] border border-[#A9AA94] px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{currentLanguage === 'hi' ? 'जोड़ें' : 'Add'}</span>
                  </button>
                )}
              </div>

              {pastHistory.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {pastHistory.map((item, idx) => (
                    <span
                      key={`past-${idx}-${item}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E3DDCA] border border-[#A9AA94] rounded-[6px] text-xs font-medium text-[#26312B]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#29483C]"></span>
                      <span>{item}</span>
                      {allowEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemovePast(item)}
                          className="text-[#596058] hover:text-[#A65F49] ml-0.5 cursor-pointer p-0.5"
                          title="Remove condition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="py-2 px-3 bg-[#B5B7A1]/60 border border-dashed border-[#A9AA94] rounded-md text-xs text-[#596058]">
                  {currentLanguage === 'hi'
                    ? 'कोई पूर्व व्याधि दर्ज नहीं है।'
                    : 'No past diagnosed conditions reported.'}
                </div>
              )}

              {/* Inline Quick Add */}
              {showAddPastModal && allowEdit && (
                <div className="p-2.5 bg-[#B5B7A1] border border-[#A9AA94] rounded-lg space-y-2 mt-2">
                  <span className="text-[10px] font-semibold text-[#596058] block uppercase">
                    {currentLanguage === 'hi' ? 'त्वरित चयन:' : 'Quick Select:'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_PAST_CONDITIONS.map((cond) => {
                      const label = currentLanguage === 'hi' ? cond.hi : cond.en;
                      const isAdded = pastHistory.includes(label);
                      return (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() => handleAddPast(label)}
                          disabled={isAdded}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md border cursor-pointer transition-all ${
                            isAdded
                              ? 'bg-[#A9AA94]/40 text-[#596058] border-[#A9AA94] cursor-not-allowed'
                              : 'bg-[#E3DDCA] text-[#26312B] border-[#A9AA94] hover:bg-[#E3DDCA]'
                          }`}
                        >
                          + {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={customPastInput}
                      onChange={(e) => setCustomPastInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddPast(customPastInput);
                      }}
                      placeholder="Type other condition..."
                      className="flex-1 px-2.5 py-1 text-xs bg-[#E3DDCA] border border-[#A9AA94] rounded-md outline-none text-[#26312B]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddPast(customPastInput)}
                      disabled={!customPastInput.trim()}
                      className="px-2.5 py-1 bg-[#29483C] hover:bg-[#1d332a] disabled:opacity-40 text-white font-medium text-xs rounded-md cursor-pointer"
                    >
                      {currentLanguage === 'hi' ? 'जोड़ें' : 'Add'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: FAMILY HISTORY */}
            <div className="p-3.5 bg-[#E3DDCA] border border-[#A9AA94] rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#29483C]" />
                  <span className="text-xs font-semibold text-[#26312B] uppercase tracking-wider">
                    {currentLanguage === 'hi'
                      ? 'कुलवृत्त (Family History)'
                      : 'Family Hereditary History'}
                  </span>
                </div>

                {allowEdit && (
                  <button
                    type="button"
                    onClick={() => setShowAddFamModal(!showAddFamModal)}
                    className="text-[11px] font-semibold text-[#29483C] hover:underline bg-[#B5B7A1] border border-[#A9AA94] px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{currentLanguage === 'hi' ? 'जोड़ें' : 'Add'}</span>
                  </button>
                )}
              </div>

              {familyHistory.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {familyHistory.map((item, idx) => (
                    <span
                      key={`fam-${idx}-${item}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E3DDCA] border border-[#A9AA94] rounded-[6px] text-xs font-medium text-[#26312B]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#71866F]"></span>
                      <span>{item}</span>
                      {allowEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFam(item)}
                          className="text-[#596058] hover:text-[#A65F49] ml-0.5 cursor-pointer p-0.5"
                          title="Remove family item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="py-2 px-3 bg-[#B5B7A1]/60 border border-dashed border-[#A9AA94] rounded-md text-xs text-[#596058]">
                  {currentLanguage === 'hi'
                    ? 'कोई वंशानुगत व्याधि दर्ज नहीं है।'
                    : 'No hereditary conditions reported.'}
                </div>
              )}

              {/* Inline Quick Add */}
              {showAddFamModal && allowEdit && (
                <div className="p-2.5 bg-[#B5B7A1] border border-[#A9AA94] rounded-lg space-y-2 mt-2">
                  <span className="text-[10px] font-semibold text-[#596058] block uppercase">
                    {currentLanguage === 'hi' ? 'त्वरित चयन:' : 'Quick Select:'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_FAMILY_CONDITIONS.map((cond) => {
                      const label = currentLanguage === 'hi' ? cond.hi : cond.en;
                      const isAdded = familyHistory.includes(label);
                      return (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() => handleAddFam(label)}
                          disabled={isAdded}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md border cursor-pointer transition-all ${
                            isAdded
                              ? 'bg-[#A9AA94]/40 text-[#596058] border-[#A9AA94] cursor-not-allowed'
                              : 'bg-[#E3DDCA] text-[#26312B] border-[#A9AA94] hover:bg-[#E3DDCA]'
                          }`}
                        >
                          + {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={customFamInput}
                      onChange={(e) => setCustomFamInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddFam(customFamInput);
                      }}
                      placeholder="Type other family condition..."
                      className="flex-1 px-2.5 py-1 text-xs bg-[#E3DDCA] border border-[#A9AA94] rounded-md outline-none text-[#26312B]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddFam(customFamInput)}
                      disabled={!customFamInput.trim()}
                      className="px-2.5 py-1 bg-[#29483C] hover:bg-[#1d332a] disabled:opacity-40 text-white font-medium text-xs rounded-md cursor-pointer"
                    >
                      {currentLanguage === 'hi' ? 'जोड़ें' : 'Add'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MEDICATIONS & OCCURRENCE */}
          {(currentMeds.length > 0 || prevOccurrence) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#A9AA94] text-xs">
              {currentMeds.length > 0 && (
                <div className="p-2.5 bg-[#E3DDCA] rounded-lg border border-[#A9AA94] flex items-start gap-2">
                  <Pill className="w-4 h-4 text-[#29483C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#26312B] block mb-1">
                      {currentLanguage === 'hi' ? 'वर्तमान औषधियां:' : 'Current Medications:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {currentMeds.map((m, idx) => (
                        <span
                          key={`med-${idx}`}
                          className="px-2 py-0.5 bg-[#E3DDCA] border border-[#A9AA94] rounded-sm text-[11px] font-medium text-[#26312B]"
                        >
                          {typeof m === 'string' ? m : `${m.name} ${m.dosage || ''}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {prevOccurrence && (
                <div className="p-2.5 bg-[#E3DDCA] rounded-lg border border-[#A9AA94] flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#596058] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#26312B] block mb-0.5">
                      {currentLanguage === 'hi' ? 'पूर्व अनुभव:' : 'Previous Occurrence:'}
                    </span>
                    <span className="text-[#596058] text-xs">
                      {prevOccurrence}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Affirmation Banner */}
          <div
            onClick={interactiveVerify ? handleToggleVerify : undefined}
            className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-all ${
              isVerified
                ? 'bg-[#B5B7A1] border-[#29483C] text-[#26312B]'
                : 'bg-[#E3DDCA] border-[#A9AA94] text-[#26312B] hover:bg-[#B5B7A1]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-all ${
                  isVerified
                    ? 'bg-[#29483C] border-[#29483C] text-white'
                    : 'bg-[#E3DDCA] border-[#A9AA94]'
                }`}
              >
                {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="text-xs font-medium">
                {currentLanguage === 'hi'
                  ? 'मैं पुष्टि करता/करती हूँ कि दर्ज पिछला चिकित्सीय व कुलवृत्त इतिहास सही है।'
                  : 'I confirm that the captured past medical and family history is accurate.'}
              </span>
            </div>

            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#E3DDCA] border border-[#A9AA94] text-[#29483C]">
              {isVerified
                ? currentLanguage === 'hi'
                  ? 'सत्यापित'
                  : 'Verified'
                : currentLanguage === 'hi'
                ? 'सत्यापित करें'
                : 'Verify'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
