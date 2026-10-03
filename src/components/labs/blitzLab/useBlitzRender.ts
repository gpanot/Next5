'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BLITZ_POLL_INTERVAL_MS, BLITZ_QUEUE_TIMEOUT_MS, BLITZ_RENDER_TIMEOUT_MS } from '../../../config/blitzLab';
import { errorOf } from '../labClient';
import { useLabClient } from '../LabClientProvider';
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
 *
 * Design (fire-and-forget):
 *  - submit() POSTs the job and immediately calls onQueued(project) so the
 *    library can show a placeholder card before the worker starts.
 *  - The editor's render state resets to 'idle' right after POST succeeds,
 *    allowing the user to start composing a new video immediately.
 *  - A background poller updates the library card via onProjectUpdate() and
 *    finally via onCompleted() when the render finishes.
 *  - Multiple renders can be in-flight simultaneously (one poller per render).
 *  - The worker renders one job at a time, oldest first. While a job waits (PENDING) the poller
 *    reports its queue position and does not time out; the render clock starts at PROCESSING.
 *  - Gives up after BLITZ_RENDER_TIMEOUT_MS of rendering, or BLITZ_QUEUE_TIMEOUT_MS in the queue
 *    (worker down). Given-up jobs are listed in `stalled`.
 */
export function useBlitzRender(
  onCompleted: (project: BlitzProjectDto) => void,
  onProjectUpdate?: (project: BlitzProjectDto) => void,
  onQueued?: (project: BlitzProjectDto) => void,
) {
  const client = useLabClient();
  const [state, setState] = useState<RenderState>({ phase: 'idle' });
  // Map of projectId → intervalId for active pollers
  const pollersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  /** projectId → place in the render queue (1 = next) while PENDING. */
  const [queue, setQueue] = useState<Record<string, number>>({});
  /** Jobs the poller gave up on (stuck render or worker down). */
  const [stalled, setStalled] = useState<Record<string, true>>({});

  const setQueuePosition = useCallback((projectId: string, position: number | null) => {
    setQueue((prev) => {
      if ((prev[projectId] ?? null) === position) return prev;
      const next = { ...prev };
      if (position === null) delete next[projectId];
      else next[projectId] = position;
      return next;
    });
  }, []);

  const stopPoller = useCallback((projectId: string) => {
    const id = pollersRef.current.get(projectId);
    if (id != null) {
      clearInterval(id);
      pollersRef.current.delete(projectId);
    }
  }, []);

  const stopAllPollers = useCallback(() => {
    for (const id of pollersRef.current.values()) clearInterval(id);
    pollersRef.current.clear();
  }, []);

  const giveUp = useCallback((projectId: string, message: string) => {
    stopPoller(projectId);
    console.warn(`[blitz-render] Gave up on project ${projectId}: ${message}`);
    setQueuePosition(projectId, null);
    setStalled((prev) => ({ ...prev, [projectId]: true }));
    setState((prev) =>
      prev.phase !== 'idle' && 'projectId' in prev && prev.projectId === projectId ? { phase: 'error', message } : prev,
    );
  }, [stopPoller, setQueuePosition]);

  const startPoller = useCallback((projectId: string) => {
    stopPoller(projectId); // guard against double-start
    const queuedAt = Date.now();
    /** Set when the worker picks the job up: only rendering time counts toward the timeout. */
    let renderingSince: number | null = null;
    console.log(`[blitz-render] Starting poller for project ${projectId}`);

    const intervalId = setInterval(async () => {
      const now = Date.now();
      if (renderingSince !== null && now - renderingSince > BLITZ_RENDER_TIMEOUT_MS) {
        giveUp(projectId, 'Render is taking too long. Try again.');
        return;
      }
      if (renderingSince === null && now - queuedAt > BLITZ_QUEUE_TIMEOUT_MS) {
        giveUp(projectId, 'Still waiting in the queue. Is the blitz-worker running on Railway?');
        return;
      }

      const res = await blitzApi.getProject(client, projectId).catch((err) => {
        console.warn(`[blitz-render] Poll fetch error for project ${projectId}:`, err);
        return null;
      });

      const project = res?.ok ? res.data.project : null;
      if (!project) {
        console.warn(`[blitz-render] Poll returned no project for ${projectId}, res.ok=${res?.ok}`);
        return;
      }

      onProjectUpdate?.(project);

      if (project.renderStatus === 'PENDING') {
        // Back in the queue (e.g. its worker restarted): the render clock starts again.
        renderingSince = null;
        setQueuePosition(projectId, res?.data.queuePosition ?? null);
        return;
      }
      setQueuePosition(projectId, null);

      if (project.renderStatus === 'COMPLETED') {
        stopPoller(projectId);
        console.log(`[blitz-render] Project ${projectId} COMPLETED`);
        onCompleted(project);
      } else if (project.renderStatus === 'FAILED') {
        stopPoller(projectId);
        console.error(`[blitz-render] Project ${projectId} FAILED`);
        setState((prev) =>
          prev.phase !== 'idle' && 'projectId' in prev && prev.projectId === projectId
            ? { phase: 'error', message: 'Render failed. Check the worker logs.' }
            : prev,
        );
      } else if (project.renderStatus === 'PROCESSING') {
        renderingSince ??= now;
        setState((prev) =>
          prev.phase !== 'idle' && 'projectId' in prev && prev.projectId === projectId
            ? { phase: 'rendering', projectId }
            : prev,
        );
      }
    }, BLITZ_POLL_INTERVAL_MS);

    pollersRef.current.set(projectId, intervalId);
  }, [client, stopPoller, giveUp, setQueuePosition, onCompleted, onProjectUpdate]);

  /** Queues a render. Resolves to the new project id, or null when the request failed (`onError` gets the reason,
   *  e.g. "Not enough credits"). */
  const submit = useCallback(async (body: RenderBody, onError?: (message: string) => void): Promise<string | null> => {
    setState({ phase: 'submitting' });
    console.log('[blitz-render] Submitting render job…', body);

    const res = await blitzApi.triggerRender(client, body).catch((err) => {
      console.error('[blitz-render] triggerRender fetch error:', err);
      return null;
    });

    if (!res?.ok) {
      console.error('[blitz-render] Render request failed:', res?.data);
      const message = res ? errorOf(res) : 'Render request failed';
      setState({ phase: 'error', message });
      onError?.(message);
      return null;
    }

    const projectId = res.data.projectId;
    const project = res.data.project;
    console.log(`[blitz-render] Job queued — projectId=${projectId}, status=${project?.renderStatus}`);

    // Show the placeholder card in the library immediately
    if (project) onQueued?.(project);

    // Reset the editor render state so the user can start a new video right away
    setState({ phase: 'idle' });

    // Background polling — updates the library card until COMPLETED / FAILED
    startPoller(projectId);
    return projectId;
  }, [client, startPoller, onQueued]);

  // Cleanup all pollers on unmount
  useEffect(() => stopAllPollers, [stopAllPollers]);

  // isBusy = only during the initial POST (submitting phase)
  const isBusy = state.phase === 'submitting';
  // watch: resume polling a render queued earlier (e.g. a deck restored after leaving the page).
  return { state, submit, isBusy, queue, stalled, watch: startPoller };
}
