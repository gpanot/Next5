'use client';

import { useState } from 'react';
import { WORKSPACE_ASSET_LABELS, type WorkspaceAssetDto } from '../../../types/admin/workspaceAssets';

const COPIED_MS = 1500;

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {copied ? <path d="M20 6 9 17l-5-5" /> : <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>}
    </svg>
  );
}

function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const done = await navigator.clipboard.writeText(prompt).then(() => true, () => false);
    if (!done) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_MS);
  };
  const label = copied ? 'Prompt copied' : 'Copy prompt';
  return (
    <button onClick={copy} aria-label={label} title={label} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 hover:text-ink active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
      <CopyIcon copied={copied} />
    </button>
  );
}

const madeAt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** One generated picture beside its prompt. The picture opens full size in a new tab. */
export function AssetCard({ asset }: { asset: WorkspaceAssetDto }) {
  return (
    <article className="flex gap-3 rounded-xl border border-line bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <a href={asset.fullUrl} target="_blank" rel="noopener noreferrer" className="w-28 shrink-0 self-start overflow-hidden rounded-lg bg-zinc-100 transition hover:opacity-90 dark:bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed thumbnail route */}
        <img src={asset.thumbUrl} alt={asset.prompt.slice(0, 120)} loading="lazy" className="aspect-[9/16] w-full object-cover" />
      </a>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink dark:text-zinc-100">{WORKSPACE_ASSET_LABELS[asset.type]}</p>
            <p className="truncate text-xs text-muted">{madeAt(asset.createdAt)}{asset.model ? ` · ${asset.model}` : ''}</p>
          </div>
          <CopyPromptButton prompt={asset.prompt} />
        </header>
        <p className="max-h-40 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-ink dark:text-zinc-300">{asset.prompt}</p>
      </div>
    </article>
  );
}
