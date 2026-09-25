'use client';

/**
 * Assets Library — admin-only view of all raw creative assets.
 *
 * Sections
 *   Memes        BlitzAsset type=OVERLAY       (video meme clips)
 *   Videos       BlitzAsset type=BACKGROUND    (scraped videos, not AI images)
 *   Sounds       BlitzAsset type=AUDIO
 *   AI Pictures  BlitzAsset type=BACKGROUND    (AI-generated still images)
 *   UGC Videos   UgcVideo rows (status=ready, Next5-owned)
 *
 * Card components are intentionally the same as those used in the Blitz Lab
 * AssetLibraryModal — just without the select/rename/delete interactions.
 *
 * "See Description" button on Memes, Videos and Sounds fetches and expands
 * the AssetDescriptor (Gemini extraction) inline below the card.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Film, ImageIcon, Layers, Loader2, Music, Pause, Play, Plus, Search, Sparkles, Upload, Video, Volume2, VolumeX, X, Zap } from 'lucide-react';
import type { BlitzAssetDto } from '../../labs/blitzLab/api';
import type { UgcVideoDto } from '../../../types/admin/ugc';
import { createAdminLabClient } from '../../labs/labClient';
import { uploadBlitzAsset, BLITZ_ACCEPT } from '../../labs/blitzLab/upload';
import { DescriptionPanel } from './AssetDescriptionPanel';
import type { BlitzUploadType } from '../../labs/blitzLab/upload';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'memes' | 'videos' | 'sounds' | 'aiPictures' | 'ugcVideos' | 'hookVideos';

type LibraryData = {
  memes: BlitzAssetDto[];
  videos: BlitzAssetDto[];
  sounds: BlitzAssetDto[];
  aiPictures: BlitzAssetDto[];
  ugcVideos: UgcVideoDto[];
  hookVideos: BlitzAssetDto[];
  counts: Record<Section, number>;
};


// ── Section → upload type mapping ────────────────────────────────────────────

/** Which BlitzUploadType backs each section (null = no direct upload). */
const SECTION_UPLOAD_TYPE: Partial<Record<Section, BlitzUploadType>> = {
  memes:      'OVERLAY',
  videos:     'BACKGROUND',
  sounds:     'AUDIO',
  aiPictures: 'BACKGROUND',
  hookVideos: 'HOOK',
};

// ── Upload card + modal ───────────────────────────────────────────────────────

type UploadState =
  | { phase: 'idle' }
  | { phase: 'picking' }         // file dialog open
  | { phase: 'uploading'; progress: number; fileName: string }
  | { phase: 'done'; asset: BlitzAssetDto }
  | { phase: 'error'; message: string };

/**
 * Inline upload modal — triggered by the "+ Add" empty card.
 * Handles the full presign → PUT → register flow using the existing blitz upload util.
 */
