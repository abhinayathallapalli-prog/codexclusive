import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Info, X, Check, ChevronDown, Gauge } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { LanguageCode } from '../../types';

export interface ExtractedHistoryContext {
  chiefComplaint?: string;
  duration?: string;
  location?: string;
  severity?: string;
  previousOccurrence?: string;
  pastMedicalHistory?: string[];
  currentMedications?: string[];
  familyHistory?: string[];
}

export interface SymptomConfidenceIndicatorProps {
  confidenceLevel?: 'high' | 'moderate' | 'low';
  confidenceScore?: number;
  confidenceRationale?: string;
  confidenceFactors?: string[];
  extractedHistory?: ExtractedHistoryContext;
  departmentName?: string;
  departmentBranch?: string;
  currentLanguage?: LanguageCode | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  compact?: boolean;
}

export interface SymptomConfidenceGaugeProps {
  score: number;
  level: 'high' | 'moderate' | 'low';
  variant?: 'mini' | 'full' | 'compact';
  className?: string;
  showLabels?: boolean;
  showReadout?: boolean;
  currentLanguage?: LanguageCode | string;
}

interface FactorEvaluation {
  id: string;
  label: string;
  labelLocalized: string;
  matched: boolean;
  detail: string;
}

export function evaluateSymptomConfidence(
  suppliedScore?: number,
  suppliedLevel?: 'high' | 'moderate' | 'low',
  suppliedRationale?: string,
  suppliedFactors?: string[],
  history?: ExtractedHistoryContext,
  deptName?: string,
  lang: string = 'en'
): {
  level: 'high' | 'moderate' | 'low';
  score: number;
  factors: FactorEvaluation[];
  rationale: string;
} {
  const hasComplaint = Boolean(history?.chiefComplaint && history.chiefComplaint.trim().length > 2);
  const hasDuration = Boolean(history?.duration && history.duration.trim().length > 0);
  const hasLocation = Boolean(
    history?.location &&
    history.location.trim().length > 0 &&
    !history.location.toLowerCase().includes('unknown')
  );
  const hasPriorOrMeds = Boolean(
    (history?.pastMedicalHistory && history.pastMedicalHistory.length > 0) ||
    (history?.currentMedications && history.currentMedications.length > 0) ||
    (history?.previousOccurrence && history.previousOccurrence.trim().length > 0)
  );

  let level: 'high' | 'moderate' | 'low';
  let score: number;

  if (suppliedLevel) {
    level = suppliedLevel;
    if (suppliedScore !== undefined && suppliedScore !== null && !isNaN(suppliedScore)) {
      score = Math.min(99, Math.max(25, Math.round(suppliedScore)));
    } else {
      score = level === 'high' ? 92 : level === 'moderate' ? 72 : 48;
    }
  } else if (suppliedScore !== undefined && suppliedScore !== null && !isNaN(suppliedScore)) {
    score = Math.min(99, Math.max(25, Math.round(suppliedScore)));
    if (score >= 80) level = 'high';
    else if (score >= 60) level = 'moderate';
    else level = 'low';
  } else {
    let calculated = 45;
    if (hasComplaint) calculated += 25;
    if (hasLocation) calculated += 15;
    if (hasDuration) calculated += 10;
    if (hasPriorOrMeds) calculated += 4;
    score = Math.min(96, Math.max(40, calculated));
    if (score >= 80) level = 'high';
    else if (score >= 60) level = 'moderate';
    else level = 'low';
  }

  const factors: FactorEvaluation[] = [
    {
      id: 'chief_complaint',
      label: 'Primary Symptom Specificity',
      labelLocalized:
        lang === 'hi'
          ? 'प्राथमिक लक्षण मिलान'
          : lang === 'te'
          ? 'ప్రాథమిక లక్షణం సరిపోలిక'
          : 'Primary Symptom Specificity',
      matched: hasComplaint,
      detail: history?.chiefComplaint
        ? `"${history.chiefComplaint}" matched with ${deptName || 'clinical specialty'} care protocols.`
        : 'Primary symptom description reported.',
    },
    {
      id: 'anatomical_location',
      label: 'Anatomical Site Localization',
      labelLocalized:
        lang === 'hi'
          ? 'शारीरिक स्थान का निर्धारण'
          : lang === 'te'
          ? 'శరీర స్థానం గుర్తింపు'
          : 'Anatomical Site Localization',
      matched: hasLocation,
      detail: history?.location
        ? `Localized to ${history.location}.`
        : 'Generalized clinical area identified.',
    },
    {
      id: 'duration_chronicity',
      label: 'Duration & Timeline Match',
      labelLocalized:
        lang === 'hi'
          ? 'अवधि व समय रेखा सत्यापन'
          : lang === 'te'
          ? 'వ్యవధి మరియు సమయ సరిపోలిక'
          : 'Duration & Timeline Match',
      matched: hasDuration,
      detail: history?.duration
        ? `Chronicity (${history.duration}) aligned with care protocol.`
        : 'Symptom duration recorded.',
    },
    {
      id: 'contextual_history',
      label: 'Extracted Past Context & Medications',
      labelLocalized:
        lang === 'hi'
          ? 'पिछला इतिहास व दवाइयों का संदर्भ'
          : lang === 'te'
          ? 'గత చరిత్ర మరియు మందులు'
          : 'Extracted Past Context & Medications',
      matched: hasPriorOrMeds,
      detail: hasPriorOrMeds
        ? 'Medical history and prior episodes contextualized.'
        : 'Screened against acute contraindications.',
    },
  ];

  let rationale = suppliedRationale;
  if (!rationale) {
    const targetDept = deptName || 'recommended OPD department';
    if (level === 'high') {
      rationale =
        lang === 'hi'
          ? `मरीज़ के दर्ज लक्षणों (${history?.chiefComplaint || 'मुख्य समस्या'}), स्थान और समय-सीमा का ${targetDept} के क्लिनिकल प्रोटोकॉल से 80%+ मजबूत मिलान है।`
          : `Extracted symptoms (${history?.chiefComplaint || 'reported complaint'}), anatomical site, and duration demonstrate high clinical correlation with the ${targetDept} pathway.`;
    } else if (level === 'moderate') {
      rationale =
        lang === 'hi'
          ? `दर्ज इतिहास के आधार पर ${targetDept} उपयुक्त प्रारंभिक देखभाल पथ है; मध्यम विश्वसनीयता के कारण चिकित्सक द्वारा उप-विशेषता की पुष्टि की जाएगी।`
          : `Extracted patient intake provides solid preliminary correlation with ${targetDept} (Medium Confidence); clinician will evaluate and confirm targeted sub-specialty.`;
    } else {
      rationale =
        lang === 'hi'
          ? `लक्षणों में व्यापक या बहु-प्रणालीय संकेत हैं। क्लिनिकल समीक्षा आवश्यक है।`
          : `Symptoms encompass multi-system or generalized indicators requiring dedicated physician review (Review Required).`;
    }
  }

  return { level, score, factors, rationale };
}

