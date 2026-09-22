'use client';

import { useRef, useState } from 'react';
import type { BlitzAssetDto } from './api';
import { CheckIcon, CloseIcon, MusicIcon, PauseIcon, PencilIcon, PlayIcon, TrashIcon } from './icons';

type AssetCardProps = {
  asset: BlitzAssetDto;
  selected: boolean;
  onSelect: () => void;
  /** Present only for the user's own uploads. Resolve with an error message, or null on success. */
  onRename?: (name: string) => Promise<string | null>;
  onDelete?: () => Promise<string | null>;
};

/** Preview: video plays on hover (handled by the card), image shows as-is, audio has a play button. */
function AssetPreview({ asset }: { asset: BlitzAssetDto }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  if (asset.mediaKind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset.thumbnailUrl ?? asset.url} alt="" className="h-full w-full object-cover" loading="lazy" />;
  }
  if (asset.mediaKind === 'audio') {
    const toggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = audioRef.current;
      if (!el) return;
      if (el.paused) void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      else { el.pause(); setPlaying(false); }
    };
    return (
      <div className="flex h-full w-full items-center justify-center bg-orange-50 text-orange-600 dark:bg-neutral-800">
        <MusicIcon className="h-8 w-8" />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause preview' : 'Play preview'}
          className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-transform hover:scale-105"
        >
          {playing ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
        </button>
        <audio ref={audioRef} src={asset.url} preload="none" onEnded={() => setPlaying(false)} />
      </div>
    );
  }
  return (
    <video
      src={`${asset.url}#t=0.5`}
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full bg-neutral-900 object-contain"
    />
  );
}

/** One tile in the asset library grid. */
export function AssetCard({ asset, selected, onSelect, onRename, onDelete }: AssetCardProps) {
  const [mode, setMode] = useState<'view' | 'rename' | 'confirmDelete'>('view');
  const [draft, setDraft] = useState(asset.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const err = await action();
    setBusy(false);
    if (err) setError(err);
    else setMode('view');
  };

  const saveRename = () => {
    const name = draft.trim();
    if (!onRename || !name || name === asset.name) { setMode('view'); return; }
    void run(() => onRename(name));
  };

  return (
    <div
      className={[
        'group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-neutral-900',
        selected ? 'border-orange-500 ring-2 ring-orange-500/40' : 'border-line hover:border-orange-300 dark:border-neutral-800',
      ].join(' ')}
    >
      <div
        className="relative aspect-[3/4] w-full overflow-hidden"
        onMouseEnter={(e) => void e.currentTarget.querySelector('video')?.play().catch(() => undefined)}
        onMouseLeave={(e) => e.currentTarget.querySelector('video')?.pause()}
      >
        <AssetPreview asset={asset} />
        {/* Full-tile select target; the audio play button sits above it (z-10). */}
        <button type="button" onClick={onSelect} className="absolute inset-0" aria-label={`Use ${asset.name}`} />
        {selected && (
          <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <CheckIcon className="h-3 w-3" /> In use
          </span>
        )}
      </div>

      <div className="flex min-h-11 items-center gap-1 px-2 py-1.5">
        {mode === 'rename' ? (
          <>
            <input
              autoFocus
              value={draft}
              maxLength={120}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setMode('view'); }}
              className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-orange-400/40 dark:bg-neutral-800"
            />
            <IconButton label="Save name" onClick={saveRename} disabled={busy}><CheckIcon /></IconButton>
            <IconButton label="Cancel rename" onClick={() => setMode('view')}><CloseIcon /></IconButton>
          </>
        ) : mode === 'confirmDelete' ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[12px] text-red-600">Delete?</span>
            <button type="button" disabled={busy} onClick={() => onDelete && void run(onDelete)} className="min-h-8 rounded-md bg-red-600 px-2 text-[11px] font-semibold text-white disabled:opacity-50">
              {busy ? '…' : 'Delete'}
            </button>
            <IconButton label="Keep file" onClick={() => setMode('view')}><CloseIcon /></IconButton>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink" title={asset.name}>{asset.name}</span>
            {onRename && <IconButton label="Rename" onClick={() => { setDraft(asset.name); setMode('rename'); }}><PencilIcon /></IconButton>}
            {onDelete && <IconButton label="Delete" onClick={() => setMode('confirmDelete')} danger><TrashIcon /></IconButton>}
          </>
        )}
      </div>
      {error && <p className="px-2 pb-2 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors disabled:opacity-40',
        danger ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950' : 'hover:bg-surface-alt hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
