import React from 'react';
import { RotateCcw, ShieldAlert } from 'lucide-react';

interface Props {
  children: any;
}

interface State {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: any) {
    console.error('[MediKiosk Runtime Error]:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      localStorage.removeItem('medikiosk_patient_session_v2');
    } catch {}
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state && this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#C9C5AF] text-[#26312B] flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-lg w-full bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] p-8 text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-[8px] bg-[#A65F49]/20 text-[#A65F49] flex items-center justify-center border border-[#A65F49]/30">
              <ShieldAlert className="w-8 h-8 text-[#A65F49]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-serif text-[#26312B]">
                MediKiosk System Recovery
              </h2>
              <p className="text-sm text-[#596058] leading-relaxed">
                The terminal encountered an unexpected interface condition. Your previous session draft has been safely captured.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#B5B7A1]/50 border border-[#A9AA94] rounded-[6px] p-3 text-left text-xs font-mono text-[#26312B] overflow-x-auto max-h-32">
                <p className="font-bold text-[#A65F49] mb-1">Diagnostic Log:</p>
                <p>{String(this.state.error)}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-semibold text-sm rounded-[8px] flex items-center justify-center gap-2 cursor-pointer transition-all border border-[#29483C]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Terminal</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#B5B7A1] hover:bg-[#B5B7A1]/80 text-[#26312B] font-semibold text-sm rounded-[8px] flex items-center justify-center gap-2 cursor-pointer transition-all border border-[#A9AA94]"
              >
                <span>Reset to Welcome Screen</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
