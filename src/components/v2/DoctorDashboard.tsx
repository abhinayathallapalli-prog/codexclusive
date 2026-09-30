import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  Edit3,
  FileText,
  Clock,
  User,
  Filter,
  Eye,
  AlertTriangle,
  AlertCircle,
  Printer,
  Share2,
  Plus,
  Save,
  Check,
  Sparkles,
  Search,
  Building2,
  X,
  LogOut,
  RefreshCw,
  HardDrive,
  Mail,
  Calendar as CalendarIcon,
  MapPin,
} from 'lucide-react';
import {
  PatientProfile,
  ClinicalHistoryRecord,
  MedicalDocument,
} from '../../types';
import { TextEffect } from '@/components/core/text-effect';
import { SymptomConfidenceIndicator } from './SymptomConfidenceIndicator';

export interface DoctorQueueItem {
  caseId?: string;
  patient: PatientProfile;
  record: ClinicalHistoryRecord;
  tokenNumber: string;
  department: string;
  roomNumber: string;
  status: 'Waiting' | 'In Consultation' | 'Verified';
  registeredAt: string;
}

interface DoctorDashboardProps {
  queueList: DoctorQueueItem[];
  onUpdateRecord: (patientId: string, updatedRecord: Partial<ClinicalHistoryRecord>, tokenOrCaseId?: string) => void;
  onVerifyConsultation: (patientId: string, tokenOrCaseId?: string) => void;
  onBackToKiosk: () => void;
  onLogoutDoctor?: () => void;
  onRefresh?: () => void;
  onOpenWorkspaceModal?: (tab?: 'drive' | 'gmail' | 'calendar') => void;
  onOpenSearchModal?: () => void;
  onOpenMapsModal?: () => void;
  onOpenChatModal?: (role?: 'complex' | 'general' | 'fast') => void;
  doctorUser?: {
    name?: string;
    doctorId?: string;
    specialization?: string;
    opdRoom?: string;
  } | null;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  queueList,
  onUpdateRecord,
  onVerifyConsultation,
  onBackToKiosk,
  onLogoutDoctor,
  onRefresh,
  onOpenWorkspaceModal,
  onOpenSearchModal,
  onOpenMapsModal,
  onOpenChatModal,
  doctorUser,
}) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');
  
  const getEncounterKey = (item?: DoctorQueueItem | null) => {
    if (!item) return '';
    return item.caseId || `${item.tokenNumber}-${item.patient.id}`;
  };

  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(() =>
    queueList[0] ? getEncounterKey(queueList[0]) : ''
  );
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<MedicalDocument | null>(null);

  // Departments for tab filtering
  const departments = [
    'All',
    'Kayachikitsa',
    'Panchakarma',
    'Shalya Tantra',
    'Shalakya Tantra',
    'Prasuti & Stri Roga',
    'Other',
  ];

  const filteredQueue = queueList.filter((item) => {
    if (selectedDeptFilter === 'All') return true;
    return item.department.toLowerCase().includes(selectedDeptFilter.toLowerCase());
  });

  // Keep selected encounter valid across list updates
  useEffect(() => {
    if (queueList.length > 0) {
      const exists = queueList.some((item) => getEncounterKey(item) === selectedEncounterId);
      if (!exists) {
        setSelectedEncounterId(getEncounterKey(queueList[0]));
      }
    } else {
      setSelectedEncounterId('');
    }
  }, [queueList, selectedEncounterId]);

  const activeItem = queueList.find((item) => getEncounterKey(item) === selectedEncounterId) || queueList[0];
  const activeRecord = activeItem?.record;
  const activePatient = activeItem?.patient;

  // Local draft state for editing clinical notes
  const [editedComplaint, setEditedComplaint] = useState('');
  const [editedPhysicianNotes, setEditedPhysicianNotes] = useState('');
  const [editedPrescription, setEditedPrescription] = useState('');

  // Sync draft state whenever active patient changes
  useEffect(() => {
    if (activeItem) {
      setEditedComplaint(activeRecord?.chiefComplaint || activePatient?.chiefComplaint || '');
      setEditedPhysicianNotes(activeRecord?.physicianNotes || '');
      const meds = activeRecord?.currentMedications?.map((m) => `${m.name} (${m.dosage})`).join('\n') || '';
      setEditedPrescription(meds);
    } else {
      setEditedComplaint('');
      setEditedPhysicianNotes('');
      setEditedPrescription('');
    }
  }, [activePatient?.id, activeRecord, activeItem?.tokenNumber]);

  const handleSaveEdits = () => {
    if (!activePatient || !activeItem) return;
    onUpdateRecord(
      activePatient.id,
      {
        chiefComplaint: editedComplaint,
        physicianNotes: editedPhysicianNotes,
      },
      activeItem.caseId || activeItem.tokenNumber
    );
    setIsEditMode(false);
  };

  const handleOpenDocModal = (doc: MedicalDocument) => {
    setSelectedDocPreview(doc);
    setShowDocModal(true);
  };

  const doctorName = doctorUser?.name || 'Dr. Ananya Sharma';
  const doctorId = doctorUser?.doctorId || 'DOC-AYU-001';
  const doctorSpec = doctorUser?.specialization || 'Kayachikitsa (Internal Medicine & Panchakarma)';
  const opdRoom = doctorUser?.opdRoom || '12';

  return (
    <div id="doctor-workstation-container" className="min-h-screen bg-[#C9C5AF] bg-ayur-botanical-subtle text-[#29483C] font-sans pb-12">
      {/* Top Clinical Navigation Bar: #29483C with #29483C accents */}
      <div className="bg-[#29483C] text-white px-4 sm:px-6 py-3.5 border-b border-[#29483C]/30 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md shadow-[#29483C]/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#29483C] text-white flex items-center justify-center font-black shrink-0 shadow-xs">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white">MediKiosk EMR • Doctor Workstation</h2>
              <span className="text-[10px] font-black uppercase bg-[#B5B7A1] text-[#29483C] px-2 py-0.5 rounded border border-[#29483C]/40">
                OPD Clinical Desk
              </span>
            </div>
            <p className="text-xs text-[#B5B7A1]/90 font-mono">
              {doctorName} ({doctorId}) • {doctorSpec} • OPD Room {opdRoom}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenChatModal && (
            <button
              type="button"
              onClick={() => onOpenChatModal('complex')}
              title="Gemini Clinical Diagnostic Specialist (gemini-3.1-pro-preview)"
              className="px-3 py-2 bg-[#E3DDCA]/10 hover:bg-[#E3DDCA]/20 text-white text-xs font-bold rounded-xl border border-white/20 cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B5B7A1]" />
              <span>AI Specialist</span>
            </button>
          )}

          {onOpenSearchModal && (
            <button
              type="button"
              onClick={onOpenSearchModal}
              title="Verified Medical Evidence & Public Health Search (gemini-3.5-flash • googleSearch)"
              className="px-3 py-2 bg-[#E3DDCA]/10 hover:bg-[#E3DDCA]/20 text-white text-xs font-bold rounded-xl border border-white/20 cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-[#B5B7A1]" />
              <span>Evidence Search</span>
            </button>
          )}

          {onOpenMapsModal && (
            <button
              type="button"
              onClick={onOpenMapsModal}
              title="Nearby Facilities & Ayush Centers Locator (gemini-3.5-flash • googleMaps)"
              className="px-3 py-2 bg-[#E3DDCA]/10 hover:bg-[#E3DDCA]/20 text-white text-xs font-bold rounded-xl border border-white/20 cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#B5B7A1]" />
              <span>Maps</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Patient Queue"
              className="p-2 rounded-xl bg-[#E3DDCA]/10 hover:bg-[#E3DDCA]/20 text-white border border-white/20 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-[#B5B7A1]" />
            </button>
          )}

          {onOpenWorkspaceModal && (
            <button
              type="button"
              onClick={() => onOpenWorkspaceModal('drive')}
              className="px-3.5 py-2 bg-[#E3DDCA]/10 hover:bg-[#E3DDCA]/20 text-white text-xs font-bold rounded-xl border border-white/20 cursor-pointer transition-all flex items-center gap-1.5"
              title="Google Workspace Suite: Drive, Gmail, Calendar"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#B5B7A1]" />
              <span>Google Workspace</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToKiosk}
            className="px-3.5 py-2 bg-[#29483C] hover:bg-[#29483C] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span>Switch to Kiosk Terminal</span>
          </button>

          {onLogoutDoctor && (
            <button
              type="button"
              onClick={onLogoutDoctor}
              title="Sign Out Doctor"
              className="px-3 py-2 bg-[#29483C]/40 hover:bg-[#A9AA94]/40 text-[#29483C] text-xs font-bold rounded-xl border border-[#29483C]/50 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Clinical Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Department Queue List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Department Filter Tabs */}
          <div className="bg-[#E3DDCA] rounded-[10px] p-4 border border-[#A9AA94] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#29483C]">
                <Filter className="w-3.5 h-3.5 text-[#29483C]" />
                <span>Department Queue</span>
              </div>
              <span className="text-xs font-mono font-bold bg-[#B5B7A1] text-[#29483C] px-2 py-0.5 rounded-full border border-[#29483C]/40">
                {filteredQueue.length} {filteredQueue.length === 1 ? 'Patient' : 'Patients'}
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDeptFilter === dept
                      ? 'bg-[#29483C] text-white shadow-xs'
                      : 'bg-[#C9C5AF] text-[#29483C] hover:bg-[#A9AA94]/40 border border-[#A9AA94]'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Cards List */}
          <div className="bg-[#E3DDCA] rounded-[10px] border-2 border-[#A9AA94] shadow-xs divide-y divide-[#A9AA94]/60 overflow-hidden">
            <div className="p-3.5 bg-[#C9C5AF] text-xs font-black uppercase tracking-wider text-[#29483C] flex items-center justify-between border-b border-[#A9AA94]">
              <span>Waiting Patients</span>
              <span className="text-[11px] font-normal text-[#29483C]/70">Tap to inspect</span>
            </div>

            {queueList.length === 0 ? (
              <div id="no-registered-patients" className="p-8 text-center text-[#29483C]/60 text-sm">
                <User className="w-8 h-8 mx-auto mb-2 text-[#29483C]/40 stroke-[1.5]" />
                <p className="font-bold text-[#29483C]">No registered patients yet.</p>
                <p className="text-xs text-[#29483C]/60 mt-0.5">
                  Patients will appear here once registered at the Kiosk.
                </p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-[#29483C]/60 text-sm">
                No patients in this department queue
              </div>
            ) : (
              filteredQueue.map((item, idx) => {
                const itemKey = getEncounterKey(item);
                const isSelected = activeItem ? getEncounterKey(activeItem) === itemKey : false;
                const uniqueElementKey = `queue-${item.tokenNumber}-${item.caseId || item.patient.id}-${idx}`;
                return (
                  <button
                    key={uniqueElementKey}
                    id={`queue-item-${item.tokenNumber}`}
                    type="button"
                    onClick={() => {
                      setSelectedEncounterId(itemKey);
                      setIsEditMode(false);
                    }}
                    className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#B5B7A1]/50 border-l-4 border-[#29483C]'
                        : 'hover:bg-[#C9C5AF]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#29483C] text-[#B5B7A1] font-mono font-black text-sm flex items-center justify-center shrink-0">
                        {item.tokenNumber}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#29483C] flex items-center gap-2">
                          <span>{item.patient.name}</span>
                          <span className="text-xs font-medium text-[#29483C]/70">
                            ({item.patient.age}y / {item.patient.gender[0].toUpperCase()})
                          </span>
                        </h4>
                        <p className="text-xs text-[#29483C]/80 font-medium line-clamp-1 mt-0.5">
                          {item.patient.chiefComplaint || 'Clinical Consultation'}
                        </p>
                        <p className="text-[11px] text-[#29483C] font-semibold font-mono">
                          {item.department} • {item.registeredAt}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.status === 'Verified'
                            ? 'bg-[#B5B7A1] text-[#29483C] border border-[#29483C]/30'
                            : item.status === 'In Consultation'
                            ? 'bg-[#A9AA94] text-[#29483C]'
                            : 'bg-[#C9C5AF] text-[#29483C] border border-[#A9AA94]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Structured Clinical Summary (8 cols) */}
        {activePatient && activeRecord ? (
          <div className="lg:col-span-8 space-y-4">
            {/* Top Patient Clinical Banner */}
            <div className="bg-[#E3DDCA] rounded-[10px] p-5 border-2 border-[#A9AA94] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[10px] bg-[#29483C] text-white font-mono font-black text-xl flex items-center justify-center shadow-sm shadow-[#29483C]/20 shrink-0">
                  {activeItem.tokenNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-black text-[#29483C]">{activePatient.name}</h3>
                    <span className="text-xs font-bold bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] px-2 py-0.5 rounded-md font-mono">
                      {activePatient.age} YRS • {activePatient.gender.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-[#29483C]/70 font-mono mt-0.5">
                    Patient ID: {activePatient.id} • Mobile: {activePatient.phone || 'N/A'} • Room {activeItem.roomNumber}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Edit & Verify */}
              <div className="flex items-center gap-2">
                {/* View Original Documents Button */}
                {activeRecord.documents && activeRecord.documents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenDocModal(activeRecord.documents![0])}
                    className="px-3.5 py-2 bg-[#C9C5AF] hover:bg-[#A9AA94]/40 text-[#29483C] font-bold text-xs rounded-xl border border-[#29483C]/30 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Eye className="w-4 h-4 text-[#29483C]" />
                    <span>View Documents ({activeRecord.documents.length})</span>
                  </button>
                )}

                {/* Edit Summary Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isEditMode) {
                      handleSaveEdits();
                    } else {
                      setIsEditMode(true);
                    }
                  }}
                  className={`px-3.5 py-2 font-bold text-xs rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                    isEditMode
                      ? 'bg-[#29483C] text-white border-[#29483C]'
                      : 'bg-[#E3DDCA] text-[#29483C] border-[#29483C]/30 hover:bg-[#A9AA94]/30'
                  }`}
                >
                  {isEditMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4 text-[#29483C]" />}
                  <span>{isEditMode ? 'Save Clinical Notes' : 'Edit Notes'}</span>
                </button>

                {/* Verify Consultation Button */}
                <button
                  type="button"
                  onClick={() => onVerifyConsultation(activePatient.id, activeItem?.caseId || activeItem?.tokenNumber)}
                  disabled={activeItem.status === 'Verified'}
                  className={`px-4 py-2 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                    activeItem.status === 'Verified'
                      ? 'bg-[#B5B7A1] text-[#29483C] border-2 border-[#29483C]'
                      : 'bg-[#29483C] hover:bg-[#29483C] active:scale-95 text-white shadow-md shadow-[#29483C]/20'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{activeItem.status === 'Verified' ? 'Consultation Verified' : 'Verify & Complete'}</span>
                </button>
              </div>

              {/* Doctor Workspace Quick Actions */}
              {onOpenWorkspaceModal && (
                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#A9AA94] w-full">
                  <span className="text-[11px] font-bold text-[#29483C]/70 uppercase tracking-wider mr-1">
                    Workspace Actions:
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenWorkspaceModal('drive')}
                    className="px-2.5 py-1.5 text-xs font-semibold text-[#29483C] bg-[#C9C5AF] hover:bg-[#A9AA94]/40 rounded-lg border border-[#A9AA94] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-[#29483C]" />
                    <span>Save to Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenWorkspaceModal('gmail')}
                    className="px-2.5 py-1.5 text-xs font-semibold text-[#29483C] bg-[#C9C5AF] hover:bg-[#A9AA94]/40 rounded-lg border border-[#A9AA94] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#29483C]" />
                    <span>Email Rx (Gmail)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenWorkspaceModal('calendar')}
                    className="px-2.5 py-1.5 text-xs font-semibold text-[#29483C] bg-[#C9C5AF] hover:bg-[#A9AA94]/40 rounded-lg border border-[#A9AA94] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-[#29483C]" />
                    <span>Schedule Follow-up (Calendar)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Clinical Overview Card */}
            <div className="bg-[#E3DDCA] rounded-[10px] p-6 border-2 border-[#A9AA94] shadow-xs space-y-6">
              {/* Section 1: Chief Complaint & HPI */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#29483C] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#29483C]"></span>
                    <span>Chief Complaint & Intake Details</span>
                  </h4>
                  <SymptomConfidenceIndicator
                    confidenceLevel={activePatient.routingConfidence}
                    confidenceScore={activePatient.confidenceScore}
                    confidenceRationale={activePatient.confidenceRationale}
                    confidenceFactors={activePatient.confidenceFactors}
                    extractedHistory={{
                      chiefComplaint: activeRecord.chiefComplaint || activePatient.chiefComplaint,
                      duration: activeRecord.durationOfComplaint || activeRecord.hpi?.onset,
                      location: activeRecord.hpi?.site || activePatient.anatomicalLocation,
                    }}
                    departmentName={activePatient.department}
                    departmentBranch={activePatient.departmentBranch}
                    size="sm"
                  />
                </div>
                {isEditMode ? (
                  <textarea
                    value={editedComplaint}
                    onChange={(e) => setEditedComplaint(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl border-2 border-[#A9AA94] text-sm font-sans focus:outline-none focus:border-[#29483C] focus:ring-2 focus:ring-[#29483C]/20 text-[#29483C]"
                  />
                ) : (
                  <div className="bg-[#C9C5AF] rounded-xl p-4 border border-[#A9AA94]">
                    <p className="text-base font-bold text-[#29483C]">
                      {activeRecord.chiefComplaint || activePatient.chiefComplaint || 'General Clinical Consultation'}
                    </p>
                    {(activeRecord.durationOfComplaint || activeRecord.hpi?.onset) && (
                      <p className="text-xs text-[#29483C]/80 font-medium mt-1">
                        Duration: {activeRecord.durationOfComplaint || activeRecord.hpi?.onset}
                      </p>
                    )}
                    {activeRecord.hpi?.site && (
                      <p className="text-xs text-[#29483C]/80 font-medium">
                        Location: {activeRecord.hpi.site}
                      </p>
                    )}
                    {activePatient.departmentBranch && (
                      <p className="text-xs font-bold text-[#29483C] mt-1">
                        Assigned Branch: {activePatient.departmentBranch.replace(/_/g, ' ')}
                      </p>
                    )}
                    {activeRecord.hpi?.exacerbatingFactors && (
                      <p className="text-xs text-[#29483C]/80 font-medium">
                        Aggravating Factors: {activeRecord.hpi.exacerbatingFactors}
                      </p>
                    )}

                    {/* Section 1b: Documented Severity Rating */}
                    {(() => {
                      const severityData =
                        activeRecord.severityRating ||
                        activePatient.severityRating ||
                        (typeof activeRecord.hpi?.severity === 'number' && activeRecord.hpi.severity > 0
                          ? {
                              symptom: activeRecord.chiefComplaint || activePatient.chiefComplaint || 'Pain',
                              location: activeRecord.hpi?.site || activePatient.anatomicalLocation,
                              severity: activeRecord.hpi.severity,
                              severityScale: '0-10' as const,
                              severityLabel:
                                activeRecord.hpi.severity >= 7
                                  ? 'Severe'
                                  : activeRecord.hpi.severity >= 4
                                  ? 'Moderate'
                                  : 'Mild',
                            }
                          : null);

                      if (!severityData) return null;

                      const maxVal = severityData.severityScale === '0-4' ? 4 : 10;
                      const isHigh = severityData.severity >= (maxVal === 4 ? 3 : 7);
                      const isMod = severityData.severity >= (maxVal === 4 ? 2 : 4);

                      return (
                        <div className="mt-3 p-3.5 bg-[#E3DDCA] border border-[#A9AA94] rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between gap-2 border-b border-[#A9AA94]/60 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#29483C]" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#29483C]">
                                Documented Severity Assessment
                              </span>
                            </div>
                            <span className="text-[10px] text-[#29483C]/60 font-medium">Intake documentation only</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-2 bg-[#C9C5AF] rounded-lg border border-[#A9AA94]">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#29483C]/70 block mb-0.5">
                                SYMPTOM
                              </span>
                              <span className="font-extrabold text-[#29483C] block truncate">
                                {severityData.symptom}
                              </span>
                            </div>

                            <div className="p-2 bg-[#C9C5AF] rounded-lg border border-[#A9AA94]">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#29483C]/70 block mb-0.5">
                                LOCATION
                              </span>
                              <span className="font-extrabold text-[#29483C] block truncate">
                                {severityData.location || 'General'}
                              </span>
                            </div>

                            <div className="p-2 bg-[#B5B7A1] rounded-lg border border-[#A9AA94]">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#29483C]/70 block mb-0.5">
                                SEVERITY
                              </span>
                              <span className="font-extrabold text-[#29483C] block">
                                {severityData.severity} / {maxVal} — {severityData.severityLabel}
                              </span>
                            </div>
                          </div>

                          {/* Compact visual severity indicator using approved palette */}
                          <div className="space-y-1">
                            <div className="w-full bg-[#C9C5AF] border border-[#A9AA94] rounded-full h-2 overflow-hidden flex">
                              <div
                                className="h-full rounded-full transition-all duration-300 bg-[#29483C]"
                                style={{ width: `${Math.min(100, (severityData.severity / maxVal) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-[#29483C]/60 font-medium">
                              <span>0 (None)</span>
                              <span>Scale: {severityData.severityScale}</span>
                              <span>{maxVal} (Max)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Section 2: Clinical Intake History & Medications */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Current Medications */}
                <div className="p-3.5 bg-[#C9C5AF] rounded-xl border border-[#A9AA94] space-y-1.5">
                  <span className="font-bold text-[#29483C] block uppercase tracking-wider text-[11px]">
                    Current Medications:
                  </span>
                  {activeRecord.currentMedications && activeRecord.currentMedications.length > 0 ? (
                    <ul className="space-y-1 pl-3.5 list-disc text-[#29483C] font-medium">
                      {activeRecord.currentMedications.map((m: any, idx: number) => (
                        <li key={idx}>
                          {typeof m === 'string' ? m : `${m.name} ${m.dosage || ''}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#29483C]/50 italic">None reported</span>
                  )}
                </div>

                {/* Past Medical History */}
                <div className="p-3.5 bg-[#C9C5AF] rounded-xl border border-[#A9AA94] space-y-1.5">
                  <span className="font-bold text-[#29483C] block uppercase tracking-wider text-[11px]">
                    Past Medical History:
                  </span>
                  {activeRecord.pastMedicalHistory && activeRecord.pastMedicalHistory.length > 0 ? (
                    <ul className="space-y-1 pl-3.5 list-disc text-[#29483C] font-medium">
                      {activeRecord.pastMedicalHistory.map((h: string, idx: number) => (
                        <li key={idx}>{h}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#29483C]/50 italic">None reported</span>
                  )}
                </div>

                {/* Family History */}
                <div className="p-3.5 bg-[#C9C5AF] rounded-xl border border-[#A9AA94] space-y-1.5">
                  <span className="font-bold text-[#29483C] block uppercase tracking-wider text-[11px]">
                    Family History:
                  </span>
                  {activeRecord.familyHistory && activeRecord.familyHistory.length > 0 ? (
                    <ul className="space-y-1 pl-3.5 list-disc text-[#29483C] font-medium">
                      {activeRecord.familyHistory.map((f: string, idx: number) => (
                        <li key={idx}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#29483C]/50 italic">No significant hereditary conditions</span>
                  )}
                </div>
              </div>

              {/* Red Flag Warning if present */}
              {activeRecord.redFlags && activeRecord.redFlags.length > 0 && (
                <div className="p-3.5 bg-[#C9C5AF] border border-[#A9AA94] rounded-xl flex items-center gap-2.5 text-xs text-[#29483C] font-bold">
                  <AlertCircle className="w-5 h-5 text-[#29483C] shrink-0" />
                  <span>Red Flag Alert: {activeRecord.redFlags.join(', ')}</span>
                </div>
              )}

              {/* Section 2: Patient's Questionnaire Responses */}
              {activeRecord.personalHistory && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#29483C] mb-2">
                    Intake Information & Lifestyle
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#C9C5AF] rounded-xl border border-[#A9AA94]">
                      <span className="font-bold text-[#29483C] block mb-1">Diet / Ahar:</span>
                      <span className="text-[#29483C]/80">{activeRecord.personalHistory.diet || 'Standard'}</span>
                    </div>
                    <div className="p-3 bg-[#C9C5AF] rounded-xl border border-[#A9AA94]">
                      <span className="font-bold text-[#29483C] block mb-1">Physical Activity / Vihara:</span>
                      <span className="text-[#29483C]/80">{activeRecord.personalHistory.physicalActivity || 'Moderate'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Physician Clinical Notes & Recommendations */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#29483C] mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#29483C]"></span>
                  <span>Doctor Notes & Clinical Impression</span>
                </h4>
                {isEditMode ? (
                  <textarea
                    value={editedPhysicianNotes}
                    onChange={(e) => setEditedPhysicianNotes(e.target.value)}
                    rows={4}
                    placeholder="Enter clinical examination notes, diagnostic impression, and lifestyle recommendations..."
                    className="w-full p-3 rounded-xl border-2 border-[#A9AA94] text-sm font-sans focus:outline-none focus:border-[#29483C] focus:ring-2 focus:ring-[#29483C]/20 text-[#29483C]"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-[#C9C5AF] border border-[#A9AA94] text-sm text-[#29483C] min-h-[80px]">
                    {editedPhysicianNotes || activeRecord.physicianNotes ? (
                      <p className="whitespace-pre-line">{editedPhysicianNotes || activeRecord.physicianNotes}</p>
                    ) : (
                      <p className="text-[#29483C]/50 italic">
                        No physician notes recorded yet. Click "Edit Notes" to enter consultation findings.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Attached Medical Documents */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#29483C] mb-2">
                  Uploaded Documents & Reports
                </h4>
                {activeRecord.documents && activeRecord.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeRecord.documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleOpenDocModal(doc)}
                        className="p-3 bg-[#C9C5AF] hover:bg-[#A9AA94]/40 rounded-xl border border-[#A9AA94] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-5 h-5 text-[#29483C] shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-[#29483C] line-clamp-1">{doc.name}</p>
                            <p className="text-[11px] text-[#29483C]/60">{doc.documentType} • {doc.date}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#29483C] bg-[#B5B7A1] border border-[#A9AA94] px-2 py-0.5 rounded">
                          View
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#C9C5AF] border border-[#A9AA94] text-xs text-[#29483C]/50 text-center">
                    No documents uploaded for this consultation.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty Case Workspace when no patient is in queue */
          <div
            id="no-pending-cases"
            className="lg:col-span-8 bg-[#E3DDCA] rounded-[10px] p-12 border-2 border-[#A9AA94] shadow-xs text-center flex flex-col items-center justify-center min-h-[480px]"
          >
            <div className="w-16 h-16 rounded-[10px] bg-[#C9C5AF] text-[#29483C] flex items-center justify-center mb-4 border border-[#A9AA94]">
              <FileText className="w-8 h-8 stroke-[1.5]" />
            </div>
            <TextEffect
              per="word"
              as="h3"
              preset="slide"
              className="text-lg font-black text-[#29483C]"
            >
              No pending patient cases.
            </TextEffect>
            <p className="text-sm text-[#29483C]/70 max-w-md mt-1">
              As patients register at the MediKiosk terminal and submit their clinical intake histories, their cases will appear in this real-time queue.
            </p>
            <button
              type="button"
              onClick={onBackToKiosk}
              className="mt-6 px-5 py-2.5 bg-[#29483C] hover:bg-[#29483C] active:scale-95 text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-[#29483C]/20 transition-all"
            >
              Open MediKiosk Intake Terminal
            </button>
          </div>
        )}
      </div>

      {/* Modal: View Original Documents */}
      {showDocModal && selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-[#29483C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#E3DDCA] rounded-[10px] max-w-2xl w-full p-6 shadow-2xl border-2 border-[#A9AA94] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#A9AA94] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#B5B7A1] text-[#29483C] flex items-center justify-center font-bold border border-[#A9AA94]">
                  <FileText className="w-5 h-5 text-[#29483C]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#29483C]">
                    {selectedDocPreview.name}
                  </h3>
                  <p className="text-xs text-[#29483C]/60 font-mono">
                    {selectedDocPreview.documentType} • Date: {selectedDocPreview.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="p-2 text-[#29483C]/60 hover:text-[#29483C] hover:bg-[#C9C5AF] rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDocPreview.extractedText && (
              <div className="bg-[#C9C5AF] rounded-xl p-3 border border-[#A9AA94] text-xs text-[#29483C] mb-4">
                <span className="font-bold block mb-1">OCR Extracted Text:</span>
                <p className="font-mono text-xs text-[#29483C]/80 whitespace-pre-wrap">
                  {selectedDocPreview.extractedText}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-5 py-2.5 bg-[#29483C] hover:bg-[#29483C] text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
