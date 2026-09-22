'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BLITZ_POLL_INTERVAL_MS, BLITZ_RENDER_TIMEOUT_MS } from '../../../../config/blitzLab';
import { blitzApi, type BlitzProjectDto } from './api';

export type RenderState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'queued'; projectId: string }
  | { phase: 'rendering'; projectId: string }
  | { phase: 'done'; projectId: string }
  | { phase: 'error'; message: string };

type RenderBody = Parameters<typeof blitzApi.triggerRender>[1];

/**
 * Queues a render and polls until the worker finishes.
 * Stops with an error after BLITZ_RENDER_TIMEOUT_MS, so a stopped worker does
 * not leave the button spinning forever.
 */
export function useBlitzRender(token: string, onCompleted: (project: BlitzProjectDto) => void) {
  const [state, setState] = useState<RenderState>({ phase: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const poll = useCallback((projectId: string) => {
    stop();
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > BLITZ_RENDER_TIMEOUT_MS) {
        stop();
        setState({ phase: 'error', message: 'Render timed out. Is the blitz-worker running on Railway?' });
        return;
      }
      const res = await blitzApi.getProject(token, projectId).catch(() => null);
      const project = res?.ok ? res.data.project : null;
      if (!project) return;
      if (project.renderStatus === 'COMPLETED') {
        stop();
        setState({ phase: 'done', projectId });
        onCompleted(project);
      } else if (project.renderStatus === 'FAILED') {
        stop();
        setState({ phase: 'error', message: 'Render failed. Check the worker logs.' });
      } else if (project.renderStatus === 'PROCESSING') {
        setState({ phase: 'rendering', projectId });
      }
    }, BLITZ_POLL_INTERVAL_MS);
  }, [token, stop, onCompleted]);

  const submit = useCallback(async (body: RenderBody) => {
    setState({ phase: 'submitting' });
    const res = await blitzApi.triggerRender(token, body).catch(() => null);
    if (!res?.ok) {
      setState({ phase: 'error', message: res?.data.error ?? 'Render request failed' });
      return;
    }
    setState({ phase: 'queued', projectId: res.data.projectId });
    poll(res.data.projectId);
  }, [token, poll]);

  useEffect(() => stop, [stop]);

  const isBusy = state.phase === 'submitting' || state.phase === 'queued' || state.phase === 'rendering';
  return { state, submit, isBusy };
}
