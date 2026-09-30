import React from 'react';

interface BotanicalProps {
  className?: string;
  size?: number;
  strokeColor?: string;
  fillColor?: string;
}

/**
 * Minimal fine-line botanical illustration of Neem leaves (Azadirachta indica)
 * Research, clinical purification, and antiseptic balance.
 */
export const NeemLeafIllustration: React.FC<BotanicalProps> = ({
  className = 'w-10 h-10',
  strokeColor = 'currentColor',
  fillColor = 'none',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill={fillColor}
    stroke={strokeColor}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Stem */}
    <path d="M12 56 C 24 44, 38 28, 54 10" strokeWidth="1.75" />
    {/* Serrated Leaf 1 */}
    <path d="M28 40 C 22 36, 18 28, 22 22 C 28 20, 34 24, 36 32" />
    <path d="M22 22 C 24 28, 29 32, 36 32" strokeWidth="1" strokeDasharray="1 1" />
    {/* Leaf 2 */}
    <path d="M38 30 C 44 26, 48 18, 44 12 C 38 10, 32 14, 30 22" />
    <path d="M44 12 C 42 18, 37 22, 30 22" strokeWidth="1" strokeDasharray="1 1" />
    {/* Leaf 3 */}
    <path d="M42 22 C 48 18, 54 16, 56 12 C 52 14, 46 16, 42 22" />
    {/* Lower Leaflet */}
    <path d="M18 50 C 12 46, 10 38, 14 34 C 18 34, 22 40, 24 44" />
  </svg>
);

/**
 * Minimal fine-line botanical illustration of Sacred Tulsi (Ocimum sanctum)
 * Immunity, respiratory health, and calm adaptogenic strength.
 */
export const TulsiIllustration: React.FC<BotanicalProps> = ({
  className = 'w-10 h-10',
  strokeColor = 'currentColor',
  fillColor = 'none',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill={fillColor}
    stroke={strokeColor}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Central Stem */}
    <path d="M32 58 L32 14" strokeWidth="1.75" />
    {/* Tulsi Flower Spire (Manjari) */}
    <circle cx="32" cy="10" r="1.5" fill={strokeColor} />
    <circle cx="30" cy="14" r="1.2" fill={strokeColor} />
    <circle cx="34" cy="14" r="1.2" fill={strokeColor} />
    <circle cx="32" cy="17" r="1.2" fill={strokeColor} />
    {/* Opposite Leaves Tier 1 */}
    <path d="M32 26 C 24 24, 18 27, 18 31 C 18 35, 26 35, 32 30" />
    <path d="M32 26 C 40 24, 46 27, 46 31 C 46 35, 38 35, 32 30" />
    {/* Opposite Leaves Tier 2 */}
    <path d="M32 38 C 22 36, 14 41, 14 46 C 14 51, 24 50, 32 44" />
    <path d="M32 38 C 42 36, 50 41, 50 46 C 50 51, 40 50, 32 44" />
  </svg>
);

/**
 * Minimal fine-line botanical illustration of Ashwagandha Root (Withania somnifera)
 * Strength, stamina, nervous regulation, and Rasayana rejuvenation.
 */
export const AshwagandhaIllustration: React.FC<BotanicalProps> = ({
  className = 'w-10 h-10',
  strokeColor = 'currentColor',
  fillColor = 'none',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill={fillColor}
    stroke={strokeColor}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Main Taproot */}
    <path d="M32 10 C32 18, 30 30, 33 44 C34 50, 32 56, 31 60" strokeWidth="2" />
    {/* Root Branches */}
    <path d="M31 24 C25 28, 18 32, 16 42 C15 47, 18 52, 20 56" />
    <path d="M33 34 C39 37, 46 42, 47 48 C48 53, 44 57, 42 59" />
    <path d="M22 36 C18 42, 12 46, 11 51" strokeWidth="1.2" />
    <path d="M41 43 C46 47, 52 50, 53 54" strokeWidth="1.2" />
    {/* Crown Sprouts */}
    <path d="M32 10 C30 6, 26 5, 23 7" strokeWidth="1.2" />
    <path d="M32 10 C35 6, 40 5, 43 7" strokeWidth="1.2" />
  </svg>
);

