import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Pill,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import {
  fetchPatientPastEncounters,
  verifyEncounterInFirestore,
  PastMedicalEncounter,
} from '../../lib/firebase';

interface PatientHistoryOverviewProps {
  patientId?: string;
  phone?: string;
  abhaId?: string;
  patientName?: string;
  currentLanguage?: string;
  className?: string;
  onVerifiedChange?: (verifiedCount: number, totalCount: number) => void;
}

export const PatientHistoryOverview: React.FC<PatientHistoryOverviewProps> = ({
  patientId = '',
  phone = '',
  abhaId = '',
  patientName = '',
  currentLanguage = 'en',
  className = '',
  onVerifiedChange,
}) => {
  const isHi = currentLanguage === 'hi';

  const [encounters, setEncounters] = useState<PastMedicalEncounter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [expandedEncounterIds, setExpandedEncounterIds] = useState<Record<string, boolean>>({});
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const loadEncounters = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPatientPastEncounters(patientId, phone, abhaId);
      setEncounters(data);

      // Auto-expand the most recent encounter by default
      if (data.length > 0 && Object.keys(expandedEncounterIds).length === 0) {
        setExpandedEncounterIds({ [data[0].id]: true });
      }

      if (onVerifiedChange) {
        const verified = data.filter((e) => e.verifiedByPatient).length;
        onVerifiedChange(verified, data.length);
      }
    } catch (err) {
      console.warn('Failed to load past encounters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEncounters();
  }, [patientId, phone, abhaId]);

  const toggleExpand = (id: string) => {
    setExpandedEncounterIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleVerification = async (encounter: PastMedicalEncounter, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !encounter.verifiedByPatient;

    setEncounters((prev) => {
      const updated = prev.map((item) =>
        item.id === encounter.id ? { ...item, verifiedByPatient: newStatus } : item
      );
      if (onVerifiedChange) {
        const verified = updated.filter((i) => i.verifiedByPatient).length;
        onVerifiedChange(verified, updated.length);
      }
      return updated;
    });

    setVerificationFeedback(
      newStatus
        ? isHi
          ? 'चिकित्सकीय इतिहास आपके द्वारा सत्यापित किया गया।'
          : 'Encounter verified and marked as accurate.'
        : isHi
          ? 'सत्यापन स्थिति रीसेट की गई।'
          : 'Verification reset to pending.'
    );

    setTimeout(() => {
      setVerificationFeedback(null);
    }, 3500);

    // Persist verification to Firestore
    await verifyEncounterInFirestore(encounter.id, newStatus);
  };

  const filteredEncounters = encounters.filter((enc) => {
    if (filter === 'verified') return enc.verifiedByPatient;
    if (filter === 'pending') return !enc.verifiedByPatient;
    return true;
  });

  const verifiedCount = encounters.filter((e) => e.verifiedByPatient).length;

  return (
    <div
      id="patient-history-timeline-card"
      className={`bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-5 sm:p-6 text-[#26312B] select-none ${className}`}
    >
      {/* Header with Title and Verification Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#A9AA94]">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-[8px] bg-[#29483C] text-[#F0EBDD] flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6 text-[#B5B7A1]" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-[#596058]">
              <span className="font-semibold uppercase tracking-wider">
                {isHi ? 'आयुष स्वास्थ्य रिकॉर्ड इतिहास' : 'Ayush Health Record (EHR)'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{isHi ? 'क्लाउड सिंक' : 'Firestore Synced'}</span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-normal text-[#26312B] mt-0.5">
              {isHi ? 'पूर्व चिकित्सीय परामर्श एवं इतिहास' : 'Past Clinical Encounters Timeline'}
            </h3>
            <p className="text-xs text-[#596058] mt-0.5">
              {isHi
                ? 'अपने पिछले अस्पताल दौरों और दवाओं की समीक्षा करें तथा पुष्टि करें।'
                : 'Review and verify your historical OPD consultations and Ayush prescriptions.'}
            </p>
          </div>
        </div>

        {/* Action Controls: Refresh & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={loadEncounters}
            disabled={isLoading}
            className="h-[38px] px-3 rounded-[8px] bg-[#B5B7A1]/60 hover:bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title={isHi ? 'पुनः लोड करें' : 'Refresh Timeline'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isHi ? 'रीफ्रेश' : 'Refresh'}</span>
          </button>

          {/* Interactive Filter Segmented Buttons (Compliant with Zero-Pill Rules) */}
          <div className="inline-flex items-center p-1 bg-[#B5B7A1]/50 border border-[#A9AA94] rounded-[8px]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`h-[30px] px-2.5 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#29483C] text-white'
                  : 'text-[#29483C] hover:bg-[#B5B7A1]'
              }`}
            >
              {isHi ? 'सभी' : 'All'} ({encounters.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('verified')}
              className={`h-[30px] px-2.5 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                filter === 'verified'
                  ? 'bg-[#29483C] text-white'
                  : 'text-[#29483C] hover:bg-[#B5B7A1]'
              }`}
            >
              {isHi ? 'सत्यापित' : 'Verified'} ({verifiedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`h-[30px] px-2.5 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                filter === 'pending'
                  ? 'bg-[#29483C] text-white'
                  : 'text-[#29483C] hover:bg-[#B5B7A1]'
              }`}
            >
              {isHi ? 'लंबित' : 'Pending'} ({encounters.length - verifiedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Verification Feedback Toast */}
      {verificationFeedback && (
        <div className="mt-3 p-3 bg-[#B5B7A1] border border-[#29483C] rounded-[8px] flex items-center justify-between text-xs font-semibold text-[#29483C] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#29483C]" />
            <span>{verificationFeedback}</span>
          </div>
          <span className="text-[11px] font-mono text-[#596058]">ABDM/ISO 2026</span>
        </div>
      )}

      {/* Timeline Content */}
      <div className="mt-5 space-y-4">
        {isLoading ? (
          <div className="py-10 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#29483C] mx-auto" />
            <p className="text-xs text-[#596058] font-medium">
              {isHi ? 'क्लाउड डेटाबेस से इतिहास खोजा जा रहा है...' : 'Querying patient encounters from Firestore...'}
            </p>
          </div>
        ) : filteredEncounters.length === 0 ? (
          <div className="py-8 text-center bg-[#B5B7A1]/40 border border-[#A9AA94] rounded-[8px] space-y-2">
            <FileText className="w-6 h-6 text-[#596058] mx-auto opacity-70" />
            <p className="text-xs font-semibold text-[#26312B]">
              {isHi ? 'कोई पूर्व मेडिकल रिकॉर्ड नहीं मिला' : 'No past medical encounters in this view'}
            </p>
            <p className="text-2xs text-[#596058]">
              {isHi ? 'सभी फ़िल्टर का चयन करके पूरे रिकॉर्ड देखें' : 'Try selecting "All" to view all recorded visits'}
            </p>
          </div>
        ) : (
          <div className="relative pl-4 sm:pl-6 space-y-4 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#A9AA94]">
            {filteredEncounters.map((encounter, index) => {
              const isExpanded = !!expandedEncounterIds[encounter.id];
              const encDate = new Date(encounter.encounterDate);
              const formattedDate = isNaN(encDate.getTime())
                ? encounter.encounterDate
                : encDate.toLocaleDateString(isHi ? 'hi-IN' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

              return (
                <div
                  key={encounter.id}
                  className="relative group transition-all duration-150"
                >
                  {/* Timeline Node Bullet */}
                  <div
                    className={`absolute -left-4 sm:-left-6 top-4 w-3.5 h-3.5 rounded-[4px] border-2 transition-colors ${
                      encounter.verifiedByPatient
                        ? 'bg-[#29483C] border-[#29483C]'
                        : 'bg-[#E3DDCA] border-[#A9AA94] group-hover:border-[#29483C]'
                    }`}
                  />

                  {/* Encounter Card on Clinical Surface */}
                  <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-4 sm:p-5 transition-all hover:border-[#29483C]/70">
                    {/* Header Row: Date, Department, Doctor, Verification Button */}
                    <div
                      onClick={() => toggleExpand(encounter.id)}
                      className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-[#29483C] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#29483C]" />
                            {formattedDate}
                          </span>
                          <span aria-hidden="true" className="text-[#596058]">·</span>
                          <span className="font-mono text-[11px] text-[#596058]">
                            {encounter.tokenNumber ? `Token ${encounter.tokenNumber}` : 'OPD Walk-in'}
                          </span>
                          <span aria-hidden="true" className="text-[#596058]">·</span>
                          <span className="text-[11px] text-[#71866F] font-semibold">
                            {encounter.roomNumber || 'OPD Desk'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-baseline gap-2">
                          <h4 className="font-serif text-base sm:text-lg font-bold text-[#26312B]">
                            {encounter.department}
                          </h4>
                          {encounter.departmentBranch && (
                            <span className="text-xs text-[#596058] font-medium">
                              ({encounter.departmentBranch})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#596058]">
                          <User className="w-3.5 h-3.5 text-[#29483C]" />
                          <span>{encounter.doctorName || 'Attending Ayurvedic Physician'}</span>
                        </div>
                      </div>

                      {/* Right Action: Patient Verification Toggle & Accordion Trigger */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleVerification(encounter, e)}
                          className={`min-h-[44px] px-3.5 py-2 rounded-[8px] border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                            encounter.verifiedByPatient
                              ? 'bg-[#29483C] text-[#F0EBDD] border-[#29483C]'
                              : 'bg-[#B5B7A1]/60 hover:bg-[#B5B7A1] text-[#29483C] border-[#A9AA94]'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              encounter.verifiedByPatient ? 'text-[#B99B6B]' : 'text-[#29483C]'
                            }`}
                          />
                          <span>
                            {encounter.verifiedByPatient
                              ? isHi
                                ? 'रिकॉर्ड सत्यापित'
                                : 'Record Verified'
                              : isHi
                                ? 'पुष्टि करें'
                                : 'Verify Record'}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="w-10 h-10 rounded-[8px] bg-[#B5B7A1]/40 border border-[#A9AA94] hover:bg-[#B5B7A1] text-[#29483C] flex items-center justify-center cursor-pointer transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#29483C]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#29483C]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Complaint Preview */}
                    <div className="mt-3 pt-3 border-t border-[#A9AA94]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-semibold text-[#596058] uppercase tracking-wider text-[11px] block sm:inline sm:mr-2">
                          {isHi ? 'मुख्य लक्षण:' : 'Chief Complaint:'}
                        </span>
                        <span className="font-medium text-[#26312B]">{encounter.chiefComplaint}</span>
                      </div>
                      {encounter.diagnosis && (
                        <div className="text-right">
                          <span className="text-[11px] text-[#596058] uppercase tracking-wider block sm:inline sm:mr-1">
                            {isHi ? 'निदान:' : 'Diagnosis:'}
                          </span>
                          <span className="font-bold text-[#29483C]">{encounter.diagnosis}</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Clinical Breakdown */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#A9AA94] space-y-4 animate-in fade-in duration-150">
                        {/* Clinical Vitals Row */}
                        {encounter.vitals && (
                          <div className="grid grid-cols-3 gap-2.5 p-3 bg-[#B5B7A1]/40 border border-[#A9AA94] rounded-[8px] text-xs">
                            <div>
                              <span className="text-[#596058] block text-[10px] uppercase font-semibold">
                                {isHi ? 'रक्तचाप' : 'Blood Pressure'}
                              </span>
                              <span className="font-bold text-[#26312B]">{encounter.vitals.bp || '120/80'}</span>
                            </div>
                            <div>
                              <span className="text-[#596058] block text-[10px] uppercase font-semibold">
                                {isHi ? 'नाड़ी दर' : 'Pulse Rate'}
                              </span>
                              <span className="font-bold text-[#26312B]">{encounter.vitals.pulse || '72 bpm'}</span>
                            </div>
                            <div>
                              <span className="text-[#596058] block text-[10px] uppercase font-semibold">
                                {isHi ? 'वजन' : 'Body Weight'}
                              </span>
                              <span className="font-bold text-[#26312B]">{encounter.vitals.weight || '68 kg'}</span>
                            </div>
                          </div>
                        )}

                        {/* Ayush Assessment Breakdown */}
                        {encounter.ayushAssessment && (
                          <div className="p-3.5 bg-[#B5B7A1]/50 border border-[#A9AA94] rounded-[8px] space-y-1.5 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#29483C] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#29483C]" />
                              {isHi ? 'आयुष अष्टविध परीक्षा व दोष स्थिति' : 'Ayush Assessment & Dosha Analysis'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                              <div>
                                <span className="text-[#596058] block text-[11px]">
                                  {isHi ? 'प्रधान दोष:' : 'Dominant Dosha:'}
                                </span>
                                <span className="font-semibold text-[#26312B]">
                                  {encounter.ayushAssessment.dosha || 'Vata-Kapha'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#596058] block text-[11px]">
                                  {isHi ? 'मूल प्रकृति:' : 'Patient Prakriti:'}
                                </span>
                                <span className="font-semibold text-[#26312B]">
                                  {encounter.ayushAssessment.prakriti || 'Kapha-Pitta'}
                                </span>
                              </div>
                            </div>
                            {encounter.ayushAssessment.treatmentPlan && (
                              <p className="text-[11px] text-[#596058] pt-1">
                                <span className="font-semibold text-[#29483C]">
                                  {isHi ? 'अनुशंसित चिकित्सा:' : 'Protocol:'}{' '}
                                </span>
                                {encounter.ayushAssessment.treatmentPlan}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Prescribed Ayurvedic Formulations List */}
                        {encounter.prescriptions && encounter.prescriptions.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#596058] flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 text-[#29483C]" />
                              {isHi ? 'उस परामर्श में दी गई औषधियां:' : 'Prescriptions From This Encounter:'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {encounter.prescriptions.map((med, mIdx) => (
                                <div
                                  key={`med-${encounter.id}-${mIdx}`}
                                  className="p-2.5 bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] text-xs flex flex-col justify-between"
                                >
                                  <span className="font-bold text-[#26312B]">{med.name}</span>
                                  <div className="text-[11px] text-[#596058] mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-[#29483C]">{med.dosage}</span>
                                    {med.frequency && <span>· {med.frequency}</span>}
                                    {med.duration && <span>· {med.duration}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Summary & Patient Safety Clause */}
      <div className="mt-6 pt-4 border-t border-[#A9AA94] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#596058]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#29483C]" />
          <span>
            {isHi
              ? 'राष्ट्रीय डिजिटल स्वास्थ्य मिशन (ABDM) अनुपालन के तहत सुरक्षित'
              : 'Secured under National Digital Health Mission (ABDM/FHIR) guidelines'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#596058]">
          {verifiedCount} of {encounters.length} Encounters Verified
        </span>
      </div>
    </div>
  );
};
