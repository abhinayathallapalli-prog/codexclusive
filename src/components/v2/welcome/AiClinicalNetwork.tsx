import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { User, Activity, Leaf, FileCheck, Stethoscope } from 'lucide-react';
import { LanguageCode } from '../../../types';

interface AiClinicalNetworkProps {
  currentLanguage: LanguageCode;
  className?: string;
}

export const AiClinicalNetwork: React.FC<AiClinicalNetworkProps> = ({
  currentLanguage,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const labels = {
    en: {
      patient: 'Patient (Rogi)',
      symptoms: 'Symptoms (Lakshana)',
      ai: 'Dashavidha Pariksha',
      understanding: 'Clinical Synthesis',
      doctor: 'Physician (Vaidya)',
      scanNotice: 'Structured Ayush Clinical Flow',
    },
    hi: {
      patient: 'रोगी (Patient)',
      symptoms: 'लक्षण (Lakshana)',
      ai: 'दशविध परीक्षा',
      understanding: 'रोगनिदान सारांश',
      doctor: 'वैद्य (Physician)',
      scanNotice: 'आयुष क्लिनिकल इनटेक प्रणाली',
    },
  };

  const l = labels[currentLanguage === 'hi' ? 'hi' : 'en'];

  const nodes = [
    { id: 'patient', label: l.patient, Icon: User },
    { id: 'symptoms', label: l.symptoms, Icon: Activity },
    { id: 'ai', label: l.ai, Icon: Leaf, isCenter: true },
    { id: 'understanding', label: l.understanding, Icon: FileCheck },
    { id: 'doctor', label: l.doctor, Icon: Stethoscope },
  ];

  if (shouldReduceMotion) {
    return (
      <div className={`w-full max-w-4xl mx-auto p-4 bg-[#B5B7A1] rounded-[10px] border border-[#A9AA94] ${className}`}>
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
          {nodes.map(({ id, label, Icon, isCenter }) => (
            <div key={id} className="flex flex-col items-center text-center gap-1.5 min-w-[76px]">
              <div
                className={`w-9 h-9 rounded-[8px] flex items-center justify-center border ${
                  isCenter
                    ? 'bg-[#29483C] text-[#F0EBDD] border-[#29483C]'
                    : 'bg-[#E3DDCA] text-[#26312B] border-[#A9AA94]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-[#26312B]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto p-4 sm:p-5 bg-[#B5B7A1] rounded-[10px] border border-[#A9AA94] select-none overflow-hidden ${className}`}
    >
      {/* Header Label */}
      <div className="flex items-center justify-between mb-3 text-[11px] uppercase tracking-wider font-semibold text-[#596058] relative z-10">
        <span className="flex items-center gap-1.5 text-[#29483C]">
          <span className="w-2 h-2 rounded-full bg-[#B99B6B] animate-pulse" />
          {l.scanNotice}
        </span>
        <span className="text-[#596058] font-medium lowercase">Ministry of Ayush / AIIA</span>
      </div>

      {/* SVG Connecting Flow */}
      <div className="relative z-10">
        <svg viewBox="0 0 580 60" className="w-full h-14 overflow-visible" fill="none">
          {/* Base Connection Track */}
          <path
            d="M 50 30 L 170 30 L 290 30 L 410 30 L 530 30"
            stroke="#89927A"
            strokeWidth="1.25"
            strokeOpacity="0.45"
            strokeDasharray="4 4"
          />

          {/* Traveling Pulse Particle */}
          <motion.circle
            r="3.5"
            fill="#B99B6B"
            animate={{
              cx: [50, 170, 290, 410, 530],
              opacity: [0.2, 0.9, 1, 0.9, 0.2],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            cy="30"
          />

          {/* Forward subtle chevrons */}
          {[110, 230, 350, 470].map((cx, i) => (
            <motion.path
              key={i}
              d={`M ${cx - 3} 26 L ${cx + 2} 30 L ${cx - 3} 34`}
              stroke="#93684F"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ opacity: [0.2, 0.7, 0.2] }}
              transition={{
                duration: 2.5,
                delay: i * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </svg>

        {/* Clinical Network Nodes */}
        <div className="grid grid-cols-5 gap-1 -mt-11">
          {nodes.map(({ id, label, Icon, isCenter }, idx) => (
            <motion.div
              key={id}
              className="flex flex-col items-center text-center gap-1.5"
              animate={{
                y: [0, -2, 0],
              }}
              transition={{
                duration: 4,
                delay: idx * 0.2,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
            >
              <div
                className={`w-10 h-10 rounded-[8px] flex items-center justify-center border transition-all ${
                  isCenter
                    ? 'bg-[#29483C] text-[#F0EBDD] border-[#29483C] shadow-sm ring-2 ring-[#B99B6B]/40'
                    : 'bg-[#E3DDCA] text-[#26312B] border-[#A9AA94]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCenter ? 'text-[#B99B6B]' : 'text-[#29483C]'}`} />
              </div>
              <span className="text-[11px] font-semibold text-[#26312B] leading-tight max-w-[90px]">
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
