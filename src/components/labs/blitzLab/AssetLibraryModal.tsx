'use client';

/**
 * Asset library modal (meme / background / audio).
 *
 * Tabs depend on the layer type:
 *   BACKGROUND → Library | Photos (AI) | My uploads
 *   OVERLAY    → Library | My uploads
 *   AUDIO      → Library | My uploads
 *
 * The "Photos (AI)" tab shows AI-generated image assets (source === 'library') and
 * a Nano Banana 2 Lite generator. User-uploaded files appear only in "My uploads".
 */

import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useLabClient } from '../LabClientProvider';
import { blitzApi, type BlitzAssetDto } from './api';
import { AssetCard } from './AssetCard';
import { CloseIcon, LibraryIcon, MusicIcon, UploadIcon } from './icons';
import { BLITZ_ACCEPT, type BlitzUploadType } from './upload';
import { isLocalKey } from './useBlitzUploads';

const TITLES: Record<BlitzUploadType, string> = {
  OVERLAY: 'Select Meme',
  BACKGROUND: 'Select Background',
  AUDIO: 'Select Audio',
  HOOK: 'Select Hook Video',
};

const UPLOAD_HINT: Record<BlitzUploadType, string> = {
  OVERLAY: 'MP4, MOV or WebM. Transparent WebM works best.',
  BACKGROUND: 'Video or image (MP4, MOV, WebM, JPG, PNG, WebP).',
  AUDIO: 'MP3, M4A, WAV, AAC or OGG.',
  HOOK: 'MP4, MOV or WebM.',
};

type Tab = 'library' | 'upload' | 'photos';

