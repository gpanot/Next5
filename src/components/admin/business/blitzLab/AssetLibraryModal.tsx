'use client';

/**
 * Asset library modal (meme / background / audio).
 *
 * Two tabs, like the Fastlane picker:
 *   • Library    — curated assets (read-only; later fed from external sources)
 *   • My uploads — the user's own files: upload, rename, delete
 * Search filters by name. Picking an asset closes the modal.
 */

import { useEffect, useMemo, useState } from 'react';
import type { BlitzAssetDto } from './api';
import { AssetCard } from './AssetCard';
import { CloseIcon, LibraryIcon, MusicIcon, UploadIcon } from './icons';
import { BLITZ_ACCEPT, type BlitzUploadType } from './upload';
import { isLocalKey } from './useBlitzUploads';

const TITLES: Record<BlitzUploadType, string> = {
  OVERLAY: 'Select Meme',
  BACKGROUND: 'Select Background',
  AUDIO: 'Select Audio',
};

const UPLOAD_HINT: Record<BlitzUploadType, string> = {
  OVERLAY: 'MP4, MOV or WebM. Transparent WebM works best.',
  BACKGROUND: 'Video or image (MP4, MOV, WebM, JPG, PNG, WebP).',
  AUDIO: 'MP3, M4A, WAV, AAC or OGG.',
};

type Tab = 'library' | 'upload';

type AssetLibraryModalProps = {
  type: BlitzUploadType;
  assets: BlitzAssetDto[];
  currentKey: string;
  onSelect: (key: string) => void;
  onPickFile: (file: File) => void;
  onRename: (id: string, name: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onClose: () => void;
};

export function AssetLibraryModal({ type, assets, currentKey, onSelect, onPickFile, onRename, onDelete, onClose }: AssetLibraryModalProps) {
  const ofType = useMemo(() => assets.filter((a) => a.type === type && !isLocalKey(a.r2Key)), [assets, type]);
  const hasLibrary = ofType.some((a) => a.source === 'library');
  const [tab, setTab] = useState<Tab>(hasLibrary ? 'library' : 'upload');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const shown = ofType.filter((a) => a.source === tab && (!q || a.name.toLowerCase().includes(q)));
  const pick = (key: string) => { onSelect(key); onClose(); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onPickFile(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={TITLES[type]}>
      <div
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[85vh] sm:rounded-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-[18px] font-semibold text-ink">{TITLES[type]}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink">
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="grid grid-cols-2 border-b border-line dark:border-neutral-800">
          {([['library', 'Library', LibraryIcon], ['upload', 'My uploads', UploadIcon]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'flex min-h-11 items-center justify-center gap-2 text-[13px] font-medium transition-colors',
                tab === id ? 'border-b-2 border-orange-500 bg-orange-50/60 text-orange-600 dark:bg-orange-950/30' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 border-b border-line bg-surface-alt/50 px-4 py-2.5 sm:px-6 dark:border-neutral-800">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="min-h-10 w-full max-w-xs rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-orange-400/40 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 sm:gap-3">
            {/* "No Sound" tile — shown first in the audio library tab */}
            {type === 'AUDIO' && tab === 'library' && (
              <button
                type="button"
                onClick={() => pick('')}
                className={[
                  'flex aspect-[3/4] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-neutral-900',
                  !currentKey
                    ? 'border-orange-500 ring-2 ring-orange-500/40'
                    : 'border-line hover:border-orange-300 dark:border-neutral-800',
                ].join(' ')}
                aria-label="No sound"
              >
                <div className="flex flex-1 w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-muted relative">
                  <MusicIcon className="h-5 w-5 opacity-30" />
                  {/* strikethrough line */}
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="block h-px w-8 rotate-45 bg-muted/60" />
                  </span>
                  {!currentKey && (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      ✓ In use
                    </span>
                  )}
                </div>
                <span className="pb-1.5 text-[11px] text-ink font-medium">No Sound</span>
              </button>
            )}
            {tab === 'upload' && (
              <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-3 text-center text-muted transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 dark:border-neutral-700 dark:hover:bg-orange-950/30">
                <UploadIcon className="h-5 w-5" />
                <span className="text-[12px] font-semibold">Upload</span>
                <span className="text-[10px] leading-snug">{UPLOAD_HINT[type]}</span>
                <input type="file" accept={BLITZ_ACCEPT[type]} onChange={handleFile} className="sr-only" />
              </label>
            )}
            {shown.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={asset.r2Key === currentKey}
                onSelect={() => pick(asset.r2Key)}
                onRename={asset.source === 'upload' ? (name) => onRename(asset.id, name) : undefined}
                onDelete={asset.source === 'upload' ? () => onDelete(asset.id) : undefined}
              />
            ))}
          </div>
          {shown.length === 0 && tab === 'library' && (
            <p className="py-12 text-center text-[13px] text-muted">
              {q ? 'No match. Try another word.' : 'The library is empty for now. Upload your own file in My uploads.'}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 sm:px-6 dark:border-neutral-800">
          {type === 'AUDIO' && currentKey ? (
            <button type="button" onClick={() => pick('')} className="min-h-10 rounded-lg px-3 text-[13px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950">
              Remove audio
            </button>
          ) : <span />}
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-line px-4 text-[13px] text-ink transition-colors hover:bg-surface-alt">
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
