import React from 'react';
import { AlertTriangle, Send, Trash2, CalendarPlus, Check, X, ShieldAlert } from 'lucide-react';

export interface ConfirmationConfig {
  title: string;
  description: string;
  actionType: 'delete_drive' | 'send_gmail' | 'create_calendar' | 'delete_calendar' | 'upload_drive';
  targetDetail?: string;
  itemCount?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface WorkspaceConfirmationModalProps {
  isOpen: boolean;
  config: ConfirmationConfig | null;
  onClose: () => void;
  isProcessing?: boolean;
}

export const WorkspaceConfirmationModal: React.FC<WorkspaceConfirmationModalProps> = ({
  isOpen,
  config,
  onClose,
  isProcessing = false,
}) => {
  if (!isOpen || !config) return null;

  const getActionIcon = () => {
    switch (config.actionType) {
      case 'delete_drive':
      case 'delete_calendar':
        return <Trash2 className="w-5 h-5 text-[#A65F49]" />;
      case 'send_gmail':
        return <Send className="w-5 h-5 text-[#29483C]" />;
      case 'create_calendar':
        return <CalendarPlus className="w-5 h-5 text-[#29483C]" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-[#A65F49]" />;
    }
  };

  const getThemeBg = () => {
    switch (config.actionType) {
      case 'delete_drive':
      case 'delete_calendar':
        return 'bg-[#C9C5AF] border-[#A65F49]/40';
      case 'send_gmail':
      case 'create_calendar':
        return 'bg-[#B5B7A1] border-[#29483C]/30';
      default:
        return 'bg-[#B5B7A1] border-[#A9AA94]';
    }
  };

  const getConfirmButtonClass = () => {
    switch (config.actionType) {
      case 'delete_drive':
      case 'delete_calendar':
        return 'bg-[#A65F49] hover:bg-[#8e523b] text-[#F0EBDD] rounded-[8px]';
      case 'send_gmail':
      case 'create_calendar':
        return 'bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] rounded-[8px]';
      default:
        return 'bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] rounded-[8px]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#26312B]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md bg-[#E3DDCA] rounded-[10px] shadow-xl border border-[#A9AA94] overflow-hidden text-[#26312B]"
      >
        {/* Header decoration */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-[8px] flex items-center justify-center border shrink-0 ${getThemeBg()}`}>
              {getActionIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#62745D]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#596058]">
                  User Authorization Required
                </span>
              </div>
              <h3 id="confirm-modal-title" className="text-base font-serif font-normal text-[#26312B] leading-snug">
                {config.title}
              </h3>
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-[8px] bg-[#C9C5AF] border border-[#A9AA94] text-xs font-normal text-[#26312B] leading-relaxed">
            {config.description}
          </div>

          {config.targetDetail && (
            <div className="mt-3 p-3 rounded-[8px] bg-[#C9C5AF] border border-[#A9AA94] text-xs font-mono text-[#596058] break-all select-all">
              <span className="font-semibold text-[#26312B] block text-[10px] uppercase tracking-wider font-sans mb-0.5">
                Target / Affected Record:
              </span>
              {config.targetDetail}
            </div>
          )}

          {config.itemCount !== undefined && config.itemCount > 1 && (
            <div className="mt-2 text-right text-[11px] font-medium text-[#596058]">
              Total affected items: <span className="font-semibold text-[#26312B]">{config.itemCount}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#B5B7A1]/40 border-t border-[#A9AA94] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (config.onCancel) config.onCancel();
              onClose();
            }}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-[8px] border border-[#93684F] bg-transparent hover:bg-[#B5B7A1]/40 text-[#29483C] text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>{config.cancelLabel || 'Cancel'}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await config.onConfirm();
              onClose();
            }}
            disabled={isProcessing}
            className={`px-4 py-2 text-xs font-semibold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 ${getConfirmButtonClass()}`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{config.confirmLabel || 'Confirm & Proceed'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
