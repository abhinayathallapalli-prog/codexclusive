import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface EcgPulseLineProps {
  className?: string;
  color?: string;
}

/**
 * Minimal Ayurvedic clinical pulse motif (Nadi Pariksha wave).
 * Represents physiological pulse monitoring and clinical assessment.
 * Editorial line weight with Deep Forest green and Copper accents.
 */
export const EcgPulseLine: React.FC<EcgPulseLineProps> = ({
  className = '',
  color = '#29483C',
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Nadi / physiological pulse path
  const pathD = 'M 0 20 L 40 20 L 50 12 L 60 28 L 70 20 L 95 20 L 105 5 L 115 35 L 125 10 L 135 24 L 145 20 L 175 20 L 185 14 L 195 24 L 205 20 L 240 20';

  if (shouldReduceMotion) {
    return (
      <div className={`flex items-center justify-center opacity-30 ${className}`}>
        <svg viewBox="0 0 240 40" className="w-full h-7" fill="none">
          <path
            d={pathD}
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center select-none overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 240 40"
        className="w-full h-7 max-w-[260px] overflow-visible"
        fill="none"
      >
        {/* Subtle background baseline track */}
        <path
          d={pathD}
          stroke="#A9AA94"
          strokeWidth="1"
          strokeOpacity="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Animated pulse drawing line */}
        <motion.path
          d={pathD}
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 1, 1, 0],
            opacity: [0, 0.9, 0.3, 0],
            pathOffset: [0, 0, 0.15, 1],
          }}
          transition={{
            duration: 4.8,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 1.2,
          }}
        />

        {/* Soft copper beacon dot */}
        <motion.circle
          r="2.5"
          fill="#9A6B4F"
          animate={{
            opacity: [0, 1, 1, 0],
            offsetDistance: ['0%', '100%'],
          }}
          style={{
            offsetPath: `path("${pathD}")`,
          }}
          transition={{
            duration: 4.8,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 1.2,
          }}
        />
      </svg>
    </div>
  );
};