type AssetLibraryModalProps = {
  type: BlitzUploadType;
  assets: BlitzAssetDto[];
  currentKey: string;
  onSelect: (key: string) => void;
  onPickFile: (file: File) => void;
  onRename: (id: string, name: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onClose: () => void;
  /**
   * Called after a background is AI-generated so the parent can add it to its
   * assets state. The new asset will then appear in the Photos grid.
   */
  onAssetCreated?: (asset: BlitzAssetDto) => void;
};

export function AssetLibraryModal({
  type,
  assets,
  currentKey,
  onSelect,
  onPickFile,
  onRename,
  onDelete,
  onClose,
  onAssetCreated,
}: AssetLibraryModalProps) {
  const client = useLabClient();
  const ofType = useMemo(() => assets.filter((a) => a.type === type && !isLocalKey(a.r2Key)), [assets, type]);
  const hasLibrary = ofType.some((a) => a.source === 'library');
  const isBackground = type === 'BACKGROUND';

  const [tab, setTab] = useState<Tab>(() => {
    if (isBackground) return hasLibrary ? 'library' : 'photos';
    return hasLibrary ? 'library' : 'upload';
  });
  const [query, setQuery] = useState('');

  // AI generation state (Photos tab)
  const [genPrompt, setGenPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  // Photos (AI) tab: only library-sourced image assets (AI-generated, not user uploads)
  const photoAssets = useMemo(
    () => ofType.filter((a) => a.mediaKind === 'image' && a.source === 'library'),
    [ofType],
  );

  // Library / My uploads tab assets
  const shown = useMemo(() => {
    if (tab === 'photos') return [];
    return ofType.filter((a) => a.source === tab && (!q || a.name.toLowerCase().includes(q)));
  }, [ofType, tab, q]);

  const pick = (key: string) => { onSelect(key); onClose(); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onPickFile(file);
    onClose();
  };

  const handleGenerate = async () => {
    const prompt = genPrompt.trim();
    if (!prompt) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await blitzApi.generateBackground(client, prompt);
      if (!res.ok || !res.data.asset) {
        setGenError(res.data.error ?? 'Generation failed — please try again.');
        return;
      }
      const asset = res.data.asset;
      onAssetCreated?.(asset);
      // Clear prompt after success
      setGenPrompt('');
    } catch {
      setGenError('Network error — please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Define tab config
  type TabCfg = { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> };
  const tabConfigs: TabCfg[] = [
    { id: 'library', label: 'Library', Icon: LibraryIcon },
    ...(isBackground ? [{ id: 'photos' as const, label: 'Photos (AI)', Icon: ImagePlus }] : []),
    { id: 'upload', label: 'My uploads', Icon: UploadIcon },
  ];

  // Audio cards are shown at roughly half size — more columns + square aspect ratio
  const isAudio = type === 'AUDIO';
  const gridCols = isAudio
    ? 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6'
    : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[type]}
    >
      <div
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[85vh] sm:rounded-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-[18px] font-semibold text-ink">{TITLES[type]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        {/* Tab bar */}
        <div
          className="border-b border-line dark:border-neutral-800"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${tabConfigs.length}, 1fr)` }}
        >
          {tabConfigs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'flex min-h-11 items-center justify-center gap-2 text-[13px] font-medium transition-colors',
                tab === id
                  ? 'border-b-2 border-orange-500 bg-orange-50/60 text-orange-600 dark:bg-orange-950/30'
                  : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Search bar (not shown for Photos tab which has its own prompt input) */}
        {tab !== 'photos' && (
          <div className="flex items-center gap-2 border-b border-line bg-surface-alt/50 px-4 py-2.5 sm:px-6 dark:border-neutral-800">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="min-h-10 w-full max-w-xs rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-orange-400/40 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        )}

        {/* ── Photos (AI) tab ──────────────────────────────────────────── */}
        {tab === 'photos' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Generate section */}
            <div className="border-b border-line bg-surface-alt/50 px-4 py-3 sm:px-6 dark:border-neutral-800">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Generate AI Background — 9:16 Vertical · Nano Banana 2 Lite
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !generating) void handleGenerate(); }}
                  placeholder="Paste the background prompt from the template, or write your own…"
                  className="min-h-10 flex-1 rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-orange-400/40 dark:border-neutral-700 dark:bg-neutral-800"
                  disabled={generating}
                />
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generating || !genPrompt.trim()}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
              {genError && (
                <p className="mt-2 text-[12px] text-red-600">{genError}</p>
              )}
              {generating && (
                <p className="mt-2 text-[11px] text-muted">
                  Generating your background (usually 10–30 s)…
                </p>
              )}
            </div>

            {/* Photo grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
                {photoAssets.filter((a) => !q || a.name.toLowerCase().includes(q)).map((asset) => (
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
              {photoAssets.length === 0 && !generating && (
                <p className="py-12 text-center text-[13px] text-muted">
                  No AI-generated backgrounds yet. Generate one above using the prompt field.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Library / My uploads tab ─────────────────────────────────── */}
        {tab !== 'photos' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
              {/* "No Sound" tile — audio library only */}
              {type === 'AUDIO' && tab === 'library' && (
                <button
                  type="button"
                  onClick={() => pick('')}
                  className={[
                    'flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-neutral-900',
                    !currentKey
                      ? 'border-orange-500 ring-2 ring-orange-500/40'
                      : 'border-line hover:border-orange-300 dark:border-neutral-800',
                  ].join(' ')}
                  aria-label="No sound"
                >
                  <div className="flex flex-1 w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-muted relative">
                    <MusicIcon className="h-5 w-5 opacity-30" />
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
              {/* Upload tile */}
              {tab === 'upload' && (
                <label className={`flex ${isAudio ? 'aspect-square' : 'aspect-[3/4]'} cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-3 text-center text-muted transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 dark:border-neutral-700 dark:hover:bg-orange-950/30`}>
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
                  aspectClass={isAudio ? 'aspect-square' : 'aspect-[3/4]'}
                />
              ))}
            </div>
            {shown.length === 0 && tab === 'library' && (
              <p className="py-12 text-center text-[13px] text-muted">
                {q
                  ? 'No match. Try another word.'
                  : 'The library is empty for now. Upload your own file in My uploads.'}
              </p>
            )}
          </div>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 sm:px-6 dark:border-neutral-800">
          {type === 'AUDIO' && currentKey ? (
            <button
              type="button"
              onClick={() => pick('')}
              className="min-h-10 rounded-lg px-3 text-[13px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
            >
              Remove audio
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-lg border border-line px-4 text-[13px] text-ink transition-colors hover:bg-surface-alt"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
