import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseInactivityTimerOptions {
  /** Inactivity threshold in milliseconds (default: 3 minutes = 180,000 ms) */
  timeoutMs?: number;
  /** Warning countdown threshold in milliseconds before reset (default: 30 seconds = 30,000 ms) */
  warningMs?: number;
  /** Whether timer is active (e.g. false on 'welcome' screen or doctor dashboard) */
  enabled?: boolean;
  /** Callback fired when timeout completes and session resets */
  onTimeout: () => void;
  /** Optional callback fired when warning countdown begins */
  onWarning?: () => void;
}

export interface InactivityTimerState {
  /** Whether the warning modal/countdown is currently showing */
  isWarning: boolean;
  /** Seconds remaining in warning countdown */
  remainingSeconds: number;
  /** Manually reset the timer (e.g., when user clicks "I'm still here") */
  resetTimer: () => void;
}

const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const DEFAULT_WARNING_MS = 30 * 1000; // 30 seconds warning modal

/**
 * useInactivityTimer hook:
 * Tracks user interactions (touches, clicks, keyboard, mouse, scroll) across the kiosk screen.
 * If no interaction occurs for 3 minutes during an in-progress patient intake flow,
 * it resets the kiosk session to 'welcome' and clears all personal patient data
 * to safeguard patient health privacy.
 */
export function useInactivityTimer({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
  enabled = true,
  onTimeout,
  onWarning,
}: UseInactivityTimerOptions): InactivityTimerState {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(warningMs / 1000));

  const timeoutTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    clearAllTimers();
    setIsWarning(false);
    setRemainingSeconds(Math.round(warningMs / 1000));

    if (!enabled) return;

    // Set timer for the warning period
    const timeUntilWarning = Math.max(0, timeoutMs - warningMs);

    timeoutTimerRef.current = setTimeout(() => {
      setIsWarning(true);
      setRemainingSeconds(Math.round(warningMs / 1000));
      onWarning?.();

      const startTime = Date.now();
      const endTime = startTime + warningMs;

      countdownIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          clearAllTimers();
          setIsWarning(false);
          onTimeout();
        }
      }, 1000);
    }, timeUntilWarning);
  }, [clearAllTimers, enabled, onTimeout, onWarning, timeoutMs, warningMs]);

  // Listen to all touch/kiosk/keyboard interaction events
  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setIsWarning(false);
      return;
    }

    resetTimer();

    // Standard DOM interaction events across desktop & touch-screen kiosks
    const events = [
      'mousedown',
      'mousemove',
      'touchstart',
      'touchend',
      'touchmove',
      'pointerdown',
      'keydown',
      'scroll',
      'click',
    ];

    const handleUserActivity = () => {
      // If warning modal is open, user activity via modal button or screen interaction resets it
      if (isWarning) return; // explicit interaction with modal handles this
      // Throttle event checks: only reset if more than 800ms has elapsed since last event
      const now = Date.now();
      if (now - lastActivityTimeRef.current > 800) {
        resetTimer();
      }
    };

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    return () => {
      clearAllTimers();
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
    };
  }, [clearAllTimers, enabled, isWarning, resetTimer]);

  return {
    isWarning,
    remainingSeconds,
    resetTimer,
  };
}
