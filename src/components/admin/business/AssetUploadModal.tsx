'use client';

/** Upload flow of the Assets Library: the "+ Add" card and the upload modal (presign → PUT → register). */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import type { BlitzAssetDto } from '../../labs/blitzLab/api';
import { createAdminLabClient } from '../../labs/labClient';
import { uploadBlitzAsset, BLITZ_ACCEPT } from '../../labs/blitzLab/upload';
import type { BlitzUploadType } from '../../labs/blitzLab/upload';
import type { LibrarySection as Section } from './LibrarySelectGrid';

// ── Section → upload type mapping ────────────────────────────────────────────

/** Which BlitzUploadType backs each section (null = no direct upload). */
export const SECTION_UPLOAD_TYPE: Partial<Record<Section, BlitzUploadType>> = {
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
export function UploadModal({
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
export function AddAssetCard({ onClick, isAudio }: { onClick: () => void; isAudio?: boolean }) {
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
