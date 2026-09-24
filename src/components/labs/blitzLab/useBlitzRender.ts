'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BLITZ_POLL_INTERVAL_MS, BLITZ_RENDER_TIMEOUT_MS } from '../../../config/blitzLab';
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
 *  - Stops polling with a timeout error after BLITZ_RENDER_TIMEOUT_MS.
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

  const startPoller = useCallback((projectId: string) => {
    stopPoller(projectId); // guard against double-start
    const startedAt = Date.now();
    console.log(`[blitz-render] Starting poller for project ${projectId}`);

    const intervalId = setInterval(async () => {
      if (Date.now() - startedAt > BLITZ_RENDER_TIMEOUT_MS) {
        stopPoller(projectId);
        console.warn(`[blitz-render] Render timed out for project ${projectId}`);
        setState((prev) =>
          prev.phase !== 'idle' && 'projectId' in prev && prev.projectId === projectId
            ? { phase: 'error', message: 'Render timed out. Is the blitz-worker running on Railway?' }
            : prev,
        );
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

      console.log(`[blitz-render] Project ${projectId} status: ${project.renderStatus}`);
      onProjectUpdate?.(project);

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
        setState((prev) =>
          prev.phase !== 'idle' && 'projectId' in prev && prev.projectId === projectId
            ? { phase: 'rendering', projectId }
            : prev,
        );
      }
    }, BLITZ_POLL_INTERVAL_MS);

    pollersRef.current.set(projectId, intervalId);
  }, [client, stopPoller, onCompleted, onProjectUpdate]);

  const submit = useCallback(async (body: RenderBody) => {
    setState({ phase: 'submitting' });
    console.log('[blitz-render] Submitting render job…', body);

    const res = await blitzApi.triggerRender(client, body).catch((err) => {
      console.error('[blitz-render] triggerRender fetch error:', err);
      return null;
    });

    if (!res?.ok) {
      console.error('[blitz-render] Render request failed:', res?.data);
      setState({ phase: 'error', message: res?.data?.error ?? 'Render request failed' });
      return;
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
  }, [client, startPoller, onQueued]);

  // Cleanup all pollers on unmount
  useEffect(() => stopAllPollers, [stopAllPollers]);

  // isBusy = only during the initial POST (submitting phase)
  const isBusy = state.phase === 'submitting';
  return { state, submit, isBusy };
}
