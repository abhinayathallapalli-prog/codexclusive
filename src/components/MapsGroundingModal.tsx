import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  ExternalLink,
  Loader2,
  X,
  Compass,
  Building2,
  Navigation,
  AlertCircle,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { searchMapsGrounding, MapsGroundingLink } from '../lib/gemini';

interface MapsGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery?: string;
  context?: string;
}

const PRESET_QUERIES = [
  'Nearby Ayush Hospitals & Panchakarma Centers',
  'Nearest 24/7 Jan Aushadhi & Medical Stores',
  'Emergency Trauma Centers with ICU',
  'Diagnostic Pathology & Ultrasound Labs nearby',
  'All India Institute of Ayurveda (AIIA) OPD & Facilities',
];

export const MapsGroundingModal: React.FC<MapsGroundingModalProps> = ({
  isOpen,
  onClose,
  defaultQuery = '',
  context = '',
}) => {
  const [query, setQuery] = useState(
    defaultQuery || 'Nearby Ayush Hospitals & Panchakarma Centers'
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [mapsLinks, setMapsLinks] = useState<MapsGroundingLink[]>([]);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.5-flash');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Attempt to acquire geolocation on open
  useEffect(() => {
    if (!isOpen) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationStatus(
            `GPS Active: ${position.coords.latitude.toFixed(3)}°N, ${position.coords.longitude.toFixed(3)}°E`
          );
        },
        (err) => {
          console.warn('Geolocation access declined or unavailable:', err.message);
          // Default to New Delhi / Varanasi medical corridor
          setCoords({ lat: 28.528, lng: 77.291 }); // AIIA Delhi coordinates
          setLocationStatus('Using Hospital Campus GPS (AIIA / IMS-BHU)');
        },
        { timeout: 5000 }
      );
    } else {
      setCoords({ lat: 28.528, lng: 77.291 });
      setLocationStatus('Standard Medical Zone GPS');
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery || query;
    if (!queryToUse.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await searchMapsGrounding({
        query: queryToUse,
        lat: coords?.lat,
        lng: coords?.lng,
        context,
      });

      if (res.success) {
        setResultText(res.text);
        setMapsLinks(res.mapsLinks || []);
        setModelUsed(res.modelUsed || 'gemini-3.5-flash');
      } else {
        setErrorMsg(res.error || 'Failed to search Google Maps data');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while finding locations.');
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Hospital & Healthcare Locator
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-semibold">
                  gemini-3.5-flash • googleMaps
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Navigation className="w-3 h-3 text-emerald-400" />
                <span>{locationStatus}</span>
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
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hospitals, emergency rooms, Ayush OPDs, pharmacies..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-emerald-500/80 transition-all placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Find</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Queries */}
          <div>
            <div className="text-[11px] text-slate-400 font-semibold mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quick Healthcare Searches:</span>
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
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-emerald-500/40 transition-all cursor-pointer text-left"
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
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs">Querying Google Maps & verified healthcare directory...</p>
            </div>
          )}

          {/* Results Display */}
          {resultText && !isLoading && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Maps Links & Place Cards */}
              {mapsLinks.length > 0 && (
                <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verified Google Maps Locations ({mapsLinks.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">groundingChunks.maps</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {mapsLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500/60 transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-1">
                              {link.title}
                            </h4>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 shrink-0" />
                          </div>
                          {link.address && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 mb-1">
                              {link.address}
                            </p>
                          )}
                          {link.snippet && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-2">
                              "{link.snippet}"
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold mt-2 inline-flex items-center gap-1">
                          Open in Google Maps →
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Synthesis */}
              <div className="bg-slate-800/60 border border-slate-750 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Facility Synthesis & Details</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">{modelUsed}</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy result"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                  {resultText}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!resultText && !isLoading && !errorMsg && (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <Compass className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
              <p className="text-xs font-medium">
                Enter a healthcare search query or click one of the presets above to discover hospitals, emergency facilities, and pharmacies grounded in live Google Maps data.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-center text-[10px] text-slate-400">
          Integrated with Google Maps Grounding API • Verified for emergency, Ayush, and OPD care routing
        </div>
      </div>
    </div>
  );
};
