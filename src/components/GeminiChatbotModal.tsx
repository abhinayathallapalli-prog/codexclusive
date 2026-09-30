import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  User, 
  Loader2, 
  Globe, 
  ExternalLink, 
  RotateCcw, 
  ShieldAlert, 
  Stethoscope, 
  Zap, 
  Check, 
  Copy,
  ChevronDown
} from 'lucide-react';
import { sendChatbotMessage, GroundingSource } from '../lib/gemini';
import { saveChatMessageToFirestore } from '../lib/firebase';
import { UserAccount } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: GroundingSource[];
  modelUsed?: string;
}

interface GeminiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  initialRole?: 'complex' | 'general' | 'fast';
}

const ROLE_INFO = {
  complex: {
    name: 'Diagnostic Specialist',
    model: 'gemini-3.1-pro-preview',
    description: 'Deep differential diagnosis, drug-herb interactions, complex etiology',
    icon: Stethoscope,
    badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  general: {
    name: 'OPD Health Navigator',
    model: 'gemini-3.5-flash',
    description: 'Patient symptom guidance, OPD workflow, diet (Pathya/Apathya)',
    icon: Bot,
    badgeColor: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
  fast: {
    name: 'Rapid Triage & First-Aid',
    model: 'gemini-3.1-flash-lite',
    description: 'Fast emergency red flag check, immediate triage advice',
    icon: Zap,
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
};

const SUGGESTED_PROMPTS = {
  complex: [
    'Differential diagnosis for 55M with knee swelling & morning stiffness >1hr',
    'Evaluate safety of combining Ashwagandha with Metformin & Atorvastatin',
    'Ayurvedic pathogenesis (Samprapti) of Amlapitta vs GERD',
  ],
  general: [
    'What dietary items (Pathya) help reduce joint pain in Ayurveda?',
    'What documents should I keep ready for my OPD doctor consultation?',
    'Explain the difference between Ayush OPD and General Medicine OPD',
  ],
  fast: [
    'What are the critical red flags for sudden chest discomfort?',
    'First-aid stabilization for acute vertigo with nausea',
    'Normal vital sign ranges for adult OPD triage',
  ],
};

export const GeminiChatbotModal: React.FC<GeminiChatbotModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialRole = 'general',
}) => {
  const [role, setRole] = useState<'complex' | 'general' | 'fast'>(initialRole);
  const [enableSearch, setEnableSearch] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'model',
      text: `Hello! I am your AI Clinical Assistant at the OPD Kiosk. I am currently operating as **${ROLE_INFO[initialRole].name}** (Model: \`${ROLE_INFO[initialRole].model}\`). How may I assist with your symptoms, clinical inquiry, or OPD visit today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: ROLE_INFO[initialRole].model,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleRoleChange = (newRole: 'complex' | 'general' | 'fast') => {
    setRole(newRole);
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: 'model',
        text: `Switched role to **${ROLE_INFO[newRole].name}** using \`${ROLE_INFO[newRole].model}\`. ${ROLE_INFO[newRole].description}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: ROLE_INFO[newRole].model,
      },
    ]);
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Persist to Firestore if user logged in
    if (currentUser?.uid) {
      saveChatMessageToFirestore(currentUser.uid, { role: 'user', text: userMessage.text });
    }

    try {
      const historyPayload = newMessages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await sendChatbotMessage({
        messages: historyPayload,
        role,
        enableSearch,
      });

      const modelMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources,
        modelUsed: res.modelUsed || ROLE_INFO[role].model,
      };

      setMessages((prev) => [...prev, modelMessage]);

      if (currentUser?.uid) {
        saveChatMessageToFirestore(currentUser.uid, {
          role: 'model',
          text: modelMessage.text,
          modelUsed: modelMessage.modelUsed,
        });
      }
    } catch (err) {
      console.error('Failed to get bot response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'model',
        text: `Conversation restarted. I am ready to assist as **${ROLE_INFO[role].name}** (\`${ROLE_INFO[role].model}\`).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: ROLE_INFO[role].model,
      },
    ]);
  };

  const ActiveRoleIcon = ROLE_INFO[role].icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-3xl h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-sm">
              <ActiveRoleIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  AI Clinical Chatbot
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold ${ROLE_INFO[role].badgeColor}`}>
                  {ROLE_INFO[role].model}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-turn clinical dialogue • System instructions by role • Firestore synced
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearHistory}
              title="Reset Conversation"
              className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role & Grounding Controls Bar */}
        <div className="px-4 py-2.5 bg-slate-850/80 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          {/* Role selector buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Role:</span>
            {(['general', 'complex', 'fast'] as const).map((r) => {
              const info = ROLE_INFO[r];
              const isActive = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                  title={`${info.name}: ${info.model}`}
                >
                  <span>{info.name}</span>
                </button>
              );
            })}
          </div>

          {/* Search grounding toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-teal-500/40 transition-all">
            <input
              type="checkbox"
              checked={enableSearch}
              onChange={(e) => setEnableSearch(e.target.checked)}
              className="rounded accent-teal-500 cursor-pointer"
            />
            <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-teal-400' : 'text-slate-400'}`} />
            <span className={enableSearch ? 'text-teal-300 font-semibold' : 'text-slate-400'}>
              Google Search Grounding
            </span>
          </label>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-900/50">
          {messages.map((msg) => {
            const isBot = msg.role === 'model';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold ${
                    isBot
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-slate-700 text-slate-200 border border-slate-600'
                  }`}
                >
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm space-y-2 relative group ${
                    isBot
                      ? 'bg-slate-800/90 text-slate-100 border border-slate-700/80 shadow-sm'
                      : 'bg-teal-600 text-white rounded-tr-sm'
                  }`}
                >
                  {/* Meta header */}
                  <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 pb-1 border-b border-slate-700/50">
                    <span className="font-semibold text-slate-300">
                      {isBot ? ROLE_INFO[role].name : (currentUser?.displayName || 'You')}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.modelUsed && isBot && (
                        <span className="font-mono text-teal-400/90">{msg.modelUsed}</span>
                      )}
                      <span>{msg.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Body text */}
                  <div className="leading-relaxed whitespace-pre-line">
                    {msg.text}
                  </div>

                  {/* Grounded Web Sources if any */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/60 space-y-1">
                      <div className="text-[10px] text-teal-300 font-semibold flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>Google Search Grounded Citations:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.uri}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-950 text-slate-300 hover:text-teal-300 border border-slate-700 transition-all max-w-[200px] truncate"
                          >
                            <span className="truncate">{s.title || s.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-slate-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                <span>Generating clinical response with {enableSearch ? 'Google Search Grounding' : ROLE_INFO[role].model}...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-2 bg-slate-850/60 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0">
            Quick Inquiries:
          </span>
          {SUGGESTED_PROMPTS[role].map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 hover:border-teal-500/40 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${ROLE_INFO[role].name} anything...`}
              disabled={isLoading}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-550 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
