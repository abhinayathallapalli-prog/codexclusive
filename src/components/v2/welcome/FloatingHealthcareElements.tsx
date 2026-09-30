import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  NeemLeafIllustration,
  TulsiIllustration,
  AshwagandhaIllustration,
  BrahmiIllustration,
  TurmericIllustration,
  AyurvedicEmblem,
} from '../BotanicalIllustrations';

/**
 * Subtle floating Ayurvedic botanical micro-elements around the hero.
 * Monochromatic botanical illustrations of Neem, Tulsi, Ashwagandha,
 * Brahmi, Turmeric, and Ayurvedic Kalash emblem.
 * Calm, slow floating motion in peripheral positions.
 */
export const FloatingHealthcareElements: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  const elements = [
    {
      id: 'neem-leaf',
      Component: NeemLeafIllustration,
      className: 'top-8 left-6 sm:left-14 text-[#29483C]',
      yRange: [-4, 4],
      rotateRange: [-3, 3],
      duration: 8,
      delay: 0,
    },
    {
      id: 'tulsi-sprig',
      Component: TulsiIllustration,
      className: 'top-12 right-6 sm:right-16 text-[#62745D]',
      yRange: [4, -4],
      rotateRange: [4, -2],
      duration: 9.5,
      delay: 1.2,
    },
    {
      id: 'ashwagandha-root',
      Component: AshwagandhaIllustration,
      className: 'bottom-28 left-6 sm:left-16 text-[#93684F]',
      yRange: [-5, 3],
      rotateRange: [-4, 4],
      duration: 8.8,
      delay: 0.6,
    },
    {
      id: 'brahmi-plant',
      Component: BrahmiIllustration,
      className: 'top-1/2 -translate-y-12 right-4 sm:right-12 text-[#29483C]',
      yRange: [3, -5],
      rotateRange: [-2, 3],
      duration: 10,
      delay: 1.8,
    },
    {
      id: 'turmeric-rhizome',
      Component: TurmericIllustration,
      className: 'bottom-20 right-6 sm:right-20 text-[#A65F49]',
      yRange: [-4, 4],
      rotateRange: [2, -3],
      duration: 9,
      delay: 2.2,
    },
    {
      id: 'ayurvedic-emblem',
      Component: AyurvedicEmblem,
      className: 'top-1/3 left-4 sm:left-12 text-[#B99B6B]',
      yRange: [4, -3],
      rotateRange: [-3, 2],
      duration: 9.2,
      delay: 1.0,
    },
  ];

  if (shouldReduceMotion) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-20" aria-hidden="true">
        {elements.map(({ id, Component, className }) => (
          <div key={id} className={`absolute ${className}`}>
            <Component className="w-10 h-10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {elements.map(({ id, Component, className, yRange, rotateRange, duration, delay }) => (
        <motion.div
          key={id}
          className={`absolute ${className}`}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0.18, 0.35, 0.18],
            y: yRange,
            rotate: rotateRange,
          }}
          transition={{
            duration,
            delay,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        >
          <div className="p-2 rounded-[8px] bg-[#B5B7A1]/40 border border-[#A9AA94]/50 shadow-2xs">
            <Component className="w-8 h-8" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};
