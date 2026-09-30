import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  Loader2,
  X,
  Globe,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';

interface SearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery?: string;
  context?: string;
}

const PRESET_QUERIES = [
  'Latest Dengue & Viral Fever Advisories in Delhi & NCR',
  'Ministry of Ayush seasonal health guidelines & protocols',
  'Jan Aushadhi generic medicines list & price comparison',
  'Common drug-herb interactions: Metformin & Ayurvedic formulations',
  'Seasonal influenza (H3N2) clinical OPD triage criteria',
  'Emergency first aid protocols for acute hypertensive crisis',
];

export const SearchGroundingModal: React.FC<SearchGroundingModalProps> = ({
  isOpen,
  onClose,
  defaultQuery = '',
  context = '',
}) => {
  const [query, setQuery] = useState(
    defaultQuery || 'Latest Dengue & Viral Fever Advisories in Delhi & NCR'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.5-flash');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery || query;
    if (!queryToUse.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/gemini/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToUse,
          context,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResultText(data.text);
        setSources(data.sources || []);
        setModelUsed(data.modelUsed || 'gemini-3.5-flash');
      } else {
        setErrorMsg(data.error || 'Failed to retrieve Google Search data');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during Google Search grounding.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Verified Clinical & Public Health Search
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono font-semibold">
                  gemini-3.5-flash • googleSearch
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                <span>Grounded in live web evidence with verified source citations</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search medical guidelines, Ayush advisories, drug contraindications..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-blue-500/80 transition-all placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Queries */}
          <div>
            <div className="text-[11px] text-slate-400 font-semibold mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Recommended Evidence Searches:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuery(q);
                    handleSearch(undefined, q);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-blue-500/40 transition-all cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-xs">
                Querying Google Search Grounding with <span className="font-mono text-blue-300">gemini-3.5-flash</span>...
              </p>
            </div>
          )}

          {/* Results Display */}
          {resultText && !isLoading && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Web Sources / Grounding Citations */}
              {sources.length > 0 && (
                <div className="bg-slate-800/80 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span>Verified Web Sources ({sources.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">groundingChunks.web</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-blue-500/60 transition-all group flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors line-clamp-1">
                            {src.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {src.uri}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Summary */}
              <div className="bg-slate-850 border border-slate-700 rounded-xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2 whitespace-pre-line">
                <div className="flex items-center justify-between border-b border-slate-750 pb-2 mb-2">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-400">
                    Clinical Synthesis • Model: {modelUsed}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-2xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div>{resultText}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Google Search data is used to ground and verify clinical health facts.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
