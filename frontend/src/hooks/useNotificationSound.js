import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'cks_admin_sound_enabled';

export const useNotificationSound = () => {
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const processedIdsRef = useRef(new Set());
  const audioContextRef = useRef(null);

  // Initialize Web Audio Context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    return audioContextRef.current;
  }, []);

  const setSoundEnabled = useCallback((enabled) => {
    setSoundEnabledState(enabled);
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, [setSoundEnabled]);

  // Unlock AudioContext upon user gesture
  const unlockAudio = useCallback(async () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      setAutoplayBlocked(false);
      setSoundEnabled(true);
      return true;
    } catch (err) {
      return false;
    }
  }, [getAudioContext, setSoundEnabled]);

  // Synthesize dual-frequency alert chime (659Hz -> 880Hz)
  const playChime = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return Promise.reject(new Error('AudioContext unavailable'));

      if (ctx.state === 'suspended') {
        return ctx.resume().then(() => playChime());
      }

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: A5 (880.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);

      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }, [getAudioContext]);

  /**
   * Mark an array of existing notification IDs as processed on initial load (prevents sound replay on refresh)
   */
  const markBatchProcessed = useCallback((notifIdsArray) => {
    if (!Array.isArray(notifIdsArray)) return;
    notifIdsArray.forEach(id => {
      if (id) processedIdsRef.current.add(String(id));
    });
  }, []);

  /**
   * Play sound once for a new notification ID
   */
  const playNotificationSound = useCallback((notif) => {
    if (!soundEnabled) return;
    if (!notif || !notif.id) return;

    const notifIdStr = String(notif.id);

    // IDEMPOTENCY: Ignore if ID already processed
    if (processedIdsRef.current.has(notifIdStr)) {
      return;
    }

    // Add to processed set immediately
    processedIdsRef.current.add(notifIdStr);

    playChime().catch((err) => {
      if (err.name === 'NotAllowedError' || err.message?.includes('user gesture') || err.message?.includes('suspended')) {
        setAutoplayBlocked(true);
      }
    });
  }, [soundEnabled, playChime]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
      }
    };
  }, []);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    autoplayBlocked,
    unlockAudio,
    playNotificationSound,
    markBatchProcessed,
    processedIds: processedIdsRef.current
  };
};