function UploadModal({
  section,
  token,
  onClose,
  onUploaded,
}: {
  section: Section;
  token: string;
  onClose: () => void;
  onUploaded: (asset: BlitzAssetDto) => void;
}) {
  const uploadType = SECTION_UPLOAD_TYPE[section]!;
  const [state, setState] = useState<UploadState>({ phase: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);
  const client = useMemo(() => createAdminLabClient(token), [token]);

  // Section-specific accept string; for aiPictures we want images only
  const accept = useMemo(() => {
    if (section === 'aiPictures') return 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';
    if (section === 'videos') return 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
    return BLITZ_ACCEPT[uploadType];
  }, [section, uploadType]);

  const handleFile = useCallback(async (file: File) => {
    setState({ phase: 'uploading', progress: 0, fileName: file.name });
    try {
      const asset = await uploadBlitzAsset(
        client,
        uploadType,
        file,
        (frac) => setState({ phase: 'uploading', progress: frac, fileName: file.name }),
      );
      setState({ phase: 'done', asset });
      onUploaded(asset);
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Upload failed' });
    }
  }, [client, uploadType, onUploaded]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // reset input so same file can be re-picked after error
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const sectionLabel: Record<Section, string> = {
    memes:      'Meme (video)',
    videos:     'Background video',
    sounds:     'Sound / music',
    aiPictures: 'AI picture (image)',
    ugcVideos:  'UGC video',
    hookVideos: 'Hook video',
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Upload asset</h2>
            <p className="mt-0.5 text-[12px] text-muted">{sectionLabel[section]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drop zone / progress */}
        {(state.phase === 'idle' || state.phase === 'picking') && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line bg-surface p-8 transition-colors hover:border-orange-300 hover:bg-orange-50/30 cursor-pointer"
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-ink">Drop file here or click to browse</p>
              <p className="mt-1 text-[11px] text-muted">
                {section === 'sounds' ? 'MP3, M4A, AAC, WAV, OGG' :
                 section === 'aiPictures' ? 'JPG, PNG, WebP, GIF' :
                 'MP4, WebM, MOV'}
              </p>
            </div>
          </div>
        )}

        {state.phase === 'uploading' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <div className="w-full">
              <div className="mb-1.5 flex justify-between text-[11px] text-muted">
                <span className="max-w-[70%] truncate">{state.fileName}</span>
                <span>{Math.round(state.progress * 100)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-150"
                  style={{ width: `${Math.round(state.progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {state.phase === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <span className="text-xl">✓</span>
            </div>
            <p className="text-[13px] font-medium text-ink">Uploaded successfully!</p>
            <p className="max-w-xs truncate text-[11px] text-muted">{state.asset.name}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => { setState({ phase: 'idle' }); fileRef.current?.click(); }}
                className="rounded-lg border border-line px-4 py-2 text-[12px] font-medium text-ink transition-colors hover:bg-surface-alt"
              >
                Upload another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-orange-500 px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-orange-600"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <X className="h-5 w-5" />
            </div>
            <p className="text-[13px] font-medium text-ink">Upload failed</p>
            <p className="text-[11px] text-red-600">{state.message}</p>
            <button
              type="button"
              onClick={() => setState({ phase: 'idle' })}
              className="mt-1 rounded-lg border border-line px-4 py-2 text-[12px] font-medium text-ink transition-colors hover:bg-surface-alt"
            >
              Try again
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onInputChange} />
      </div>
    </div>
  );
}

/**
 * The "+ Add" empty card that opens the upload modal when clicked.
 * Matches the aspect ratio and visual weight of the real asset cards.
 */
function AddAssetCard({ onClick, isAudio }: { onClick: () => void; isAudio?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-line bg-white text-muted transition-all',
        'hover:border-orange-400 hover:bg-orange-50/40 hover:text-orange-500',
        isAudio ? 'p-6' : '',
      ].join(' ')}
      style={isAudio ? undefined : { aspectRatio: '9/16' }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-current transition-colors group-hover:border-orange-400">
        <Plus className="h-4 w-4" />
      </div>
      <span className="text-[11px] font-medium">Add</span>
    </button>
  );
}

async function fetchLibrary(token: string): Promise<LibraryData> {
  const res = await fetch('/api/admin/assets-library', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LibraryData>;
}

// ── Stat badge ────────────────────────────────────────────────────────────────

function CountBadge({ n }: { n: number }) {
  return (
    <span className="ml-1.5 rounded-full bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
      {n.toLocaleString()}
    </span>
  );
}

// ── Section nav item ──────────────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'memes',      label: 'Memes',        Icon: Layers   },
  { id: 'videos',     label: 'Videos',       Icon: Video    },
  { id: 'sounds',     label: 'Sounds',       Icon: Music    },
  { id: 'aiPictures', label: 'AI Pictures',  Icon: ImageIcon },
  { id: 'ugcVideos',  label: 'UGC Videos',   Icon: Film     },
  { id: 'hookVideos', label: 'Hook Videos',  Icon: Zap      },
];

// ── Asset preview cards (reusing BlitzLab's visual style) ────────────────────

/** Video asset card (Memes + Videos) — plays on hover, click to toggle mute + "See Description" expand. */
function VideoCard({ asset, token }: { asset: BlitzAssetDto; token: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ref.current) return;
    const next = !ref.current.muted;
    ref.current.muted = next;
    setMuted(next);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900"
        onMouseEnter={() => ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => {
          if (ref.current) {
            ref.current.pause();
            ref.current.currentTime = 0;
            ref.current.muted = true;
            setMuted(true);
          }
        }}
      >
        <video
          ref={ref}
          src={asset.url}
          poster={asset.thumbnailUrl ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-contain"
        />
        {/* Mute/unmute button — always visible */}
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted
            ? <VolumeX className="h-3 w-3" />
            : <Volume2 className="h-3 w-3" />
          }
        </button>
      </div>
      <div className="min-h-8 px-2 py-1.5">
        <p className="truncate text-[11px] text-ink" title={asset.name}>{asset.name}</p>
      </div>
      <DescriptionPanel token={token} assetId={asset.id} />
    </div>
  );
}

/** Expandable prompt panel for AI-generated images (no AssetDescriptor — name IS the prompt). */
function ImagePromptPanel({ asset }: { asset: BlitzAssetDto }) {
  const [open, setOpen] = useState(false);
  const isAi = asset.name.includes('[AI]') || asset.source === 'library';
  const prompt = asset.name;

  return (
    <div className="border-t border-line/60">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-alt hover:text-ink"
      >
        <span>See Description</span>
        {open ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
      </button>
      {open && (
        <div className="bg-surface-alt/60 px-2 pb-2.5 pt-1">
          {isAi && (
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-subtle">Generation prompt</p>
          )}
          <p className="text-[10.5px] text-ink leading-relaxed">{prompt}</p>
        </div>
      )}
    </div>
  );
}

/** Image asset card — with prompt description panel. */
function ImageCard({ asset }: { asset: BlitzAssetDto }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.thumbnailUrl ?? asset.url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="min-h-8 px-2 py-1.5">
        <p className="truncate text-[11px] text-ink" title={asset.name}>{asset.name}</p>
      </div>
      <ImagePromptPanel asset={asset} />
    </div>
  );
}

/** Audio track card — play/pause on click + "See Description" expand. */
function AudioCard({ asset, token }: { asset: BlitzAssetDto; token: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex flex-col items-center justify-center gap-2.5 p-3 transition-colors hover:bg-orange-50"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          {playing
            ? <Pause className="h-5 w-5" />
            : <Play className="h-5 w-5 translate-x-0.5" />
          }
        </div>
        <p className="w-full truncate text-center text-[11px] font-medium text-ink" title={asset.name}>
          {asset.name}
        </p>
        <audio ref={ref} src={asset.url} preload="none" loop onEnded={() => setPlaying(false)} />
      </button>
      <DescriptionPanel token={token} assetId={asset.id} />
    </div>
  );
}

/** UGC video card — plays on hover. No description panel (separate pipeline). */
function UgcCard({ video }: { video: UgcVideoDto }) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = video.captionedUrl ?? video.videoUrl ?? undefined;
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900"
        onMouseEnter={() => ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; } }}
      >
        {src ? (
          <video
            ref={ref}
            src={src}
            muted
            loop
            playsInline
            preload="none"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted">No preview</div>
        )}
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
          {video.mode}
        </span>
      </div>
      <div className="min-h-10 px-2 py-1.5">
        <p className="line-clamp-2 text-[11px] text-ink">{video.script || '(no script)'}</p>
      </div>
    </div>
  );
}

/** Hook video card — plays on hover, shows tags as pills + "See Description" expand. */
function HookCard({ asset, token }: { asset: BlitzAssetDto; token: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900"
        onMouseEnter={() => ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; } }}
      >
        {asset.thumbnailUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={asset.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
        <video
          ref={ref}
          src={asset.url}
          muted
          loop
          playsInline
          preload="none"
          className="relative h-full w-full object-cover"
        />
        {/* source badge */}
        {asset.source === 'hook_library' && (
          <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            lib
          </span>
        )}
      </div>
      <div className="px-2 pt-1.5 pb-1">
        <p className="truncate text-[11px] font-medium text-ink" title={asset.name}>{asset.name}</p>
      </div>
      {/* Tag pills */}
      {asset.tags && asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          {asset.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-surface-alt px-1.5 py-0.5 text-[9px] text-muted">
              {tag}
            </span>
          ))}
        </div>
      )}
      <DescriptionPanel token={token} assetId={asset.id} />
    </div>
  );
}

// ── Generate Descriptions button ──────────────────────────────────────────────

type GenState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'ready'; newCount: number; retryCount: number; total: number; assets: { id: string; name: string; r2Key: string }[]; retryAssets: { id: string; name: string; r2Key: string }[] }
  | { phase: 'running'; done: number; total: number; failed: number; totalCost: number }
  | { phase: 'done'; done: number; total: number; failed: number; totalCost: number };

/** Sections that support the "Generate Descriptions" action */
const DESCRIBABLE_SECTIONS: Section[] = ['memes', 'videos', 'hookVideos', 'sounds'];

function GenerateDescriptionsButton({ section, token }: { section: Section; token: string }) {
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

// ── Search bar ────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="h-9 w-full max-w-xs rounded-lg border border-line bg-white pl-8 pr-3 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-orange-400/40"
      />
    </div>
  );
}

// ── Section content ───────────────────────────────────────────────────────────

const GRID_VIDEO = 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2';
const GRID_AUDIO = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3';

function SectionContent({
  section,
  data,
  token,
  onAssetUploaded,
}: {
  section: Section;
  data: LibraryData;
  token: string;
  onAssetUploaded: (asset: BlitzAssetDto) => void;
}) {
  const [q, setQ] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const qLow = q.trim().toLowerCase();

  const canUpload = section in SECTION_UPLOAD_TYPE;

  const filtered = useMemo(() => {
    if (section === 'memes')      return qLow ? data.memes.filter(a => a.name.toLowerCase().includes(qLow)) : data.memes;
    if (section === 'videos')     return qLow ? data.videos.filter(a => a.name.toLowerCase().includes(qLow)) : data.videos;
    if (section === 'sounds')     return qLow ? data.sounds.filter(a => a.name.toLowerCase().includes(qLow)) : data.sounds;
    if (section === 'aiPictures') return qLow ? data.aiPictures.filter(a => a.name.toLowerCase().includes(qLow)) : data.aiPictures;
    if (section === 'hookVideos') return qLow
      ? data.hookVideos.filter(a => a.name.toLowerCase().includes(qLow) || a.tags.some(t => t.toLowerCase().includes(qLow)))
      : data.hookVideos;
    return [];
  }, [section, data, qLow]);

  const filteredUgc = useMemo(() => {
    if (section !== 'ugcVideos') return [];
    return qLow ? data.ugcVideos.filter(v => v.script.toLowerCase().includes(qLow) || v.mode.toLowerCase().includes(qLow)) : data.ugcVideos;
  }, [section, data, qLow]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3">
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder={
            section === 'ugcVideos'  ? 'Search by script or mode…'
            : section === 'videos'   ? 'Search by name…'
            : section === 'hookVideos' ? 'Search by name or tag…'
            : 'Search…'
          }
        />
        <span className="text-[12px] text-muted">
          {section === 'ugcVideos'
            ? `${filteredUgc.length} video${filteredUgc.length !== 1 ? 's' : ''}`
            : `${filtered.length} asset${filtered.length !== 1 ? 's' : ''}`}
        </span>
        {/* Scraping badge for hookVideos */}
        {section === 'hookVideos' && (
          <span className="flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-medium text-orange-600">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Scraping in progress
          </span>
        )}
        {/* Generate Descriptions CTA */}
        <GenerateDescriptionsButton section={section} token={token} />

        {/* Upload button in toolbar (mirrors the + Add card) */}
        {canUpload && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Add asset
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {section === 'sounds' ? (
          <div className={GRID_AUDIO}>
            {/* + Add card */}
            {canUpload && <AddAssetCard onClick={() => setUploadOpen(true)} isAudio />}
            {filtered.map((a) => <AudioCard key={a.id} asset={a} token={token} />)}
          </div>
        ) : section === 'aiPictures' ? (
          <div className={GRID_VIDEO}>
            {canUpload && <AddAssetCard onClick={() => setUploadOpen(true)} />}
            {filtered.map((a) => <ImageCard key={a.id} asset={a} />)}
          </div>
        ) : section === 'ugcVideos' ? (
          <div className={GRID_VIDEO}>
            {filteredUgc.map((v) => <UgcCard key={v.id} video={v} />)}
          </div>
        ) : section === 'hookVideos' ? (
          <div className={GRID_VIDEO}>
            {canUpload && <AddAssetCard onClick={() => setUploadOpen(true)} />}
            {filtered.map((a) => <HookCard key={a.id} asset={a} token={token} />)}
          </div>
        ) : (
          /* Memes and Videos — VideoCard with description */
          <div className={GRID_VIDEO}>
            {canUpload && <AddAssetCard onClick={() => setUploadOpen(true)} />}
            {filtered.map((a) => <VideoCard key={a.id} asset={a} token={token} />)}
          </div>
        )}

        {/* Empty state — only shown when search yields no results (not when only the Add card is there) */}
        {(section !== 'ugcVideos' ? filtered.length : filteredUgc.length) === 0 && qLow && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-[13px] text-muted">No match. Try a different search.</p>
          </div>
        )}
        {(section !== 'ugcVideos' ? filtered.length : filteredUgc.length) === 0 && !qLow && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-[13px] text-muted">
              {canUpload ? 'No assets yet — click "+ Add" to upload the first one.' : 'No assets in this section yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {uploadOpen && canUpload && (
        <UploadModal
          section={section}
          token={token}
          onClose={() => setUploadOpen(false)}
          onUploaded={(asset) => {
            onAssetUploaded(asset);
            setUploadOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className={GRID_VIDEO}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-surface-alt" style={{ aspectRatio: '9/16' }} />
      ))}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function AssetsLibraryTab({ token }: { token: string }) {
  const [section, setSection] = useState<Section>('memes');
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchLibrary(token);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  /** Optimistically prepend a just-uploaded asset into the right bucket and bump the count. */
  const handleAssetUploaded = useCallback((asset: BlitzAssetDto) => {
    setData((prev) => {
      if (!prev) return prev;
      const isVideo = asset.mediaKind === 'video';
      const isImage = asset.mediaKind === 'image';
      const isAudio = asset.mediaKind === 'audio';

      let bucket: Section | null = null;
      if (asset.type === 'OVERLAY') bucket = 'memes';
      else if (asset.type === 'BACKGROUND' && isVideo) bucket = 'videos';
      else if (asset.type === 'BACKGROUND' && isImage) bucket = 'aiPictures';
      else if (asset.type === 'AUDIO' && isAudio) bucket = 'sounds';
      else if (asset.type === 'HOOK') bucket = 'hookVideos';

      if (!bucket) return prev;

      const updated = { ...prev };
      if (bucket === 'memes')      updated.memes      = [asset, ...prev.memes];
      if (bucket === 'videos')     updated.videos     = [asset, ...prev.videos];
      if (bucket === 'sounds')     updated.sounds     = [asset, ...prev.sounds];
      if (bucket === 'aiPictures') updated.aiPictures = [asset, ...prev.aiPictures];
      if (bucket === 'hookVideos') updated.hookVideos = [asset, ...prev.hookVideos];
      updated.counts = { ...prev.counts, [bucket]: prev.counts[bucket] + 1 };
      return updated;
    });
  }, []);

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden -mx-8 -my-8">

      {/* ── Section tab bar ──────────────────────────────────────────── */}
      <nav className="flex shrink-0 border-b border-line bg-white px-8">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={[
              'flex items-center gap-2 px-4 py-3.5 text-[13px] font-medium transition-colors border-b-2 -mb-px',
              section === id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-muted hover:text-ink',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {data && <CountBadge n={data.counts[id]} />}
          </button>
        ))}

        {/* Refresh */}
        <button
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 py-3.5 text-[12px] text-muted transition-colors hover:text-ink disabled:opacity-40"
          title="Refresh"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </nav>

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden px-8 py-6">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[13px] text-red-600">{error}</p>
            <button
              onClick={() => void load()}
              className="rounded-lg border border-line px-4 py-2 text-[13px] text-ink hover:bg-surface-alt"
            >
              Retry
            </button>
          </div>
        ) : loading && !data ? (
          <Skeleton />
        ) : data ? (
          <SectionContent section={section} data={data} token={token} onAssetUploaded={handleAssetUploaded} />
        ) : null}
      </div>
    </div>
  );
}
