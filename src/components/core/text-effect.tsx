'use client';
import React, { useMemo } from 'react';
import { motion, Variants, TargetAndTransition, Transition } from 'motion/react';
import { cn } from '../../lib/utils';

export type PresetType = 'blur' | 'shake' | 'scale' | 'fade' | 'slide' | 'fade-in-blur';
export type PerType = 'word' | 'char' | 'line';

export interface TextEffectProps {
  children: string;
  per?: PerType;
  as?: keyof React.JSX.IntrinsicElements;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: PresetType;
  delay?: number;
  speedReveal?: number;
  speedSegment?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  segmentWrapperClassName?: string;
  style?: React.CSSProperties;
}

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
};

const presetVariants: Record<
  PresetType,
  {
    container: Variants;
    item: Variants;
  }
> = {
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { duration: 0.3 },
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.3 },
      },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 18 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: 'easeOut' },
      },
      exit: {
        opacity: 0,
        y: 18,
        transition: { duration: 0.3 },
      },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.7 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.35, ease: 'easeOut' },
      },
      exit: {
        opacity: 0,
        scale: 0.7,
        transition: { duration: 0.3 },
      },
    },
  },
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(8px)' },
      visible: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.35 },
      },
      exit: {
        opacity: 0,
        filter: 'blur(8px)',
        transition: { duration: 0.3 },
      },
    },
  },
  'fade-in-blur': {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 12, filter: 'blur(8px)' },
      visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.35, ease: 'easeOut' },
      },
      exit: {
        opacity: 0,
        y: 12,
        filter: 'blur(8px)',
        transition: { duration: 0.3 },
      },
    },
  },
  shake: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, x: 0 },
      visible: {
        opacity: 1,
        x: [-4, 4, -3, 3, 0],
        transition: { duration: 0.4 },
      },
      exit: { opacity: 0 },
    },
  },
};

export const TextEffect: React.FC<TextEffectProps> = ({
  children,
  per = 'word',
  as = 'p',
  variants,
  className,
  preset = 'fade',
  delay = 0,
  speedReveal = 0.35,
  speedSegment = 0.05,
  trigger = true,
  onAnimationComplete,
  segmentWrapperClassName,
  style,
}) => {
  const text = typeof children === 'string' ? children : String(children ?? '');

  // Split text into animation units based on `per`
  const segments = useMemo(() => {
    if (!text) return [];

    if (per === 'line') {
      return text.split('\n').map((line, idx, arr) => ({
        content: line,
        isSpace: false,
        key: `line-${idx}`,
        addBreak: idx < arr.length - 1,
      }));
    }

    if (per === 'char') {
      // Split into words, each containing chars, to preserve word boundaries
      const words = text.split(/(\s+)/);
      const result: { word: string; isSpace: boolean; chars: string[] }[] = [];
      words.forEach((w) => {
        const isSpace = /^\s+$/.test(w);
        result.push({
          word: w,
          isSpace,
          chars: isSpace ? [w] : Array.from(w),
        });
      });
      return result;
    }

    // Default 'word': split by whitespace while keeping spaces
    return text.split(/(\s+)/).map((segment, idx) => ({
      content: segment,
      isSpace: /^\s+$/.test(segment),
      key: `word-${idx}`,
    }));
  }, [text, per]);

  const selectedPreset = presetVariants[preset] || presetVariants.fade;

  const containerVariants = useMemo<Variants>(() => {
    if (variants?.container) return variants.container;
    const base = selectedPreset.container;
    return {
      ...base,
      visible: {
        ...(base.visible as TargetAndTransition),
        transition: {
          staggerChildren: speedSegment,
          delayChildren: delay,
        },
      },
    };
  }, [variants?.container, selectedPreset.container, speedSegment, delay]);

  const itemVariants = useMemo<Variants>(() => {
    if (variants?.item) return variants.item;
    const base = selectedPreset.item;
    return {
      ...base,
      visible: {
        ...(base.visible as TargetAndTransition),
        transition: {
          ...((base.visible as TargetAndTransition)?.transition as Transition),
          duration: speedReveal,
        },
      },
    };
  }, [variants?.item, selectedPreset.item, speedReveal]);

  // Motion element constructor
  const MotionTag = (motion as any)[as] || motion.p;

  return (
    <MotionTag
      initial="hidden"
      animate={trigger ? 'visible' : 'hidden'}
      variants={containerVariants}
      className={cn('inline-block', className)}
      onAnimationComplete={onAnimationComplete}
      style={style}
    >
      {per === 'char' ? (
        (segments as { word: string; isSpace: boolean; chars: string[] }[]).map(
          (group, gIdx) => {
            if (group.isSpace) {
              return (
                <span key={`space-${gIdx}`} className="inline-block whitespace-pre">
                  {group.word}
                </span>
              );
            }
            return (
              <span
                key={`word-group-${gIdx}`}
                className={cn('inline-block whitespace-nowrap', segmentWrapperClassName)}
              >
                {group.chars.map((char, cIdx) => (
                  <motion.span
                    key={`char-${gIdx}-${cIdx}`}
                    variants={itemVariants}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
            );
          }
        )
      ) : per === 'line' ? (
        (segments as { content: string; isSpace: boolean; key: string; addBreak?: boolean }[]).map(
          (item) => (
            <React.Fragment key={item.key}>
              <motion.span
                variants={itemVariants}
                className={cn('block', segmentWrapperClassName)}
              >
                {item.content || '\u00A0'}
              </motion.span>
              {item.addBreak && <br />}
            </React.Fragment>
          )
        )
      ) : (
        (segments as { content: string; isSpace: boolean; key: string }[]).map((item) => {
          if (item.isSpace) {
            return (
              <span key={item.key} className="inline-block whitespace-pre">
                {item.content}
              </span>
            );
          }
          return (
            <motion.span
              key={item.key}
              variants={itemVariants}
              className={cn('inline-block', segmentWrapperClassName)}
            >
              {item.content}
            </motion.span>
          );
        })
      )}
    </MotionTag>
  );
};

export interface TextEffectWithPresetProps {
  children?: string;
  className?: string;
  preset?: PresetType;
  as?: keyof React.JSX.IntrinsicElements;
  per?: PerType;
  delay?: number;
}

/**
 * TextEffect preset wrapper with default copy
 */
export function TextEffectWithPreset({
  children = 'Animate your ideas with motion-primitives',
  className,
  preset = 'slide',
  as = 'h3',
  per = 'word',
  delay = 0,
}: TextEffectWithPresetProps = {}) {
  return (
    <TextEffect per={per} as={as} preset={preset} className={className} delay={delay}>
      {children}
    </TextEffect>
  );
}
