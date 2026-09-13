'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeelingChoice } from '../types/booking';

export type GenerationState =
  | { phase: 'uploading' }
  | { phase: 'generating' }
  | { phase: 'done'; url: string }
  | { phase: 'error'; message: string };

const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 120_000;
const REGEN_COUNTDOWN_SECS = 45;

type Options = {
  uploadedPhoto: string;
  studioId: string;
  feelings: FeelingChoice[];
  email: string;
  bookingId: string;
  onPreviewReady: (url: string) => void;
};

type Return = {
  state: GenerationState;
  isRegenerating: boolean;
  regenSecondsLeft: number;
  startGeneration: () => Promise<void>;
  regenGenerate: () => Promise<void>;
};

export const usePreviewGeneration = ({
  uploadedPhoto,
  studioId,
  feelings,
  email,
  bookingId,
  onPreviewReady,
}: Options): Return => {
  const [state, setState]               = useState<GenerationState>({ phase: 'uploading' });
  const [isRegenerating, setRegen]      = useState(false);
  const [regenSecondsLeft, setCountdown] = useState(REGEN_COUNTDOWN_SECS);

  const taskIdRef      = useRef<string | null>(null);
  const pollTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef     = useRef(false);
  const deadlineRef    = useRef(0); // set to Date.now() + MAX_WAIT_MS inside startGeneration
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(REGEN_COUNTDOWN_SECS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearCountdown(); return 0; }
        return prev - 1;
      });
    }, 1_000);
  }, [clearCountdown]);

  const poll = useCallback(async (taskId: string) => {
    if (Date.now() > deadlineRef.current) {
      setState({ phase: 'error', message: 'Generation timed out. Please retry.' });
      return;
    }
    try {
      const res = await fetch(`/api/preview/${taskId}`);
      const data = await res.json();
      if (data.status === 'completed' && data.url) {
        clearPoll();
        setState({ phase: 'done', url: data.url });
        return;
      }
      if (['failed', 'cancelled', 'timeout', 'deleted'].includes(data.status)) {
        clearPoll();
        setState({ phase: 'error', message: data.error ?? `Generation ${data.status}. Please retry.` });
        return;
      }
      // eslint-disable-next-line react-hooks/immutability
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    } catch {
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    }
  }, [clearPoll]);

  const startGeneration = useCallback(async () => {
    startedRef.current = true;
    deadlineRef.current = Date.now() + MAX_WAIT_MS;
    setState({ phase: 'uploading' });
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoDataUrl: uploadedPhoto, studioId, feelings, email, bookingId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({ phase: 'error', message: err.error ?? `Upload failed (${res.status})` });
        return;
      }
      const { taskId } = await res.json();
      taskIdRef.current = taskId;
      setState({ phase: 'generating' });
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Network error. Please retry.' });
    }
  }, [uploadedPhoto, studioId, feelings, email, bookingId, poll]);

  const regenPoll = useCallback(async (taskId: string): Promise<string | null> => {
    const deadline = Date.now() + MAX_WAIT_MS;
    return new Promise((resolve) => {
      const check = async () => {
        if (Date.now() > deadline) { resolve(null); return; }
        try {
          const res = await fetch(`/api/preview/${taskId}`);
          const data = await res.json();
          if (data.status === 'completed' && data.url) { resolve(data.url); return; }
          if (['failed', 'cancelled', 'timeout', 'deleted'].includes(data.status)) { resolve(null); return; }
        } catch { /* retry */ }
        setTimeout(check, POLL_INTERVAL_MS);
      };
      check();
    });
  }, []);

  const regenGenerate = useCallback(async () => {
    setRegen(true);
    startCountdown();
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoDataUrl: uploadedPhoto, studioId, feelings, email, bookingId }),
      });
      if (!res.ok) return;
      const { taskId } = await res.json();
      const newUrl = await regenPoll(taskId);
      if (newUrl) setState({ phase: 'done', url: newUrl });
    } catch { /* keep existing photo */ } finally {
      setRegen(false);
      clearCountdown();
    }
  }, [uploadedPhoto, studioId, feelings, email, bookingId, regenPoll, startCountdown, clearCountdown]);

  useEffect(() => {
    if (!startedRef.current) startGeneration();
    return () => { clearPoll(); clearCountdown(); };
  // startGeneration is stable; eslint-disable is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.phase === 'done') onPreviewReady((state as { phase: 'done'; url: string }).url);
  }, [state, onPreviewReady]);

  return { state, isRegenerating, regenSecondsLeft, startGeneration, regenGenerate };
};