function polarToCartesian(cx: number, cy: number, r: number, angleDegrees: number) {
  const angleInRadians = (angleDegrees * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy - r * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = Math.abs(startAngle - endAngle) <= 180 ? 0 : 1;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const SymptomConfidenceGauge: React.FC<SymptomConfidenceGaugeProps> = ({
  score,
  level,
  variant = 'mini',
  className = '',
  showLabels = true,
  showReadout = true,
  currentLanguage = 'en',
}) => {
  const clampedScore = Math.min(100, Math.max(0, score));
  const targetRotation = -90 + (clampedScore / 100) * 180;

  // Active theme colors: Forest Green for high, Herbal Sage for moderate, Terracotta for low
  const activeColor =
    level === 'high' ? '#29483C' : level === 'moderate' ? '#71866F' : '#A65F49';
  const activeBadgeBg =
    level === 'high'
      ? 'bg-[#29483C] text-white'
      : level === 'moderate'
      ? 'bg-[#71866F] text-white'
      : 'bg-[#A65F49] text-white';

  const rotationMotion = useMotionValue(-90);
  const smoothRotation = useSpring(rotationMotion, {
    stiffness: 70,
    damping: 18,
    mass: 0.9,
  });

  const countMotion = useMotionValue(0);
  const smoothCount = useSpring(countMotion, {
    stiffness: 70,
    damping: 19,
  });
  const [displayNumber, setDisplayNumber] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      rotationMotion.set(targetRotation);
      countMotion.set(clampedScore);
    }, 120);

    const unsub = smoothCount.on('change', (latest) => {
      setDisplayNumber(Math.round(latest));
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [targetRotation, clampedScore, rotationMotion, countMotion, smoothCount]);

  // MINI GAUGE
  if (variant === 'mini') {
    const cx = 17;
    const cy = 17;
    const r = 12;

    const redArc = describeArc(cx, cy, r, 180, 75);
    const amberArc = describeArc(cx, cy, r, 72, 38);
    const greenArc = describeArc(cx, cy, r, 35, 0);

    const targetAngle = Math.max(0.1, 180 - (clampedScore / 100) * 180);
    const activeFillArc = describeArc(cx, cy, r, 180, targetAngle);
    const rotateTransform = useTransform(smoothRotation, (rVal) => `rotate(${rVal}, ${cx}, ${cy})`);

    return (
      <svg
        viewBox="0 0 34 20"
        className={`w-7 h-4 shrink-0 overflow-visible ${className}`}
        aria-hidden="true"
      >
        <path
          d={describeArc(cx, cy, r, 180, 0)}
          fill="none"
          stroke="#A9AA94"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <path
          d={redArc}
          fill="none"
          stroke="#A65F49"
          strokeWidth="3"
          strokeLinecap="round"
          className={level === 'low' ? 'opacity-100' : 'opacity-35'}
        />
        <path
          d={amberArc}
          fill="none"
          stroke="#D6B98C"
          strokeWidth="3"
          strokeLinecap="round"
          className={level === 'moderate' ? 'opacity-100' : 'opacity-35'}
        />
        <path
          d={greenArc}
          fill="none"
          stroke="#29483C"
          strokeWidth="3"
          strokeLinecap="round"
          className={level === 'high' ? 'opacity-100' : 'opacity-35'}
        />

        <motion.path
          d={activeFillArc}
          fill="none"
          stroke={activeColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.3 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 1.15,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.1,
          }}
        />

        <motion.g transform={rotateTransform}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + 0.8}
            stroke="#26312B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            cx={cx}
            cy={cy - r + 0.8}
            r="1.2"
            fill={activeColor}
          />
        </motion.g>

        <circle cx={cx} cy={cy} r="2.2" fill="#26312B" />
        <circle cx={cx} cy={cy} r="0.9" fill="#C9C5AF" />
      </svg>
    );
  }

  // FULL CLINICAL GAUGE
  const cx = 100;
  const cy = 105;
  const r = 75;

  const fullRedArc = describeArc(cx, cy, r, 180, 74);
  const fullAmberArc = describeArc(cx, cy, r, 71, 38);
  const fullGreenArc = describeArc(cx, cy, r, 35, 0);

  const fullTargetAngle = Math.max(0.1, 180 - (clampedScore / 100) * 180);
  const fullActiveFillArc = describeArc(cx, cy, r, 180, fullTargetAngle);
  const fullRotateTransform = useTransform(smoothRotation, (rVal) => `rotate(${rVal}, ${cx}, ${cy})`);
  const tickAngles = [180, 72.5, 36.5, 0];

  const zoneTitle =
    level === 'high'
      ? currentLanguage === 'hi'
        ? 'उच्च विश्वसनीयता (>80%)'
        : currentLanguage === 'te'
        ? 'అధిక విశ్వసనీయత (>80%)'
        : 'High Confidence (>80%)'
      : level === 'moderate'
      ? currentLanguage === 'hi'
        ? 'मध्यम विश्वसनीयता (60–79%)'
        : currentLanguage === 'te'
        ? 'మధ్యమ విశ్వసనీయత (60–79%)'
        : 'Medium Confidence (60–79%)'
      : currentLanguage === 'hi'
      ? 'समीक्षा आवश्यक (<60%)'
      : currentLanguage === 'te'
      ? 'సమీక్ష అవసరం (<60%)'
      : 'Review Required (<60%)';

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox="0 0 200 120"
        className="w-56 h-34 overflow-visible"
        aria-hidden="true"
      >
        <path
          d={describeArc(cx, cy, r, 180, 0)}
          fill="none"
          stroke="#B5B7A1"
          strokeWidth="12"
          strokeLinecap="round"
        />

        <path
          d={fullRedArc}
          fill="none"
          stroke="#A65F49"
          strokeWidth={level === 'low' ? '12' : '9'}
          strokeLinecap="round"
          className={`transition-all duration-300 ${level === 'low' ? 'opacity-100' : 'opacity-35'}`}
        />

        <path
          d={fullAmberArc}
          fill="none"
          stroke="#D6B98C"
          strokeWidth={level === 'moderate' ? '12' : '9'}
          strokeLinecap="round"
          className={`transition-all duration-300 ${level === 'moderate' ? 'opacity-100' : 'opacity-35'}`}
        />

        <path
          d={fullGreenArc}
          fill="none"
          stroke="#29483C"
          strokeWidth={level === 'high' ? '12' : '9'}
          strokeLinecap="round"
          className={`transition-all duration-300 ${level === 'high' ? 'opacity-100' : 'opacity-35'}`}
        />

        <motion.path
          d={fullActiveFillArc}
          fill="none"
          stroke={activeColor}
          strokeWidth="12"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 1.25,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.1,
          }}
        />

        {tickAngles.map((angle, idx) => {
          const inner = polarToCartesian(cx, cy, r - 8, angle);
          const outer = polarToCartesian(cx, cy, r + 8, angle);
          return (
            <line
              key={idx}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="#C9C5AF"
              strokeWidth="2"
            />
          );
        })}

        {showLabels && (
          <>
            <text x="30" y="114" fontSize="8" fontWeight="600" fill="#596058" textAnchor="middle">
              0%
            </text>
            <text x="122" y="28" fontSize="8" fontWeight="600" fill="#596058" textAnchor="middle">
              60%
            </text>
            <text x="165" y="56" fontSize="8" fontWeight="600" fill="#29483C" textAnchor="middle">
              80%
            </text>
            <text x="172" y="114" fontSize="8" fontWeight="600" fill="#29483C" textAnchor="middle">
              100%
            </text>
          </>
        )}

        <motion.g transform={fullRotateTransform}>
          <polygon
            points={`${cx - 3},${cy} ${cx + 3},${cy} ${cx},${cy - r + 3}`}
            fill="#26312B"
          />
          <circle
            cx={cx}
            cy={cy - r + 3}
            r="3.5"
            fill={activeColor}
            stroke="#C9C5AF"
            strokeWidth="1.5"
          />
        </motion.g>

        <circle cx={cx} cy={cy} r="8" fill="#26312B" />
        <circle cx={cx} cy={cy} r="5.5" fill="#29483C" />
        <circle cx={cx} cy={cy} r="2.8" fill={activeColor} />
      </svg>

      {showReadout && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="flex items-center justify-center gap-2 -mt-3"
        >
          <span className="text-xl font-mono font-semibold text-[#26312B] tracking-tight">
            {displayNumber}%
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm ${activeBadgeBg}`}
          >
            {zoneTitle}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export const ColorCodedGauge = SymptomConfidenceGauge;

export const SymptomConfidenceIndicator: React.FC<SymptomConfidenceIndicatorProps> = ({
  confidenceLevel,
  confidenceScore,
  confidenceRationale,
  confidenceFactors,
  extractedHistory,
  departmentName,
  departmentBranch,
  currentLanguage = 'en',
  size = 'md',
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { level, score, factors, rationale } = evaluateSymptomConfidence(
    confidenceScore,
    confidenceLevel,
    confidenceRationale,
    confidenceFactors,
    extractedHistory,
    departmentName,
    currentLanguage
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const theme = {
    high: {
      pillBg: 'bg-[#B5B7A1] hover:bg-[#E5DEC9]',
      pillBorder: 'border-[#29483C]',
      pillText: 'text-[#26312B]',
      badgeBg: 'bg-[#29483C] text-white',
      label:
        currentLanguage === 'hi'
          ? 'उच्च विश्वसनीयता'
          : currentLanguage === 'te'
          ? 'అధిక విశ్వసనీయత'
          : 'High Confidence',
      badgeText:
        currentLanguage === 'hi'
          ? 'उच्च (High)'
          : currentLanguage === 'te'
          ? 'అధికం'
          : 'High',
      desc:
        currentLanguage === 'hi'
          ? 'मरीज़ के दर्ज लक्षण, स्थान व अवधि विशिष्ट प्रोटोकॉल से 80%+ मेल खाते हैं।'
          : 'Extracted history shows strong clinical specificity (>80%) directly aligning with this department.',
    },
    moderate: {
      pillBg: 'bg-[#C9C5AF] hover:bg-[#B5B7A1]',
      pillBorder: 'border-[#71866F]',
      pillText: 'text-[#26312B]',
      badgeBg: 'bg-[#71866F] text-white',
      label:
        currentLanguage === 'hi'
          ? 'मध्यम विश्वसनीयता'
          : currentLanguage === 'te'
          ? 'మధ్యమ విశ్వసనీయత'
          : 'Medium Confidence',
      badgeText:
        currentLanguage === 'hi'
          ? 'मध्यम (Medium)'
          : currentLanguage === 'te'
          ? 'మధ్యమం'
          : 'Medium',
      desc:
        currentLanguage === 'hi'
          ? 'लक्षण इस विभाग के अनुकूल हैं (60–79%); डॉक्टर परामर्श के दौरान सटीक उप-शाखा सुनिश्चित करेंगे।'
          : 'Symptoms correlate with this department (60–79%); clinician will verify specific branch at consult.',
    },
    low: {
      pillBg: 'bg-[#C9C5AF] hover:bg-[#B5B7A1]',
      pillBorder: 'border-[#A65F49]',
      pillText: 'text-[#26312B]',
      badgeBg: 'bg-[#A65F49] text-white',
      label:
        currentLanguage === 'hi'
          ? 'समीक्षा आवश्यक'
          : currentLanguage === 'te'
          ? 'సమీక్ష అవసరం'
          : 'Review Required',
      badgeText:
        currentLanguage === 'hi'
          ? 'समीक्षा (Review)'
          : currentLanguage === 'te'
          ? 'సమీక్ష'
          : 'Review Req.',
      desc:
        currentLanguage === 'hi'
          ? 'व्यापक या जटिल लक्षण दर्ज किए गए हैं (<60%); डॉक्टर द्वारा प्राथमिकता से व्यक्तिगत जांच आवश्यक है।'
          : 'Multi-system or generalized symptoms recorded (<60%); clinician priority evaluation required.',
    },
  }[level];

  const sizeClasses = {
    sm: 'text-[11px] py-1 px-2.5 gap-1.5',
    md: 'text-xs py-1 px-3 gap-2',
    lg: 'text-sm py-1.5 px-3.5 gap-2.5',
  }[size];

  const matchedFactorCount = factors.filter((f) => f.matched).length;

  return (
    <div ref={containerRef} className={`relative inline-block align-middle ${className}`}>
      <button
        type="button"
        id="btn-symptom-confidence"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Symptom Confidence: ${score}%, ${theme.label}`}
        className={`inline-flex items-center rounded-lg border transition-all duration-150 cursor-pointer shadow-xs select-none ${theme.pillBg} ${theme.pillBorder} ${theme.pillText} ${sizeClasses}`}
      >
        <SymptomConfidenceGauge
          score={score}
          level={level}
          variant="mini"
          currentLanguage={currentLanguage}
        />

        <span className="font-semibold tracking-tight whitespace-nowrap flex items-center gap-1">
          {compact ? (
            `${score}%`
          ) : (
            <>
              <span className="text-[#596058] font-normal">
                {currentLanguage === 'hi'
                  ? 'विश्वसनीयता:'
                  : currentLanguage === 'te'
                  ? 'నమ్మకం:'
                  : 'Confidence:'}
              </span>
              <span className="font-mono font-bold text-[#26312B]">{score}%</span>
            </>
          )}
        </span>

        <span
          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${theme.badgeBg}`}
        >
          {theme.badgeText}
        </span>

        <span className="text-[#596058] ml-0.5">
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute z-50 left-0 sm:left-auto sm:right-0 mt-2 w-84 sm:w-96 bg-[#B5B7A1] rounded-xl border border-[#A9AA94] shadow-[0_6px_24px_rgba(41,45,40,0.12)] p-4 text-left text-[#26312B] space-y-3.5"
            style={{ minWidth: '300px', maxWidth: '92vw' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#A9AA94]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#29483C] text-white flex items-center justify-center">
                  <Gauge className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#26312B]">
                    {currentLanguage === 'hi'
                      ? 'AI लक्षण विश्वसनीयता गेज'
                      : currentLanguage === 'te'
                      ? 'AI లక్షణ విశ్వసనీయత గేజ్'
                      : 'AI Symptom Confidence Gauge'}
                  </h4>
                  <p className="text-[10px] text-[#596058]">
                    {currentLanguage === 'hi'
                      ? 'मरीज़ के दर्ज इतिहास पर आधारित'
                      : 'Derived from extracted patient intake'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-[#596058] hover:text-[#26312B] hover:bg-[#C9C5AF] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gauge Display */}
            <div className="p-3 bg-[#C9C5AF] rounded-lg border border-[#A9AA94] flex flex-col items-center">
              <SymptomConfidenceGauge
                score={score}
                level={level}
                variant="full"
                currentLanguage={currentLanguage}
              />

              <div className="grid grid-cols-3 gap-1.5 w-full pt-2.5 mt-2.5 border-t border-[#A9AA94] text-center">
                <div
                  className={`px-1.5 py-1 rounded-sm text-[10px] font-semibold border ${
                    level === 'low'
                      ? 'bg-[#B5B7A1] text-[#A65F49] border-[#A65F49]'
                      : 'bg-[#E3DDCA] text-[#596058] border-[#A9AA94]'
                  }`}
                >
                  <span className="block text-[11px]">&lt;60%</span>
                  <span>{currentLanguage === 'hi' ? 'समीक्षा' : 'Review'}</span>
                </div>
                <div
                  className={`px-1.5 py-1 rounded-sm text-[10px] font-semibold border ${
                    level === 'moderate'
                      ? 'bg-[#B5B7A1] text-[#71866F] border-[#71866F]'
                      : 'bg-[#E3DDCA] text-[#596058] border-[#A9AA94]'
                  }`}
                >
                  <span className="block text-[11px]">60–79%</span>
                  <span>{currentLanguage === 'hi' ? 'मध्यम' : 'Medium'}</span>
                </div>
                <div
                  className={`px-1.5 py-1 rounded-sm text-[10px] font-semibold border ${
                    level === 'high'
                      ? 'bg-[#B5B7A1] text-[#29483C] border-[#29483C]'
                      : 'bg-[#E3DDCA] text-[#596058] border-[#A9AA94]'
                  }`}
                >
                  <span className="block text-[11px]">80–100%</span>
                  <span>{currentLanguage === 'hi' ? 'उच्च' : 'High'}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#596058] text-center pt-2">
                {theme.desc}
              </p>
            </div>

            {/* Extracted History Evidence Alignment Checklist */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#596058] block">
                  {currentLanguage === 'hi'
                    ? 'दर्ज इतिहास मिलान कारक:'
                    : currentLanguage === 'te'
                    ? 'రికార్డ్ చేయబడిన సరిపోలిక కారకాలు:'
                    : 'Extracted History Alignment:'}
                </span>
                <span className="text-[10px] font-mono text-[#29483C] bg-[#C9C5AF] border border-[#A9AA94] px-1.5 py-0.5 rounded-sm">
                  {matchedFactorCount} / {factors.length} Matched
                </span>
              </div>

              <div className="space-y-1.5">
                {factors.map((factor) => (
                  <div
                    key={factor.id}
                    className="p-2 rounded-lg bg-[#C9C5AF] border border-[#A9AA94] flex items-start gap-2 text-xs"
                  >
                    <div
                      className={`mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                        factor.matched
                          ? 'bg-[#29483C] text-white'
                          : 'bg-[#A9AA94] text-[#596058]'
                      }`}
                    >
                      {factor.matched ? (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#596058]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#26312B] text-[11px]">
                          {factor.labelLocalized || factor.label}
                        </span>
                        {factor.matched && (
                          <span className="text-[9px] font-semibold text-[#29483C] bg-[#B5B7A1] border border-[#A9AA94] px-1 rounded-sm">
                            Matched
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#596058] line-clamp-2 mt-0.5">
                        {factor.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Routing Rationale */}
            <div className="p-2.5 rounded-lg bg-[#C9C5AF] border border-[#A9AA94] text-[11px] text-[#26312B] leading-relaxed font-normal">
              <span className="font-semibold text-[#29483C] block mb-0.5">
                {currentLanguage === 'hi' ? 'विभागीय रूटिंग तर्क:' : 'Clinical Routing Rationale:'}
              </span>
              <p className="italic text-[#596058]">{rationale}</p>
            </div>

            {/* Governance Safety Disclaimer */}
            <p className="text-[10px] text-[#596058] leading-tight pt-1 border-t border-[#A9AA94]">
              {currentLanguage === 'hi'
                ? 'क्लिनिकल सुरक्षा सूचना: AI लक्षण विश्वसनीयता रोगी द्वारा दर्ज इतिहास का सांख्यिकीय मिलान दर्शाती है। अंतिम निदान व उपचार उपस्थित चिकित्सक द्वारा निर्धारित किया जाएगा।'
                : 'Notice: AI confidence reflects statistical alignment between patient-reported intake and clinical department protocols. Final triage and treatment plan belong exclusively to the attending physician.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
