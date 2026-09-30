import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  HardDrive,
  Mail,
  Calendar as CalendarIcon,
  RefreshCw,
  Search,
  UploadCloud,
  FileText,
  ExternalLink,
  Trash2,
  Send,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Plus,
  ShieldCheck,
  LogOut,
  FolderOpen,
  Clock,
  User,
  Sparkles,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import {
  getCachedAccessToken,
  signInWithGoogleWorkspace,
  listDriveFiles,
  uploadFileToDrive,
  deleteDriveFile,
  fetchDriveFileBlob,
  DriveFileItem,
  listGmailMessages,
  sendGmailMessage,
  GmailMessageSummary,
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  CalendarEventItem,
  getCurrentGoogleUser,
} from '../lib/googleWorkspace';
import {
  WorkspaceConfirmationModal,
  ConfirmationConfig,
} from './WorkspaceConfirmationModal';
import { PatientProfile, MedicalDocument, UserAccount } from '../types';
import { StoredInterviewData } from '../utils/kioskStorage';

interface GoogleWorkspaceHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientProfile;
  interviewData?: StoredInterviewData;
  aiSummaryText?: string;
  onImportDocumentToKiosk?: (doc: MedicalDocument) => void;
  onAuthSuccess?: (user: UserAccount) => void;
  initialTab?: 'drive' | 'gmail' | 'calendar';
}

