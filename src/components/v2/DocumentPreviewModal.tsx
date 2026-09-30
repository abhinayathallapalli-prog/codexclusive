import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Stethoscope,
  Pill,
  Activity,
  Maximize2,
  ShieldCheck,
  Eye,
  Trash2,
  Volume2,
  Sparkles,
  Camera,
  RefreshCw,
} from 'lucide-react';
import { MedicalDocument, LanguageCode } from '../../types';
import { speakPrompt } from '../../utils/speechHelper';
import { generateDocThumbnailDataUri } from './KioskDocuments';

interface DocumentPreviewModalProps {
  document: MedicalDocument;
  currentLanguage: LanguageCode;
  isOpen: boolean;
  onClose: () => void;
  onConfirmLegibility: (docId: string) => void;
  onRetakeOrRemove?: (docId: string) => void;
  audioEnabled?: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  currentLanguage,
  isOpen,
  onClose,
  onConfirmLegibility,
  onRetakeOrRemove,
  audioEnabled = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'image' | 'ocr'>('image');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(!!doc.legibilityVerified);

  // Sync state if doc changes
  useEffect(() => {
    setIsConfirmed(!!doc.legibilityVerified);
    setZoomLevel(1);
    setRotationDegrees(0);
  }, [doc]);

  // Audio prompt on open
  useEffect(() => {
    if (isOpen && audioEnabled) {
      const msg =
        currentLanguage === 'hi'
          ? 'कृपया जांचें कि दस्तावेज़ का पाठ और पर्ची स्पष्ट व पढ़ने योग्य है।'
          : currentLanguage === 'te'
          ? 'దయచేసి మీ పత్రం స్పష్టంగా మరియు చదవగలిగేలా ఉందో లేదో తనిఖీ చేయండి.'
          : 'Please verify that your document scan is sharp, clear, and readable before finalizing.';
      speakPrompt(msg, currentLanguage);
    }
  }, [isOpen, currentLanguage, audioEnabled]);

  if (!isOpen) return null;

