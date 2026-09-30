import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Volume2,
  AlertCircle,
  Radio,
  RotateCcw,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { float32ToPcmBase64, LiveAudioPlayer } from '../../utils/liveAudioHelper';
import { LanguageCode } from '../../types';

interface LiveVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage?: LanguageCode;
  initialPrompt?: string;
  onApplyIntakeSummary?: (text: string) => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

export const LiveVoiceAssistantModal: React.FC<LiveVoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  currentLanguage = 'en',
  initialPrompt = '',
  onApplyIntakeSummary,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to connect to Gemini 3.8 Live API');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  // Clean up on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      disconnectSession();
    }
  }, [isOpen]);

  const disconnectSession = () => {
    // 1. Stop audio input
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      try {
        inputAudioCtxRef.current.close();
      } catch {}
      inputAudioCtxRef.current = null;
    }

    // 2. Stop audio player
    if (playerRef.current) {
      playerRef.current.stopAll();
      playerRef.current.close();
      playerRef.current = null;
    }

    // 3. Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsMicActive(false);
    setIsModelSpeaking(false);
    setStatusMessage('Session ended.');
  };

  const startLiveSession = async () => {
    disconnectSession();
    setIsConnecting(true);
    setErrorNotice(null);
    setStatusMessage('Connecting to Gemini 3.8 Live API...');

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Setup 16kHz input AudioContext for mic streaming
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
      }

      // 3. Setup 24kHz output player for Gemini 3.8 Live responses
      playerRef.current = new LiveAudioPlayer(24000);

      // 4. Connect to server-side WebSocket proxy for gemini-3.8-live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/gemini/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
        setIsMicActive(true);
        setStatusMessage('Connected to Gemini 3.8 Live • Speak naturally into your microphone');

        // Optional initial text message if prompt provided
        if (initialPrompt) {
          ws.send(JSON.stringify({ text: initialPrompt }));
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'user',
              text: initialPrompt,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle audio response chunk from gemini-3.8-live
          if (data.audio && playerRef.current) {
            setIsModelSpeaking(true);
            playerRef.current.playChunk(data.audio, () => {
              setIsModelSpeaking(false);
            });
          }

          // Handle user interruption
          if (data.interrupted) {
            if (playerRef.current) {
              playerRef.current.stopAll();
            }
            setIsModelSpeaking(false);
          }

          // Handle streaming transcript text
          if (data.text) {
            setLiveTranscript((prev) => prev + data.text);
          }

          if (data.error) {
            setErrorNotice(data.error);
          }
        } catch (e) {
          console.error('[LiveVoice] WS message parsing error:', e);
        }
      };

      ws.onerror = () => {
        setIsConnecting(false);
        setErrorNotice('Unable to connect to live voice session. Check your internet connection.');
        setStatusMessage('Connection failed.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setIsMicActive(false);
        setIsModelSpeaking(false);
        setStatusMessage('Live session ended.');
      };

      // 5. Connect microphone stream to ScriptProcessor for 16kHz PCM streaming
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const channelData = e.inputBuffer.getChannelData(0);
        const base64Audio = float32ToPcmBase64(channelData);
        ws.send(JSON.stringify({ audio: base64Audio }));
      };
    } catch (err: any) {
      console.error('[LiveVoice] Initialization error:', err);
      setIsConnecting(false);
      setErrorNotice(err.message || 'Microphone access is required for live voice conversations.');
      setStatusMessage('Microphone access denied or error occurred.');
    }
  };

  const toggleMute = () => {
    if (!mediaStreamRef.current) return;
    const tracks = mediaStreamRef.current.getAudioTracks();
    if (tracks.length > 0) {
      const nextState = !tracks[0].enabled;
      tracks[0].enabled = nextState;
      setIsMicActive(nextState);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#26312B]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
      <div className="bg-[#E3DDCA] border border-[#A9AA94] rounded-[10px] w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] text-[#26312B]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#496354] flex items-center justify-between bg-[#29483C] text-[#F0EBDD]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#1d332a] text-[#F0EBDD] border border-[#496354] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#B99B6B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif font-normal text-[#F0EBDD]">
                  Gemini Live Clinical Assistant
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#62745D] text-[#F0EBDD] font-mono font-medium">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-xs text-[#F0EBDD]/80 flex items-center gap-1.5 mt-0.5 font-normal">
                <Radio className="w-3 h-3 text-[#B99B6B] animate-pulse" />
                <span>Real-Time Bi-Directional Clinical Audio</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-[6px] text-[#F0EBDD]/70 hover:text-[#F0EBDD] hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Visualizer Stage */}
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center bg-[#B5B7A1]/40 border-b border-[#A9AA94] text-center relative overflow-hidden">
          {/* Animated sound wave aura */}
          <div className="relative flex items-center justify-center w-32 h-32 sm:w-40 sm:h-40 my-2">
            {isConnected && (
              <>
                <motion.div
                  animate={{
                    scale: isModelSpeaking ? [1, 1.4, 1] : isMicActive ? [1, 1.2, 1] : 1,
                    opacity: isModelSpeaking ? [0.35, 0.1, 0.35] : [0.25, 0.08, 0.25],
                  }}
                  transition={{ repeat: Infinity, duration: isModelSpeaking ? 1.2 : 2, ease: 'easeInOut' }}
                  className={`absolute inset-0 rounded-full blur-xl ${
                    isModelSpeaking ? 'bg-[#B99B6B]' : 'bg-[#89927A]'
                  }`}
                />
                <motion.div
                  animate={{
                    scale: isModelSpeaking ? [1, 1.15, 1] : 1,
                  }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="absolute inset-2 rounded-full border border-[#62745D]/40"
                />
              </>
            )}

            {/* Central Microphone / Speaker Hub */}
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center shadow-md border-2 transition-all z-10 ${
                isConnected
                  ? isModelSpeaking
                    ? 'bg-[#E3DDCA] border-[#29483C] text-[#29483C]'
                    : 'bg-[#E3DDCA] border-[#29483C] text-[#29483C]'
                  : 'bg-[#E3DDCA] border-[#A9AA94] text-[#596058]/70'
              }`}
            >
              {isModelSpeaking ? (
                <>
                  <Volume2 className="w-8 h-8 animate-bounce text-[#29483C]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-[#29483C]">
                    Speaking
                  </span>
                </>
              ) : isMicActive ? (
                <>
                  <Mic className="w-8 h-8 animate-pulse text-[#29483C]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-[#29483C]">
                    Listening
                  </span>
                </>
              ) : (
                <>
                  <MicOff className="w-8 h-8 text-[#596058]/50" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider mt-1 text-[#596058]/60">Muted</span>
                </>
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="mt-3 space-y-1">
            <h4 className="text-sm sm:text-base font-semibold text-[#26312B] flex items-center justify-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-[#29483C] animate-pulse' : 'bg-[#A9AA94]'
                }`}
              />
              <span>{statusMessage}</span>
            </h4>
            <p className="text-xs text-[#596058] max-w-md mx-auto">
              Natural conversational intake for symptoms, OPD departments, and consultation guidance in
              English, Hindi, or Telugu.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-3 mt-5">
            {!isConnected ? (
              <button
                type="button"
                onClick={startLiveSession}
                disabled={isConnecting}
                className="px-6 py-3 bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-semibold text-sm rounded-[8px] shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-[#B99B6B]" />
                <span>{isConnecting ? 'Connecting...' : 'Start Live Voice Intake'}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-[8px] font-semibold text-xs flex items-center gap-2 transition cursor-pointer border ${
                    isMicActive
                      ? 'bg-[#E3DDCA] hover:bg-[#B5B7A1] text-[#26312B] border-[#29483C]'
                      : 'bg-[#B5B7A1] text-[#26312B] border-[#A9AA94]'
                  }`}
                >
                  {isMicActive ? <MicOff className="w-4 h-4 text-[#A65F49]" /> : <Mic className="w-4 h-4 text-[#29483C]" />}
                  <span>{isMicActive ? 'Mute Mic' : 'Unmute Mic'}</span>
                </button>

                <button
                  type="button"
                  onClick={disconnectSession}
                  className="px-4 py-2 bg-transparent hover:bg-[#B5B7A1]/40 text-[#29483C] font-semibold text-xs rounded-[8px] border border-[#93684F] shadow-xs transition cursor-pointer flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div className="m-4 p-3 bg-[#E3DDCA] border border-[#A65F49]/40 rounded-[8px] text-xs text-[#A65F49] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#A65F49] shrink-0 mt-0.5" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Live Conversation Transcript Panel */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-[#E3DDCA] max-h-56">
          <div className="flex items-center justify-between text-2xs uppercase tracking-wider text-[#596058] font-semibold pb-1 border-b border-[#A9AA94]">
            <span>Live Consultation Transcripts</span>
            <span className="font-mono">gemini-3.8-live</span>
          </div>

          {messages.length === 0 && !liveTranscript && (
            <div className="text-center py-6 text-[#596058]/70 text-xs italic font-serif">
              Spoken conversation will appear here in real-time as you and MediKiosk converse.
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-[8px] text-xs sm:text-sm max-w-[85%] ${
                m.sender === 'user'
                  ? 'ml-auto bg-[#B5B7A1] text-[#26312B] border border-[#A9AA94]'
                  : 'mr-auto bg-[#C9C5AF] text-[#26312B] border border-[#A9AA94] shadow-xs'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider block text-[#596058] mb-1">
                {m.sender === 'user' ? 'Patient' : 'MediKiosk Assistant'}
              </span>
              <p className="leading-relaxed">{m.text}</p>
            </div>
          ))}

          {liveTranscript && (
            <div className="mr-auto p-3 rounded-[8px] bg-[#C9C5AF] border border-[#29483C]/40 text-[#26312B] text-xs sm:text-sm max-w-[85%] animate-pulse shadow-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider block text-[#29483C] mb-1">
                MediKiosk (Speaking...)
              </span>
              <p className="leading-relaxed">{liveTranscript}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer Guidance */}
        <div className="p-3 sm:p-4 bg-[#B5B7A1]/40 border-t border-[#A9AA94] flex items-center justify-between text-xs text-[#596058]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#29483C]" />
            <span>Low-latency clinical audio stream via Gemini Live WebSocket</span>
          </div>

          {onApplyIntakeSummary && liveTranscript && (
            <button
              type="button"
              onClick={() => onApplyIntakeSummary(liveTranscript)}
              className="px-3 py-1.5 rounded-[8px] bg-[#29483C] hover:bg-[#1f372e] text-[#F0EBDD] font-medium text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#B99B6B]" />
              <span>Use in Complaint</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
