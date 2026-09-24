'use client';

/**
 * One clone generation: submit it, then poll until it finishes.
 *
 * Polling runs in the page rather than on the server, so a clone started here only finishes while
 * this editor is open. Campaign-triggered clones will need a server-side tick — see the
 * lab gap analysis, "Nobody polls UGC and Clone".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorOf } from '../labClient';
import { useLabClient } from '../LabClientProvider';
import { CLONE_POLL_INTERVAL_MS, type CloneJobStatus } from './cloneConfig';

export type CloneSubmitBody = {
  mode: string;
  imageVendorUrl: string;
  videoVendorUrl: string;
  frameVendorUrl?: string;
  voiceVendorUrl?: string;
  prompt: string;
  characterKey: string;
  refVideoKey: string;
  durationSec: number;
  generateAudio: boolean;
};

export function useCloneJob() {
  const client = useLabClient();
  const [status, setStatus] = useState<CloneJobStatus>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  // Count seconds only while a job is actually running.
  useEffect(() => {
    if (status !== 'polling') {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      elapsedRef.current = null;
      return;
    }
    elapsedRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [status]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
  }, []);

  const poll = useCallback((id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const res = await client
        .request<{ status?: string; progress?: number; videoUrl?: string | null; error?: string | null }>(
          `/ugc-lab/clone/status/${id}`,
        )
        .catch(() => null);
      if (!res?.ok) return;

      setProgress(res.data.progress ?? 0);
      if (res.data.status === 'finished' && res.data.videoUrl) {
        stopPolling();
        setResultUrl(res.data.videoUrl);
        setStatus('done');
      } else if (res.data.status === 'failed') {
        stopPolling();
        setError(res.data.error ?? 'Generation failed — try again');
        setStatus('failed');
      }
    }, CLONE_POLL_INTERVAL_MS);
  }, [client, stopPolling]);

  const submit = useCallback(async (body: CloneSubmitBody) => {
    setStatus('submitting');
    setError('');
    setProgress(0);
    setElapsedSec(0);
    setResultUrl(null);

    const res = await client
      .request<{ taskId?: string }>('/ugc-lab/clone/submit', { json: body })
      .catch(() => null);

    if (!res?.ok || !res.data.taskId) {
      setError(res ? errorOf(res) : 'Could not start the job');
      setStatus('failed');
      return;
    }
    setTaskId(res.data.taskId);
    setStatus('polling');
    poll(res.data.taskId);
  }, [client, poll]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setTaskId(null);
    setProgress(0);
    setElapsedSec(0);
    setError('');
    setResultUrl(null);
  }, [stopPolling]);

  /** Dismiss a failure without clearing the uploads, so she can retry the same inputs. */
  const dismissError = useCallback(() => setStatus('idle'), []);

  return { status, taskId, progress, elapsedSec, error, resultUrl, submit, reset, dismissError };
}