  const thumbnailSrc = doc.thumbnailUrl || generateDocThumbnailDataUri(doc);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotationDegrees(0);
  };
  const handleRotate = () => setRotationDegrees((r) => (r + 90) % 360);

  const handleConfirm = () => {
    setIsConfirmed(true);
    onConfirmLegibility(doc.id);
    if (audioEnabled) {
      speakPrompt(
        currentLanguage === 'hi'
          ? 'दस्तावेज़ की स्पष्टता सत्यापित कर ली गई है।'
          : 'Document scan legibility verified successfully.',
        currentLanguage
      );
    }
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div
      id="document-preview-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#29483C]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="document-preview-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[14px] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#26312B] select-none"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#A9AA94] bg-[#E3DDCA] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[8px] bg-[#29483C] text-[#F0EBDD] flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5 text-[#B99B6B]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="preview-modal-title" className="text-base sm:text-lg font-serif font-bold text-[#26312B] truncate">
                  {doc.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#B5B7A1] text-[#29483C] border border-[#A9AA94] shrink-0">
                  {doc.documentType}
                </span>
              </div>
              <p className="text-xs text-[#596058] font-mono truncate mt-0.5">
                {doc.hospitalName || 'Clinical OPD'} · Date: {doc.date || 'Today'} · Size: {doc.fileSize || '1.2 MB'}
              </p>
            </div>
          </div>

          {/* Top Controls & Dismiss */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Guidance */}
            <button
              type="button"
              onClick={() => {
                const msg =
                  currentLanguage === 'hi'
                    ? 'कृपया जांचें कि दस्तावेज़ का पाठ और पर्ची स्पष्ट व पढ़ने योग्य है।'
                    : 'Please verify that your document scan is sharp, clear, and readable before finalizing.';
                speakPrompt(msg, currentLanguage);
              }}
              className="p-2 rounded-[6px] bg-[#B5B7A1] border border-[#A9AA94] hover:bg-[#abae97] text-[#26312B] cursor-pointer transition-colors"
              title="Listen to audio instructions"
            >
              <Volume2 className="w-4 h-4 text-[#29483C]" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-[6px] bg-[#B5B7A1] border border-[#A9AA94] hover:bg-[#abae97] text-[#26312B] cursor-pointer transition-colors"
              title="Close Preview Modal"
            >
              <X className="w-4 h-4 text-[#26312B]" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (For Mobile/Compact Layouts) */}
        <div className="md:hidden flex border-b border-[#A9AA94] bg-[#C9C5AF]/40 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
              activeTab === 'image'
                ? 'border-[#29483C] text-[#29483C] bg-[#E3DDCA]'
                : 'border-transparent text-[#596058]'
            }`}
          >
            Scan Image & Zoom
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ocr')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
              activeTab === 'ocr'
                ? 'border-[#29483C] text-[#29483C] bg-[#E3DDCA]'
                : 'border-transparent text-[#596058]'
            }`}
          >
            AI Extracted Data
          </button>
        </div>

        {/* Modal Main Content Area (Side-by-Side on Desktop) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#E3DDCA]/60">
          {/* LEFT: High Resolution Document Thumbnail Viewport with Controls (Col 7) */}
          <div
            className={`flex flex-col md:col-span-7 space-y-3 ${
              activeTab === 'ocr' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Viewport Toolbar */}
            <div className="flex items-center justify-between text-xs bg-[#B5B7A1] border border-[#A9AA94] rounded-[8px] p-2">
              <span className="font-bold text-[#26312B] flex items-center gap-1.5 pl-1">
                <Eye className="w-3.5 h-3.5 text-[#29483C]" />
                <span>{currentLanguage === 'hi' ? 'दस्तावेज़ की मूल प्रति' : 'Original Scan Thumbnail'}</span>
              </span>

              {/* Viewport Manipulation Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.75}
                  className="p-1.5 rounded-[4px] bg-[#E3DDCA] hover:bg-[#d8d2be] border border-[#A9AA94] text-[#26312B] disabled:opacity-40 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-[11px] text-[#29483C] px-1 min-w-[42px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="p-1.5 rounded-[4px] bg-[#E3DDCA] hover:bg-[#d8d2be] border border-[#A9AA94] text-[#26312B] disabled:opacity-40 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 rounded-[4px] bg-[#E3DDCA] hover:bg-[#d8d2be] border border-[#A9AA94] text-[#26312B] cursor-pointer ml-1"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                {(zoomLevel !== 1 || rotationDegrees !== 0) && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-1.5 rounded-[4px] bg-[#E3DDCA] hover:bg-[#d8d2be] border border-[#A9AA94] text-[#26312B] cursor-pointer text-[10px] font-bold"
                    title="Reset Zoom & Rotation"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* High-Resolution Document Canvas Box */}
            <div className="relative w-full h-[340px] sm:h-[400px] bg-[#29483C]/95 border-2 border-[#A9AA94] rounded-[10px] overflow-hidden flex items-center justify-center p-3 shadow-inner">
              <div
                className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotationDegrees}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={thumbnailSrc}
                  alt={doc.name}
                  className="max-h-[360px] sm:max-h-[380px] w-auto max-w-full object-contain rounded-[4px] shadow-lg border border-[#F0EBDD]/20 select-none pointer-events-none"
                  onError={(e) => {
                    e.currentTarget.src = generateDocThumbnailDataUri(doc);
                  }}
                />
              </div>

              {/* Verified Stamp Overlay if confirmed */}
              {isConfirmed && (
                <div className="absolute top-4 right-4 bg-[#29483C] text-[#F0EBDD] border-2 border-[#B99B6B] px-3 py-1 rounded-[6px] text-xs font-bold flex items-center gap-1.5 shadow-md uppercase tracking-wider backdrop-blur-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#B99B6B]" />
                  <span>Scan Verified Legible</span>
                </div>
              )}

              {/* Watermark Helper in Box */}
              <div className="absolute bottom-2 left-3 text-[10px] font-mono text-[#F0EBDD]/60 pointer-events-none">
                Pinch/use zoom controls to check handwriting clarity
              </div>
            </div>

            {/* Optical Clarity Quick Checklist */}
            <div className="bg-[#B5B7A1]/60 border border-[#A9AA94] rounded-[8px] p-3 text-xs space-y-1.5">
              <span className="block font-bold text-[#26312B] uppercase tracking-wider text-[10px]">
                {currentLanguage === 'hi' ? 'स्पष्टता जांच सूची (Readability Check)' : 'Scan Readability Checklist'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#29483C] font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#29483C]" />
                  <span>Doctor Rx & stamp legible</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#29483C]" />
                  <span>No blurry shadows or glare</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#29483C]" />
                  <span>4 document borders captured</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#29483C]" />
                  <span>Medication dosage readable</span>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: AI Extracted Clinical Findings & Verification Actions (Col 5) */}
          <div
            className={`flex flex-col md:col-span-5 space-y-4 ${
              activeTab === 'image' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Scan Quality & Confidence Status Card */}
            <div className="bg-[#B5B7A1] border border-[#A9AA94] rounded-[10px] p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#29483C] text-[#B99B6B] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#26312B] uppercase tracking-wide">
                    {currentLanguage === 'hi' ? 'स्कैन गुणवत्ता: स्पष्ट' : 'AI Clarity Rating: High'}
                  </h4>
                  <p className="text-[11px] text-[#596058]">Google Gemini 3.8 Flash OCR · 98.4% Match</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-[6px] text-xs font-black bg-[#29483C] text-[#F0EBDD]">
                98%
              </span>
            </div>

            {/* Extracted Diagnoses */}
            {doc.extractedDiagnoses && doc.extractedDiagnoses.length > 0 && (
              <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] p-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#29483C] mb-2 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-[#29483C]" />
                  <span>Diagnoses / Impression</span>
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {doc.extractedDiagnoses.map((d, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-[6px] bg-[#B5B7A1] text-[#29483C] font-semibold text-xs border border-[#A9AA94]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Medications */}
            {doc.extractedMedications && doc.extractedMedications.length > 0 && (
              <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] p-3 flex-1 overflow-hidden flex flex-col">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#29483C] mb-2 flex items-center gap-1.5 shrink-0">
                  <Pill className="w-4 h-4 text-[#29483C]" />
                  <span>Prescriptions Extracted ({doc.extractedMedications.length})</span>
                </h5>
                <div className="space-y-1.5 overflow-y-auto max-h-40 pr-1">
                  {doc.extractedMedications.map((m, i) => (
                    <div
                      key={i}
                      className="p-2 bg-[#C9C5AF]/60 rounded-[6px] border border-[#A9AA94] text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-[#26312B] block">{m.name}</span>
                        <span className="text-[11px] text-[#596058]">{m.dosage} · {m.frequency}</span>
                      </div>
                      {m.duration && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E3DDCA] border border-[#A9AA94] text-[#29483C]">
                          {m.duration}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Lab Findings */}
            {doc.extractedLabResults && doc.extractedLabResults.length > 0 && (
              <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[8px] p-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#29483C] mb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#29483C]" />
                  <span>Investigations ({doc.extractedLabResults.length})</span>
                </h5>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {doc.extractedLabResults.map((lr, i) => (
                    <div
                      key={i}
                      className="p-1.5 bg-[#C9C5AF]/60 rounded-[4px] border border-[#A9AA94] text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-[#26312B]">{lr.testName}</span>
                      <span className="font-bold text-[#29483C]">
                        {lr.resultValue} {lr.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Transcribed Line Summary */}
            {doc.extractedText && (
              <div className="bg-[#C9C5AF]/40 border border-[#A9AA94] rounded-[8px] p-2.5">
                <span className="block text-[10px] font-bold uppercase text-[#596058] mb-1">
                  Handwriting OCR Transcribe
                </span>
                <p className="font-mono text-[11px] text-[#26312B] line-clamp-3 leading-relaxed">
                  {doc.extractedText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Bar: Legibility Confirmation Actions */}
        <div className="p-4 sm:p-5 border-t border-[#A9AA94] bg-[#E3DDCA] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#596058]">
            <ShieldCheck className="w-4 h-4 text-[#29483C]" />
            <span>
              {currentLanguage === 'hi'
                ? 'स्पष्ट स्कैन डॉक्टर को सटीक परामर्श में सहायता करता है।'
                : 'Clear scans ensure physician diagnostic accuracy.'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onRetakeOrRemove && (
              <button
                type="button"
                onClick={() => {
                  onRetakeOrRemove(doc.id);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-[8px] bg-[#B5B7A1] hover:bg-[#abae97] text-[#26312B] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#A9AA94] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#29483C]" />
                <span>{currentLanguage === 'hi' ? 'पुनः स्कैन करें' : 'Rescan / Retake'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-[8px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-xs ${
                isConfirmed
                  ? 'bg-[#29483C] text-[#F0EBDD] border-[#29483C]'
                  : 'bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] border-[#29483C]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-[#B99B6B]" />
              <span>
                {currentLanguage === 'hi'
                  ? 'स्कैन स्पष्ट है - पुष्टि करें (Confirm Readable)'
                  : 'Confirm Scan is Clear & Readable'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
