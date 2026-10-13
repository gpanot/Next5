'use client';

/** "Generate Descriptions" action of the Assets Library: describes new or failed assets with Gemini, two at a time. */

import { useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { LibrarySection as Section } from './LibrarySelectGrid';

// ── Generate Descriptions button ──────────────────────────────────────────────

type GenState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'ready'; newCount: number; retryCount: number; total: number; assets: { id: string; name: string; r2Key: string }[]; retryAssets: { id: string; name: string; r2Key: string }[] }
  | { phase: 'running'; done: number; total: number; failed: number; totalCost: number }
  | { phase: 'done'; done: number; total: number; failed: number; totalCost: number };

/** Sections that support the "Generate Descriptions" action */
const DESCRIBABLE_SECTIONS: Section[] = ['memes', 'videos', 'hookVideos', 'sounds'];

export function GenerateDescriptionsButton({ section, token }: { section: Section; token: string }) {
  const [state, setState] = useState<GenState>({ phase: 'idle' });
  const abortRef = useRef(false);

  if (!DESCRIBABLE_SECTIONS.includes(section)) return null;

  const check = async () => {
    setState({ phase: 'checking' });
    try {
      const res = await fetch(`/api/admin/assets-library/generate-descriptions?section=${section}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as {
        total: number; done: number; failed: number;
        pending: number; retryable: number;
        assets: { id: string; name: string; r2Key: string }[];
      };
      // assets[] from API = new ones first, then retryable
      const newAssets    = data.assets.slice(0, data.pending);
      const retryAssets  = data.assets.slice(data.pending);

      if (data.pending === 0 && data.retryable === 0) {
        setState({ phase: 'done', done: data.done, total: data.total, failed: 0, totalCost: 0 });
      } else {
        setState({
          phase: 'ready',
          newCount: data.pending,
          retryCount: data.retryable,
          total: data.total,
          assets: newAssets,
          retryAssets,
        });
      }
    } catch {
      setState({ phase: 'idle' });
    }
  };

  const run = async (assets: { id: string; name: string; r2Key: string }[]) => {
    abortRef.current = false;
    setState({ phase: 'running', done: 0, total: assets.length, failed: 0, totalCost: 0 });

    let done = 0; let failed = 0; let totalCost = 0;
    const CONCURRENCY = 2;
    let idx = 0;

    const worker = async () => {
      while (idx < assets.length && !abortRef.current) {
        const asset = assets[idx++]!;
        try {
          const res = await fetch('/api/admin/assets-library/generate-descriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ section, assetId: asset.id }),
          });
          const d = await res.json() as { success: boolean; costUsd?: number };
          if (d.success) { done++; totalCost += d.costUsd ?? 0; }
          else { failed++; }
        } catch { failed++; }
        setState({ phase: 'running', done: done + failed, total: assets.length, failed, totalCost });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    setState({ phase: 'done', done, total: assets.length, failed, totalCost });
  };

  if (state.phase === 'idle') {
    return (
      <button
        type="button"
        onClick={() => void check()}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Generate Descriptions
      </button>
    );
  }

  if (state.phase === 'checking') {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking…
      </div>
    );
  }

  if (state.phase === 'ready') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* New assets badge */}
        {state.newCount > 0 && (
          <span className="text-[12px] text-muted">
            <span className="font-semibold text-purple-700">{state.newCount}</span> new
          </span>
        )}
        {/* Failed / retry badge */}
        {state.retryCount > 0 && (
          <span className="text-[12px] text-muted">
            {state.newCount > 0 && '· '}
            <span className="font-semibold text-amber-600">{state.retryCount}</span> failed (retry)
          </span>
        )}
        {/* Run new only */}
        {state.newCount > 0 && (
          <button
            type="button"
            onClick={() => void run(state.assets)}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-purple-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Describe {state.newCount} new
          </button>
        )}
        {/* Retry failed */}
        {state.retryCount > 0 && (
          <button
            type="button"
            onClick={() => void run([...state.assets, ...state.retryAssets])}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            Retry {state.retryCount} failed
          </button>
        )}
        <button type="button" onClick={() => setState({ phase: 'idle' })} className="text-[11px] text-muted hover:text-ink">Cancel</button>
      </div>
    );
  }

  if (state.phase === 'running') {
    const pct = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-[12px]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
            <span className="font-semibold text-purple-700">{state.done}</span>
            <span className="text-muted">/ {state.total}</span>
            {state.failed > 0 && <span className="text-red-500">({state.failed} failed)</span>}
            <span className="text-muted text-[11px]">${state.totalCost.toFixed(4)}</span>
          </div>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => { abortRef.current = true; }}
          className="text-[11px] text-muted hover:text-red-500"
        >
          Stop
        </button>
      </div>
    );
  }

  // done
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-green-700 font-medium">
        ✓ {state.done} described{state.failed > 0 ? `, ${state.failed} failed` : ''} · ${state.totalCost.toFixed(4)}
      </span>
      <button type="button" onClick={() => setState({ phase: 'idle' })} className="text-[11px] text-muted hover:text-ink">Reset</button>
    </div>
  );
}