export const GoogleWorkspaceHubModal: React.FC<GoogleWorkspaceHubModalProps> = ({
  isOpen,
  onClose,
  patient,
  interviewData,
  aiSummaryText,
  onImportDocumentToKiosk,
  onAuthSuccess,
  initialTab = 'drive',
}) => {
  const [activeTab, setActiveTab] = useState<'drive' | 'gmail' | 'calendar'>(initialTab);
  const [accessToken, setAccessToken] = useState<string | null>(() => getCachedAccessToken());
  const [googleUser, setGoogleUser] = useState<any | null>(() => getCurrentGoogleUser());
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  // Gmail state
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(patient.phone ? `${patient.phone}@gmail.com` : '');
  const [emailSubject, setEmailSubject] = useState(`MediKiosk OPD Case Sheet - ${patient.name || 'Patient'} (Token #${patient.tokenNumber || '101'})`);
  const [emailCustomNote, setEmailCustomNote] = useState('');

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [followupDate, setFollowupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [followupTime, setFollowupTime] = useState('10:00');

  // Confirmation modal state
  const [confirmationConfig, setConfirmationConfig] = useState<ConfirmationConfig | null>(null);
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

  // Status banners
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Sync token on open or change
  useEffect(() => {
    if (isOpen) {
      const token = getCachedAccessToken();
      setAccessToken(token);
      setGoogleUser(getCurrentGoogleUser());
      setStatusSuccess(null);
      setStatusError(null);
    }
  }, [isOpen]);

  // Fetch Drive files
  const loadDriveFiles = useCallback(async (token: string, search?: string) => {
    setIsLoadingDrive(true);
    setStatusError(null);
    try {
      const files = await listDriveFiles(token, { query: search, pageSize: 20 });
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Error listing Drive files:', err);
      setStatusError(err.message || 'Failed to list Google Drive files');
    } finally {
      setIsLoadingDrive(false);
    }
  }, []);

  // Fetch Gmail messages
  const loadGmailMessages = useCallback(async (token: string) => {
    setIsLoadingGmail(true);
    setStatusError(null);
    try {
      const msgs = await listGmailMessages(token, { maxResults: 10 });
      setGmailMessages(msgs);
    } catch (err: any) {
      console.error('Error fetching Gmail messages:', err);
      setStatusError(err.message || 'Failed to fetch Gmail messages');
    } finally {
      setIsLoadingGmail(false);
    }
  }, []);

  // Fetch Calendar events
  const loadCalendarEvents = useCallback(async (token: string) => {
    setIsLoadingCalendar(true);
    setStatusError(null);
    try {
      const events = await listCalendarEvents(token, { maxResults: 15 });
      setCalendarEvents(events);
    } catch (err: any) {
      console.error('Error fetching Calendar events:', err);
      setStatusError(err.message || 'Failed to fetch Google Calendar appointments');
    } finally {
      setIsLoadingCalendar(false);
    }
  }, []);

  // Trigger loads when tab changes or token is present
  useEffect(() => {
    if (!isOpen || !accessToken) return;
    if (activeTab === 'drive') {
      loadDriveFiles(accessToken, driveSearchQuery);
    } else if (activeTab === 'gmail') {
      loadGmailMessages(accessToken);
    } else if (activeTab === 'calendar') {
      loadCalendarEvents(accessToken);
    }
  }, [isOpen, activeTab, accessToken, loadDriveFiles, loadGmailMessages, loadCalendarEvents]);

  if (!isOpen) return null;

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setStatusError(null);
    try {
      const result = await signInWithGoogleWorkspace();
      setAccessToken(result.accessToken);
      setGoogleUser(result.user);
      setStatusSuccess(`Connected to Google Workspace as ${result.user.displayName || result.user.email}`);
      if (onAuthSuccess) {
        onAuthSuccess(result.userAccount);
      }
      if (activeTab === 'drive') loadDriveFiles(result.accessToken);
      if (activeTab === 'gmail') loadGmailMessages(result.accessToken);
      if (activeTab === 'calendar') loadCalendarEvents(result.accessToken);
    } catch (err: any) {
      // Check for user cancellation or closed popup
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.isCancelled ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // Normal user action - log as info only, no console.error or alarming alert banner
        console.info('Google Workspace sign-in popup was closed or cancelled by user.');
        setStatusError(null);
        return;
      }

      if (err?.code === 'auth/popup-blocked') {
        console.warn('Google Workspace sign-in popup was blocked by browser.');
        setStatusError('The sign-in popup was blocked by your browser. Please allow popups for this site or open the application in a new browser tab.');
        return;
      }

      console.error('Google Workspace sign in error:', err);
      setStatusError(err.message || 'Could not connect to Google Workspace');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 1. Google Drive: Upload Case Sheet
  const requestUploadCaseSheetToDrive = () => {
    if (!accessToken) return;
    const fileName = `MediKiosk_Clinical_Case_${patient.name || 'Patient'}_Token${patient.tokenNumber || '101'}.html`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MediKiosk OPD Clinical Record</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 40px; color: #29483C; line-height: 1.6; }
    .card { max-width: 760px; margin: 0 auto; border: 1px solid #A9AA94; border-radius: 16px; padding: 32px; background: #ffffff; box-shadow: 0 4px 12px rgba(9,93,126,0.06); }
    h1 { color: #29483C; margin-top: 0; font-size: 24px; border-bottom: 2px solid #29483C; padding-bottom: 12px; }
    .badge { display: inline-block; background: #B5B7A1; color: #29483C; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 13px; }
    .section-title { font-weight: bold; color: #29483C; margin-top: 20px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { padding: 8px 12px; border: 1px solid #A9AA94; font-size: 14px; }
    .label { font-weight: 600; background: #E3DDCA; width: 35%; color: #29483C; }
    .footer { margin-top: 32px; font-size: 12px; color: #29483C; text-align: center; border-top: 1px solid #A9AA94; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h1>MediKiosk Integrated OPD Intake Sheet</h1>
      <span class="badge">Token #${patient.tokenNumber || '101'}</span>
    </div>
    <p><strong>Date & Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
    <p><strong>Department:</strong> ${patient.department || 'Kayachikitsa (General Medicine)'} | Room: 102</p>

    <div class="section-title">Patient Demographics</div>
    <table>
      <tr><td class="label">Patient Name</td><td>${patient.name || 'Walk-in Patient'}</td></tr>
      <tr><td class="label">Age / Gender</td><td>${patient.age || 'N/A'} yrs / ${patient.gender || 'N/A'}</td></tr>
      <tr><td class="label">Contact Phone</td><td>${patient.phone || 'N/A'}</td></tr>
      <tr><td class="label">ABHA ID</td><td>${patient.abhaId || '91-8842-1940-5819'}</td></tr>
      <tr><td class="label">Triage Priority</td><td>${patient.triageCategory?.toUpperCase() || 'STANDARD OPD'}</td></tr>
    </table>

    <div class="section-title">Reported Clinical Symptoms</div>
    <table>
      <tr><td class="label">Chief Complaint</td><td>${interviewData?.chiefComplaint || 'Consultation requested'}</td></tr>
      <tr><td class="label">Duration</td><td>${interviewData?.duration || 'Not specified'}</td></tr>
      <tr><td class="label">Location</td><td>${interviewData?.location || 'Not specified'}</td></tr>
      <tr><td class="label">Triggers / Modifiers</td><td>${interviewData?.triggers || 'Not specified'}</td></tr>
      <tr><td class="label">Associated Symptoms</td><td>${interviewData?.associations || 'None reported'}</td></tr>
    </table>

    ${
      aiSummaryText
        ? `<div class="section-title">AI Clinical Summary for Attending Physician</div>
           <div style="background:#E3DDCA; border:1px solid #A9AA94; color:#29483C; padding:16px; border-radius:10px; font-size:13.5px; white-space:pre-wrap;">${aiSummaryText}</div>`
        : ''
    }

    <div class="footer">
      Generated automatically via MediKiosk AI Clinical History Platform • Stored securely in Google Drive
    </div>
  </div>
</body>
</html>
    `.trim();

    setConfirmationConfig({
      title: 'Upload Clinical Case Sheet to Google Drive?',
      description: `This will create and save the structured HTML medical intake sheet for ${patient.name || 'the patient'} directly in your Google Drive.`,
      targetDetail: fileName,
      actionType: 'upload_drive',
      confirmLabel: 'Upload to Drive',
      onConfirm: async () => {
        setIsConfirmProcessing(true);
        try {
          const uploaded = await uploadFileToDrive(accessToken, fileName, 'text/html', htmlContent);
          setStatusSuccess(`Successfully saved "${uploaded.name}" to Google Drive!`);
          loadDriveFiles(accessToken, driveSearchQuery);
        } catch (err: any) {
          setStatusError(err.message || 'Failed to upload document to Google Drive');
        } finally {
          setIsConfirmProcessing(false);
        }
      },
    });
  };

  // 2. Google Drive: Delete File (MANDATORY User Confirmation Dialog)
  const requestDeleteDriveFile = (file: DriveFileItem) => {
    if (!accessToken) return;
    setConfirmationConfig({
      title: `Delete file from Google Drive?`,
      description: `Are you sure you want to permanently delete "${file.name}" from your Google Drive? This action cannot be undone.`,
      targetDetail: `File Name: ${file.name} (ID: ${file.id})`,
      actionType: 'delete_drive',
      confirmLabel: 'Delete File',
      onConfirm: async () => {
        setIsConfirmProcessing(true);
        try {
          await deleteDriveFile(accessToken, file.id);
          setStatusSuccess(`Deleted "${file.name}" from Google Drive.`);
          loadDriveFiles(accessToken, driveSearchQuery);
        } catch (err: any) {
          setStatusError(err.message || 'Failed to delete file from Google Drive');
        } finally {
          setIsConfirmProcessing(false);
        }
      },
    });
  };

  // 3. Google Drive: Import File to Kiosk Documents
  const handleImportDriveFile = async (file: DriveFileItem) => {
    if (!accessToken || !onImportDocumentToKiosk) return;
    setStatusError(null);
    try {
      setStatusSuccess(`Importing "${file.name}" from Google Drive...`);
      const blob = await fetchDriveFileBlob(accessToken, file.id);
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const base64 = fileReader.result as string;
        const newDoc: MedicalDocument = {
          id: `drive-${file.id}`,
          name: file.name,
          documentType: file.name.toLowerCase().includes('lab')
            ? 'Lab Report'
            : file.name.toLowerCase().includes('rx') || file.name.toLowerCase().includes('presc')
            ? 'Prescription'
            : file.name.toLowerCase().includes('discharge')
            ? 'Discharge Summary'
            : file.name.toLowerCase().includes('xray') || file.name.toLowerCase().includes('scan')
            ? 'Radiology / X-Ray'
            : 'Prescription',
          date: new Date().toLocaleDateString('en-GB'),
          hospitalName: 'Google Drive Cloud',
          fileSize: file.size ? `${Math.round(parseInt(file.size) / 1024)} KB` : 'Cloud Doc',
          thumbnailUrl: base64,
          ocrStatus: 'completed',
          extractedText: `Imported from Google Drive: ${file.name}`,
          extractedDiagnoses: [],
          extractedMedications: [],
          extractedLabResults: [],
          notes: `Synchronized from Google Drive on ${new Date().toLocaleTimeString()}`,
          abnormalWarnings: [],
        };
        onImportDocumentToKiosk(newDoc);
        setStatusSuccess(`Successfully imported "${file.name}" into Kiosk Documents!`);
      };
      fileReader.readAsDataURL(blob);
    } catch (err: any) {
      console.error('Failed to import drive file:', err);
      setStatusError(err.message || 'Could not download file content from Google Drive');
    }
  };

  // 4. Gmail: Send Clinical Summary Email (MANDATORY User Confirmation Dialog)
  const requestSendGmailSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const recipient = emailRecipient.trim();
    if (!recipient || !recipient.includes('@')) {
      setStatusError('Please enter a valid recipient email address.');
      return;
    }

    const emailHtml = `
<div style="font-family:'Segoe UI', sans-serif; max-width:650px; margin:0 auto; padding:24px; border:1px solid #A9AA94; border-radius:12px;">
  <div style="background:#29483C; color:#ffffff; padding:18px; border-radius:8px; text-align:center;">
    <h2 style="margin:0; font-size:20px;">MediKiosk OPD Clinical Slip & Summary</h2>
    <p style="margin:6px 0 0 0; font-size:14px; opacity:0.9;">Token #${patient.tokenNumber || '101'} • ${patient.department || 'Kayachikitsa'}</p>
  </div>

  <div style="padding:16px 0;">
    <p style="color:#29483C;">Dear <strong>${patient.name || 'Patient'}</strong>,</p>
    <p style="color:#29483C;">Your hospital OPD intake has been successfully registered. Please find your consultation details below:</p>
    
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      <tr style="background:#E3DDCA;"><td style="padding:8px; font-weight:bold; border:1px solid #A9AA94; color:#29483C;">Patient Name</td><td style="padding:8px; border:1px solid #A9AA94; color:#29483C;">${patient.name || 'Patient'}</td></tr>
      <tr><td style="padding:8px; font-weight:bold; border:1px solid #A9AA94; color:#29483C;">Age & Gender</td><td style="padding:8px; border:1px solid #A9AA94; color:#29483C;">${patient.age || 'N/A'} yrs / ${patient.gender || 'N/A'}</td></tr>
      <tr style="background:#E3DDCA;"><td style="padding:8px; font-weight:bold; border:1px solid #A9AA94; color:#29483C;">OPD Token</td><td style="padding:8px; border:1px solid #A9AA94; font-weight:bold; color:#29483C;">#${patient.tokenNumber || '101'}</td></tr>
      <tr><td style="padding:8px; font-weight:bold; border:1px solid #A9AA94; color:#29483C;">Room Number</td><td style="padding:8px; border:1px solid #A9AA94; color:#29483C;">Room 102 (First Floor)</td></tr>
      <tr style="background:#E3DDCA;"><td style="padding:8px; font-weight:bold; border:1px solid #A9AA94; color:#29483C;">Chief Complaint</td><td style="padding:8px; border:1px solid #A9AA94; color:#29483C;">${interviewData?.chiefComplaint || 'Consultation'}</td></tr>
      <tr><td style="padding:8px; font-weight:bold; border:1px solid #A9AA94; color:#29483C;">Duration</td><td style="padding:8px; border:1px solid #A9AA94; color:#29483C;">${interviewData?.duration || 'Not specified'}</td></tr>
    </table>

    ${
      emailCustomNote
        ? `<div style="background:#A9AA94; border-left:4px solid #29483C; padding:12px; margin:16px 0; border-radius:4px; color:#29483C;">
             <strong>Special Instructions / Notes:</strong><br/>${emailCustomNote}
           </div>`
        : ''
    }

    ${
      aiSummaryText
        ? `<div style="background:#B5B7A1; border:1px solid #29483C; padding:12px; margin:16px 0; border-radius:6px; font-size:13px; color:#29483C;">
             <strong>AI Clinical Summary:</strong><br/>${aiSummaryText}
           </div>`
        : ''
    }

    <p style="font-size:13px; color:#29483C; margin-top:24px;">
      Please report to the OPD waiting area outside Room 102 when your token number is called.<br/>
      <em>Sent automatically on behalf of MediKiosk Hospital System via Gmail API.</em>
    </p>
  </div>
</div>
    `.trim();

    setConfirmationConfig({
      title: `Send OPD Clinical Summary via Gmail?`,
      description: `This will compose and send an official email containing the patient's OPD token #${patient.tokenNumber || '101'} and clinical history summary from your connected Gmail account.`,
      targetDetail: `To: ${recipient} | Subject: "${emailSubject}"`,
      actionType: 'send_gmail',
      confirmLabel: 'Send via Gmail',
      onConfirm: async () => {
        setIsConfirmProcessing(true);
        try {
          const sent = await sendGmailMessage(accessToken, {
            to: recipient,
            subject: emailSubject,
            htmlBody: emailHtml,
          });
          setStatusSuccess(`Email successfully sent to ${recipient}! (Gmail Message ID: ${sent.id})`);
          loadGmailMessages(accessToken);
        } catch (err: any) {
          setStatusError(err.message || 'Failed to send email via Gmail');
        } finally {
          setIsConfirmProcessing(false);
        }
      },
    });
  };

  // 5. Google Calendar: Schedule Consultation (MANDATORY User Confirmation Dialog)
  const requestScheduleConsultation = (isFollowup: boolean = false) => {
    if (!accessToken) return;

    let startTime: Date;
    let endTime: Date;
    let title: string;
    let desc: string;

    if (isFollowup) {
      startTime = new Date(`${followupDate}T${followupTime}:00`);
      endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      title = `Follow-up OPD Consultation: ${patient.name || 'Patient'} (Token #${patient.tokenNumber || '101'})`;
      desc = `Ayurvedic & Allopathic Follow-up Review for ${patient.name}.\nChief Complaint: ${interviewData?.chiefComplaint || 'Review'}\nDepartment: ${patient.department || 'Kayachikitsa'}`;
    } else {
      startTime = new Date();
      // Schedule for 30 minutes from now or next slot
      startTime.setMinutes(startTime.getMinutes() + 15);
      endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      title = `OPD Consultation: ${patient.name || 'Patient'} - Room 102`;
      desc = `Doctor Consultation Slot for OPD Token #${patient.tokenNumber || '101'}.\nPatient: ${patient.name}, Age: ${patient.age || 'N/A'}\nChief Complaint: ${interviewData?.chiefComplaint || 'Consultation'}`;
    }

    setConfirmationConfig({
      title: `Add ${isFollowup ? 'Follow-up' : 'Consultation'} to Google Calendar?`,
      description: `This will schedule a medical consultation event in your primary Google Calendar with automatic reminder notifications.`,
      targetDetail: `Title: "${title}" | Time: ${startTime.toLocaleString('en-IN')}`,
      actionType: 'create_calendar',
      confirmLabel: 'Add to Calendar',
      onConfirm: async () => {
        setIsConfirmProcessing(true);
        try {
          const created = await createCalendarEvent(accessToken, {
            summary: title,
            description: desc,
            location: 'Room 102, Kayachikitsa OPD Clinic',
            startDateTime: startTime.toISOString(),
            endDateTime: endTime.toISOString(),
          });
          setStatusSuccess(`Appointment added to Google Calendar: "${created.summary}"!`);
          loadCalendarEvents(accessToken);
        } catch (err: any) {
          setStatusError(err.message || 'Failed to create Google Calendar event');
        } finally {
          setIsConfirmProcessing(false);
        }
      },
    });
  };

  // 6. Google Calendar: Delete Event (MANDATORY User Confirmation Dialog)
  const requestDeleteCalendarEvent = (event: CalendarEventItem) => {
    if (!accessToken) return;
    setConfirmationConfig({
      title: `Delete Calendar Event?`,
      description: `Are you sure you want to remove the appointment "${event.summary}" from your Google Calendar?`,
      targetDetail: `Event: ${event.summary} (ID: ${event.id})`,
      actionType: 'delete_calendar',
      confirmLabel: 'Remove Event',
      onConfirm: async () => {
        setIsConfirmProcessing(true);
        try {
          await deleteCalendarEvent(accessToken, event.id);
          setStatusSuccess(`Removed event "${event.summary}" from Google Calendar.`);
          loadCalendarEvents(accessToken);
        } catch (err: any) {
          setStatusError(err.message || 'Failed to delete Calendar event');
        } finally {
          setIsConfirmProcessing(false);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#29483C]/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-modal-title"
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-[#A9AA94] flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-[#A9AA94] bg-[#29483C] text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#F0EBDD] shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#F0EBDD]">
                  Connected Healthcare Suite
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">
                  Google Workspace
                </span>
              </div>
              <h2 id="workspace-modal-title" className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Google Drive • Gmail • Calendar</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Connection Status Bar */}
        <div className="px-6 py-3.5 bg-[#E3DDCA] border-b border-[#A9AA94] flex flex-wrap items-center justify-between gap-3">
          {accessToken && googleUser ? (
            <div className="flex items-center gap-3">
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt={googleUser.displayName || 'Google User'}
                  className="w-8 h-8 rounded-full border border-[#29483C]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#29483C] text-white font-black text-xs flex items-center justify-center">
                  {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#29483C]">
                    {googleUser.displayName || googleUser.email}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#B5B7A1] text-[#29483C] border border-[#29483C] text-[10px] font-extrabold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#29483C]" />
                    Workspace Synced
                  </span>
                </div>
                <div className="text-[11px] text-[#29483C]/70 font-mono">
                  {googleUser.email}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#A9AA94]/40 flex items-center justify-center text-[#29483C]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#29483C]">
                  Connect your Google Account to access Drive files, send medical emails, and sync OPD calendar.
                </span>
              </div>
            </div>
          )}

          <div>
            {!accessToken ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#29483C" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#29483C" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#29483C" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#29483C" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isAuthenticating ? 'Connecting...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="px-3 py-1.5 rounded-xl border border-[#A9AA94] bg-white hover:bg-[#A9AA94]/30 text-[#29483C] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#29483C]" />
                <span>Switch / Reconnect Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Iframe Preview Notice (if applicable) */}
        {isInIframe && !accessToken && (
          <div className="mx-6 mt-3 px-3.5 py-2.5 bg-[#E3DDCA] border border-[#A9AA94] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-[#29483C]">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-[#29483C] shrink-0" />
              <span>Running in preview iframe. If browser security blocks or closes the sign-in popup, open the app in a new tab:</span>
            </div>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-[#A9AA94] hover:bg-[#A9AA94]/80 text-[#29483C] font-bold rounded-lg text-xs shrink-0 inline-flex items-center gap-1 transition-colors"
            >
              Open in New Tab ↗
            </a>
          </div>
        )}

        {/* Global Notifications */}
        {statusSuccess && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-[#B5B7A1] border border-[#29483C] text-[#29483C] text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#29483C] shrink-0" />
              <span>{statusSuccess}</span>
            </div>
            <button onClick={() => setStatusSuccess(null)} className="text-[#29483C] hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {statusError && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-[#E3DDCA] border-2 border-[#29483C] text-[#29483C] text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#29483C] shrink-0" />
              <span>{statusError}</span>
            </div>
            <button onClick={() => setStatusError(null)} className="text-[#29483C] hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex border-b border-[#A9AA94] px-6 pt-2 bg-[#E3DDCA]">
          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'drive'
                ? 'border-[#29483C] text-[#29483C]'
                : 'border-transparent text-[#29483C]/60 hover:text-[#29483C]'
            }`}
          >
            <HardDrive className="w-4 h-4 text-[#29483C]" />
            <span>Google Drive</span>
            {driveFiles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#A9AA94] text-[#29483C] text-[10px]">
                {driveFiles.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gmail')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'gmail'
                ? 'border-[#29483C] text-[#29483C]'
                : 'border-transparent text-[#29483C]/60 hover:text-[#29483C]'
            }`}
          >
            <Mail className="w-4 h-4 text-[#29483C]" />
            <span>Gmail</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'calendar'
                ? 'border-[#29483C] text-[#29483C]'
                : 'border-transparent text-[#29483C]/60 hover:text-[#29483C]'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-[#29483C]" />
            <span>Google Calendar</span>
            {calendarEvents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#A9AA94] text-[#29483C] text-[10px]">
                {calendarEvents.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Contents Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!accessToken ? (
            <div className="text-center py-12 px-4 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#E3DDCA] border border-[#A9AA94] flex items-center justify-center mx-auto text-[#29483C]">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-[#29483C]">
                Sign in to Connect Google Workspace
              </h3>
              <p className="text-xs text-[#29483C]/70 leading-relaxed">
                Seamlessly store clinical intake records in Google Drive, dispatch appointment slips via Gmail, and schedule doctor consultations into Google Calendar.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className="gsi-material-button mx-auto"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#29483C" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#29483C" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#29483C" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#29483C" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isAuthenticating ? 'Connecting...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ======================= TAB 1: GOOGLE DRIVE ======================= */}
              {activeTab === 'drive' && (
                <div className="space-y-6">
                  {/* Action Banner */}
                  <div className="p-4 rounded-2xl bg-[#E3DDCA] border border-[#A9AA94] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-[#29483C] flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-[#29483C]" />
                        <span>Export Intake Records to Google Drive</span>
                      </h4>
                      <p className="text-xs text-[#29483C]/80 mt-0.5">
                        Save patient token #{patient.tokenNumber || '101'}, chief complaint, and clinical notes to Drive.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={requestUploadCaseSheetToDrive}
                      className="px-4 py-2.5 rounded-xl bg-[#29483C] hover:bg-[#29483C]/90 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Save Case Sheet to Drive</span>
                    </button>
                  </div>

                  {/* Search & Refresh */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#29483C]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={driveSearchQuery}
                        onChange={(e) => setDriveSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') loadDriveFiles(accessToken, driveSearchQuery);
                        }}
                        placeholder="Search files in Google Drive (e.g., blood test, prescription, report)..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#A9AA94] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#29483C] focus:border-[#29483C] text-[#29483C]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => loadDriveFiles(accessToken, driveSearchQuery)}
                      disabled={isLoadingDrive}
                      className="p-2.5 rounded-xl border border-[#A9AA94] hover:bg-[#A9AA94]/30 text-[#29483C] transition-all cursor-pointer"
                      title="Refresh files"
                    >
                      <RefreshCw className={`w-4 h-4 text-[#29483C] ${isLoadingDrive ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Drive Files List */}
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-[#29483C] mb-3">
                      Google Drive Files ({driveFiles.length})
                    </h5>

                    {isLoadingDrive ? (
                      <div className="py-12 text-center text-[#29483C] space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#29483C]" />
                        <span className="text-xs font-semibold">Loading Drive files...</span>
                      </div>
                    ) : driveFiles.length === 0 ? (
                      <div className="p-8 text-center bg-[#E3DDCA] rounded-2xl border border-[#A9AA94] space-y-2">
                        <FolderOpen className="w-8 h-8 mx-auto text-[#29483C]/40" />
                        <p className="text-xs font-bold text-[#29483C]">No files found matching your search</p>
                        <p className="text-[11px] text-[#29483C]/70">Click &apos;Save Case Sheet to Drive&apos; above to create your first record.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {driveFiles.map((file) => (
                          <div
                            key={file.id}
                            className="p-3.5 rounded-2xl border border-[#A9AA94] hover:border-[#29483C] hover:bg-[#E3DDCA] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[#B5B7A1] border border-[#A9AA94] flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-[#29483C]" />
                              </div>
                              <div className="min-w-0">
                                <h6 className="text-xs font-black text-[#29483C] truncate max-w-sm sm:max-w-md">
                                  {file.name}
                                </h6>
                                <div className="text-[10px] text-[#29483C]/70 flex items-center gap-2 mt-0.5">
                                  <span>{file.mimeType}</span>
                                  {file.modifiedTime && (
                                    <span>• {new Date(file.modifiedTime).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {onImportDocumentToKiosk && (
                                <button
                                  type="button"
                                  onClick={() => handleImportDriveFile(file)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#B5B7A1] hover:bg-[#A9AA94] text-[#29483C] font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                                  title="Import document to patient kiosk intake"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#29483C]" />
                                  <span>Import to Kiosk</span>
                                </button>
                              )}

                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg border border-[#A9AA94] hover:bg-[#A9AA94]/30 text-[#29483C] transition-all"
                                  title="Open in Google Drive"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => requestDeleteDriveFile(file)}
                                className="p-1.5 rounded-lg border border-[#A9AA94] hover:bg-[#A9AA94]/40 text-[#29483C] transition-all cursor-pointer"
                                title="Delete from Drive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================= TAB 2: GMAIL ======================= */}
              {activeTab === 'gmail' && (
                <div className="space-y-6">
                  {/* Compose Email Card */}
                  <form onSubmit={requestSendGmailSummary} className="p-5 rounded-2xl bg-[#E3DDCA] border border-[#A9AA94] space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-[#29483C] flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#29483C]" />
                        <span>Send OPD Intake Summary via Gmail</span>
                      </h4>
                      <span className="text-[11px] font-mono text-[#29483C]/70">
                        API: users.me.messages.send
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-[#29483C] mb-1">
                          Recipient Email Address <span className="text-[#29483C]">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={emailRecipient}
                          onChange={(e) => setEmailRecipient(e.target.value)}
                          placeholder="patient@example.com or doctor@hospital.org"
                          className="w-full px-3 py-2 rounded-xl border border-[#A9AA94] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#29483C] focus:border-[#29483C] text-[#29483C] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-[#29483C] mb-1">
                          Subject Line
                        </label>
                        <input
                          type="text"
                          required
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#A9AA94] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#29483C] focus:border-[#29483C] text-[#29483C] bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[#29483C] mb-1">
                        Optional Note / Instructions from Kiosk
                      </label>
                      <textarea
                        rows={2}
                        value={emailCustomNote}
                        onChange={(e) => setEmailCustomNote(e.target.value)}
                        placeholder="e.g. Please bring prior Ayurvedic prescriptions and fasting blood sugar test report."
                        className="w-full px-3 py-2 rounded-xl border border-[#A9AA94] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#29483C] focus:border-[#29483C] text-[#29483C] bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#29483C]/70">
                        ⚠️ Requires explicit confirmation before transmission.
                      </span>

                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#29483C] hover:bg-[#29483C]/90 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Email via Gmail</span>
                      </button>
                    </div>
                  </form>

                  {/* Recent Gmail Messages list */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-black uppercase tracking-wider text-[#29483C]">
                        Recent Gmail Inbox Messages
                      </h5>
                      <button
                        type="button"
                        onClick={() => loadGmailMessages(accessToken)}
                        disabled={isLoadingGmail}
                        className="text-xs font-bold text-[#29483C] hover:text-[#29483C] flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#29483C] ${isLoadingGmail ? 'animate-spin' : ''}`} />
                        <span>Refresh Inbox</span>
                      </button>
                    </div>

                    {isLoadingGmail ? (
                      <div className="py-12 text-center text-[#29483C] space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#29483C]" />
                        <span className="text-xs font-semibold">Fetching recent emails from Gmail...</span>
                      </div>
                    ) : gmailMessages.length === 0 ? (
                      <div className="p-8 text-center bg-[#E3DDCA] rounded-2xl border border-[#A9AA94] space-y-2">
                        <Inbox className="w-8 h-8 mx-auto text-[#29483C]/40" />
                        <p className="text-xs font-bold text-[#29483C]">No recent messages retrieved</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {gmailMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className="p-3.5 rounded-2xl border border-[#A9AA94] bg-white hover:border-[#29483C] transition-all space-y-1"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs font-black text-[#29483C] truncate">
                                {msg.subject}
                              </span>
                              <span className="text-[10px] text-[#29483C]/60 shrink-0 font-mono">
                                {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-[#29483C]/70 truncate">
                              From: {msg.from}
                            </div>
                            {msg.snippet && (
                              <p className="text-xs text-[#29483C]/80 line-clamp-1 text-ellipsis">
                                {msg.snippet}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================= TAB 3: GOOGLE CALENDAR ======================= */}
              {activeTab === 'calendar' && (
                <div className="space-y-6">
                  {/* Quick Schedule Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Today's consultation */}
                    <div className="p-4 rounded-2xl bg-[#E3DDCA] border border-[#A9AA94] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[#29483C] text-[11px] font-black uppercase tracking-wider">
                          <CalendarPlus className="w-3.5 h-3.5 text-[#29483C]" />
                          <span>Immediate OPD Slot</span>
                        </div>
                        <h4 className="text-sm font-black text-[#29483C] mt-1">
                          Add Today&apos;s Consultation
                        </h4>
                        <p className="text-xs text-[#29483C]/80 mt-0.5">
                          Adds Token #{patient.tokenNumber || '101'} (Room 102) with 15-minute popup notification.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => requestScheduleConsultation(false)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#29483C] hover:bg-[#29483C]/90 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        <span>Schedule Today&apos;s Slot</span>
                      </button>
                    </div>

                    {/* Follow-up consultation */}
                    <div className="p-4 rounded-2xl bg-[#E3DDCA] border border-[#A9AA94] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[#29483C] text-[11px] font-black uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5 text-[#29483C]" />
                          <span>Follow-up Consultation</span>
                        </div>
                        <h4 className="text-sm font-black text-[#29483C] mt-1">
                          Schedule Follow-up Visit
                        </h4>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="block text-[10px] font-bold text-[#29483C] mb-0.5">Date</label>
                            <input
                              type="date"
                              value={followupDate}
                              onChange={(e) => setFollowupDate(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#A9AA94] bg-white text-xs font-semibold text-[#29483C]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#29483C] mb-0.5">Time</label>
                            <input
                              type="time"
                              value={followupTime}
                              onChange={(e) => setFollowupTime(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#A9AA94] bg-white text-xs font-semibold text-[#29483C]"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => requestScheduleConsultation(true)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#29483C] hover:bg-[#29483C]/90 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Schedule Follow-up Event</span>
                      </button>
                    </div>
                  </div>

                  {/* Upcoming Calendar Events list */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-black uppercase tracking-wider text-[#29483C]">
                        Upcoming Google Calendar Events ({calendarEvents.length})
                      </h5>
                      <button
                        type="button"
                        onClick={() => loadCalendarEvents(accessToken)}
                        disabled={isLoadingCalendar}
                        className="text-xs font-bold text-[#29483C] hover:text-[#29483C] flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#29483C] ${isLoadingCalendar ? 'animate-spin' : ''}`} />
                        <span>Refresh Calendar</span>
                      </button>
                    </div>

                    {isLoadingCalendar ? (
                      <div className="py-12 text-center text-[#29483C] space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#29483C]" />
                        <span className="text-xs font-semibold">Loading calendar events...</span>
                      </div>
                    ) : calendarEvents.length === 0 ? (
                      <div className="p-8 text-center bg-[#E3DDCA] rounded-2xl border border-[#A9AA94] space-y-2">
                        <CalendarIcon className="w-8 h-8 mx-auto text-[#29483C]/40" />
                        <p className="text-xs font-bold text-[#29483C]">No upcoming appointments found</p>
                        <p className="text-[11px] text-[#29483C]/70">Schedule today&apos;s OPD visit above to add it to your Google Calendar.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {calendarEvents.map((evt) => {
                          const eventStart = evt.start.dateTime || evt.start.date;
                          const formattedDate = eventStart ? new Date(eventStart).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }) : 'Time TBD';

                          return (
                            <div
                              key={evt.id}
                              className="p-3.5 rounded-2xl border border-[#A9AA94] hover:border-[#29483C] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-[#B5B7A1] border border-[#A9AA94] flex items-center justify-center shrink-0">
                                  <CalendarIcon className="w-5 h-5 text-[#29483C]" />
                                </div>
                                <div className="min-w-0">
                                  <h6 className="text-xs font-black text-[#29483C] truncate">
                                    {evt.summary}
                                  </h6>
                                  <div className="text-[11px] text-[#29483C]/70 flex items-center gap-2 mt-0.5">
                                    <span className="font-semibold text-[#29483C]">{formattedDate}</span>
                                    {evt.location && <span>• {evt.location}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {evt.htmlLink && (
                                  <a
                                    href={evt.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg border border-[#A9AA94] hover:bg-[#A9AA94]/30 text-[#29483C] transition-all"
                                    title="View in Google Calendar"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-[#29483C]" />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => requestDeleteCalendarEvent(evt)}
                                  className="p-1.5 rounded-lg border border-[#A9AA94] hover:bg-[#A9AA94]/40 text-[#29483C] transition-all cursor-pointer"
                                  title="Delete Event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#E3DDCA] border-t border-[#A9AA94] flex items-center justify-between text-xs text-[#29483C]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#29483C]" />
            <span>DPDP Act 2023 & Google Workspace API Secured</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#29483C] hover:bg-[#29483C]/90 text-white font-black text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog */}
      <WorkspaceConfirmationModal
        isOpen={Boolean(confirmationConfig)}
        config={confirmationConfig}
        isProcessing={isConfirmProcessing}
        onClose={() => setConfirmationConfig(null)}
      />
    </div>
  );
};
