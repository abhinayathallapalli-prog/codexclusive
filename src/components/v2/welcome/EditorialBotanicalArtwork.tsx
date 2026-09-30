import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface EditorialBotanicalArtworkProps {
  className?: string;
}

/**
 * Editorial Asymmetric Botanical Linework Artwork (8-14% opacity)
 * Inspired by Neem (Azadirachta indica), Tulsi (Ocimum sanctum), and Brahmi.
 * Features slow natural drifting motion (2-6px translation, 1-2deg subtle rotation).
 */
export const EditorialBotanicalArtwork: React.FC<EditorialBotanicalArtworkProps> = ({
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* Background Natural Mineral Aura */}
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#B5B7A1]/40 blur-3xl" />

      {/* Layered Botanical SVG Linework */}
      <motion.svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={
          shouldReduceMotion
            ? {}
            : {
                y: [0, -6, 2, 0],
                rotate: [0, 1.2, -0.8, 0],
              }
        }
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-full max-w-[460px] h-auto text-[#29483C] opacity-[0.14]"
      >
        {/* Main Organic Curving Stems */}
        <path
          d="M120 440 C 160 360, 220 280, 280 140 C 310 80, 360 40, 420 30"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M210 300 C 150 250, 100 200, 80 120 C 70 80, 90 40, 130 30"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M260 180 C 320 180, 390 220, 430 280 C 450 310, 440 360, 410 390"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Neem & Tulsi Serrated Leaves */}
        {/* Leaf Set 1 (Left branch) */}
        <path
          d="M160 270 C 110 250, 90 200, 120 160 C 150 150, 180 190, 190 240 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="#B5B7A1"
          fillOpacity="0.25"
        />
        <path d="M120 160 C 145 200, 170 220, 190 240" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />

        <path
          d="M120 190 C 80 180, 60 140, 80 100 C 110 90, 130 130, 140 170 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="#B5B7A1"
          fillOpacity="0.2"
        />

        {/* Leaf Set 2 (Upper central stem) */}
        <path
          d="M260 200 C 220 160, 220 100, 260 70 C 300 70, 310 130, 290 180 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="#89927A"
          fillOpacity="0.2"
        />
        <path d="M260 70 C 270 110, 280 140, 290 180" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />

        <path
          d="M310 150 C 350 120, 400 130, 420 170 C 400 200, 340 200, 310 170 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="#62745D"
          fillOpacity="0.25"
        />

        {/* Leaf Set 3 (Right lower branch) */}
        <path
          d="M340 240 C 390 250, 430 300, 410 340 C 370 350, 340 310, 330 260 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="#B5B7A1"
          fillOpacity="0.2"
        />

        {/* Brahmi Succulent Round Leaflets */}
        <circle cx="100" cy="350" r="16" stroke="currentColor" strokeWidth="1.4" fill="#B5B7A1" fillOpacity="0.25" />
        <circle cx="125" cy="380" r="13" stroke="currentColor" strokeWidth="1.4" fill="#89927A" fillOpacity="0.2" />
        <circle cx="75" cy="390" r="11" stroke="currentColor" strokeWidth="1.2" fill="#B5B7A1" fillOpacity="0.15" />

        {/* Ashwagandha Root Delicate Fibers (Bottom base) */}
        <path d="M120 440 C 130 470, 150 490, 170 500" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M120 440 C 100 465, 80 480, 60 490" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M120 440 C 115 475, 120 500, 115 520" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

        {/* Fine Botanical Seed / Manjari Spire Accents */}
        <circle cx="420" cy="30" r="3.5" fill="#B99B6B" fillOpacity="0.6" />
        <circle cx="400" cy="42" r="2.8" fill="#B99B6B" fillOpacity="0.6" />
        <circle cx="435" cy="48" r="2.8" fill="#B99B6B" fillOpacity="0.6" />
        <circle cx="415" cy="60" r="2.8" fill="#B99B6B" fillOpacity="0.6" />

        {/* Thin-line Concentric Measurement / Botanical Manuscript Rings */}
        <circle cx="280" cy="240" r="140" stroke="#93684F" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.45" />
        <circle cx="280" cy="240" r="190" stroke="#A9AA94" strokeWidth="0.6" strokeDasharray="3 8" opacity="0.35" />
      </motion.svg>
    </div>
  );
};