/**
 * Minimal fine-line botanical illustration of Brahmi (Bacopa monnieri)
 * Cognitive clarity, neurological peace, and Medhya Rasayana.
 */
export const BrahmiIllustration: React.FC<BotanicalProps> = ({
  className = 'w-10 h-10',
  strokeColor = 'currentColor',
  fillColor = 'none',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill={fillColor}
    stroke={strokeColor}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Creeping Stem */}
    <path d="M10 46 C22 42, 38 42, 54 22" strokeWidth="1.75" />
    {/* Succulent Round Leaves Pair 1 */}
    <circle cx="20" cy="38" r="6" strokeWidth="1.4" />
    <circle cx="26" cy="48" r="5" strokeWidth="1.4" />
    {/* Pair 2 */}
    <circle cx="36" cy="34" r="6.5" strokeWidth="1.4" />
    <circle cx="42" cy="44" r="5.5" strokeWidth="1.4" />
    {/* Tiny Flower */}
    <circle cx="48" cy="24" r="2.5" fill={strokeColor} />
  </svg>
);

/**
 * Minimal fine-line botanical illustration of Turmeric Rhizome (Curcuma longa)
 * Metabolic warmth, anti-inflammatory defense, and Haridra purity.
 */
export const TurmericIllustration: React.FC<BotanicalProps> = ({
  className = 'w-10 h-10',
  strokeColor = 'currentColor',
  fillColor = 'none',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill={fillColor}
    stroke={strokeColor}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Rhizome Body */}
    <path
      d="M16 38 C14 30, 20 22, 28 20 C36 18, 46 22, 52 28 C56 34, 54 44, 46 48 C36 52, 22 50, 16 38 Z"
      strokeWidth="1.8"
    />
    {/* Secondary Finger */}
    <path d="M42 22 C46 16, 54 16, 56 22 C55 26, 51 28, 47 28" />
    {/* Rhizome Rings / Segments */}
    <path d="M22 28 C23 34, 25 40, 27 44" strokeWidth="1.2" />
    <path d="M30 24 C32 32, 34 38, 36 46" strokeWidth="1.2" />
    <path d="M38 23 C41 31, 42 37, 43 45" strokeWidth="1.2" />
  </svg>
);

/**
 * Institutional Ayurvedic Emblem: Traditional Brass Kalash & Botanical Leaflet
 * Official Ministry of Ayush & AIIA clinical research aesthetic.
 */
export const AyurvedicEmblem: React.FC<BotanicalProps> = ({
  className = 'w-8 h-8',
  strokeColor = '#29483C',
  fillColor = 'none',
}) => (
  <svg
    viewBox="0 0 48 48"
    fill={fillColor}
    stroke={strokeColor}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Base Pedestal */}
    <path d="M16 42 L32 42" strokeWidth="2" />
    <path d="M19 39 L29 39" />
    {/* Kalash Vessel */}
    <path d="M16 28 C14 34, 18 39, 24 39 C30 39, 34 34, 32 28 C30 24, 27 24, 27 22 L21 22 C21 24, 18 24, 16 28 Z" />
    {/* Coconut / Seed Cap */}
    <path d="M20 22 C20 18, 24 14, 24 14 C24 14, 28 18, 28 22" />
    {/* Sacred Mango/Neem Leaves Radiating */}
    <path d="M24 14 C20 10, 14 11, 12 15 C15 16, 20 16, 22 18" />
    <path d="M24 14 C28 10, 34 11, 36 15 C33 16, 28 16, 26 18" />
    <circle cx="24" cy="9" r="1.5" fill={strokeColor} />
  </svg>
);

/**
 * Subtle hairline botanical border divider for cards & editorial headers
 */
export const BotanicalDivider: React.FC<{ className?: string }> = ({
  className = 'my-4 text-[#A9AA94]',
}) => (
  <div className={`flex items-center gap-3 w-full select-none ${className}`}>
    <div className="h-[1px] flex-1 bg-[#A9AA94]" />
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className="shrink-0 text-[#93684F]">
      <path
        d="M12 2 C9 5, 4 6, 2 6 C7 6, 10 9, 12 10 C14 9, 17 6, 22 6 C20 6, 15 5, 12 2 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="#E3DDCA"
      />
    </svg>
    <div className="h-[1px] flex-1 bg-[#A9AA94]" />
  </div>
);
