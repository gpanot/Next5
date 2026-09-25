'use client';

import { Loader2, Trash2, UploadCloud, Images, Film } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { useToast } from '../../../hooks/useToast';
import { AppButton } from '../../ui/AppButton';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { ToastContainer } from '../../ui/Toast';
import { useWorkspace } from '../shell/WorkspaceProvider';

type UploadItem = {
  id: string;
  url: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'photo' | 'video';
  createdAt: string;
};

type Page = { items: UploadItem[]; nextCursor: string | null };
type State = { items: UploadItem[]; nextCursor: string | null; error: string | null; loading: boolean };

const MAX_FILE_BYTES = 200 * 1024 * 1024;
const ACCEPTED = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** User's personal media bank — photos and videos they uploaded. */
export const LibraryUploadedView = () => {
  const { product } = useWorkspace();
  const [state, setState] = useState<State | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toasts, toast, dismiss } = useToast();

  const load = useCallback(
    async (cursor: string | null, append: boolean) => {
      const q = new URLSearchParams({ product: product ?? '' });
      if (cursor) q.set('cursor', cursor);
      try {
        const page = await apiFetch<Page>(`/api/app/library/uploads?${q}`);
        setState((prev) => ({
          items: append && prev ? [...prev.items, ...page.items] : page.items,
          nextCursor: page.nextCursor,
          error: null,
          loading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          items: prev?.items ?? [],
          nextCursor: null,
          error: err instanceof ApiError ? err.message : 'Could not load your uploads.',
          loading: false,
        }));
      }
    },
    [product],
  );

  useEffect(() => {
    if (product) void load(null, false);
  }, [product, load]);

  const onFiles = async (files: FileList) => {
    if (!files.length) return;
    const file = files[0]!;
    if (file.size > MAX_FILE_BYTES) {
      toast('File is too large (max 200 MB for videos, 30 MB for photos)', 'error');
      return;
    }
    setUploading(true);
    setUploadProgress('Uploading…');
    try {
      const form = new FormData();
      form.append('file', file);
      const q = new URLSearchParams({ product: product ?? '' });
      const result = await apiFetch<UploadItem>(`/api/app/library/uploads?${q}`, { method: 'POST', body: form });
      toast(
        result.kind === 'photo'
          ? `Photo uploaded · ${formatBytes(result.sizeBytes)}`
          : `Video uploaded · ${formatBytes(result.sizeBytes)}`,
      );
      // Reload to get the fresh presigned URL alongside new entry
      void load(null, false);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deleteUpload = async (item: UploadItem) => {
    setState((prev) => prev && { ...prev, items: prev.items.filter((i) => i.id !== item.id) });
    const q = new URLSearchParams({ product: product ?? '' });
    try {
      await apiFetch(`/api/app/library/uploads/${item.id}?${q}`, { method: 'DELETE' });
      toast('Removed from your library');
    } catch {
      toast('Could not remove this file', 'error');
      void load(null, false);
    }
  };

  if (!state) return <SkeletonGrid count={8} cols={4} />;
  if (state.error && state.items.length === 0) return <ErrorState message={state.error} onRetry={() => void load(null, false)} />;

  return (
    <>
      {/* Upload button */}
      <div className="flex items-center gap-3">
        <AppButton
          variant="primary"
          iconLeft={uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          loading={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploadProgress ?? 'Upload photo or video'}
        </AppButton>
        <span className="text-[12px] text-app-muted">
          Photos compressed to ≤ 600 KB · Videos up to 200 MB
        </span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        aria-label="Upload photo or video"
        onChange={(e) => e.target.files && void onFiles(e.target.files)}
      />

      {/* Drop zone — visible only when empty */}
      {state.items.length === 0 ? (
        <DropZone uploading={uploading} onFiles={onFiles} />
      ) : (
        <>
          <div
            className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); e.dataTransfer.files && void onFiles(e.dataTransfer.files); }}
          >
            {state.items.map((item) => (
              <UploadTile key={item.id} item={item} onDelete={() => void deleteUpload(item)} />
            ))}
          </div>

          {state.nextCursor && (
            <div className="flex justify-center">
              <AppButton variant="secondary" onClick={() => void load(state.nextCursor, true)}>
                Load more
              </AppButton>
            </div>
          )}
        </>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};

/* ── Drop zone ─────────────────────────────────────────────────────── */

const DropZone = ({
  uploading,
  onFiles,
}: {
  uploading: boolean;
  onFiles: (f: FileList) => void;
}) => {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); e.dataTransfer.files && onFiles(e.dataTransfer.files); }}
      className={[
        'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-16 text-center transition-colors duration-200',
        dragging ? 'border-app-accent bg-app-sunken' : 'border-app-line',
      ].join(' ')}
    >
      {uploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-app-muted" />
      ) : (
        <Images className="h-8 w-8 text-app-muted" />
      )}
      <div>
        <p className="text-[14px] font-semibold text-app-ink">
          {uploading ? 'Uploading…' : 'Drag a photo or video here'}
        </p>
        <p className="mt-1 text-[12px] text-app-muted">
          JPG, PNG, WebP, HEIC · MP4, MOV, WebM<br />
          Photos compressed to ≤ 600 KB automatically
        </p>
      </div>
    </div>
  );
};

/* ── Single tile ────────────────────────────────────────────────────── */

const UploadTile = ({ item, onDelete }: { item: UploadItem; onDelete: () => void }) => {
  const isVideo = item.kind === 'video';
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-app-sunken">
      {/* Media preview — 9:16 portrait card */}
      <div className="aspect-[9/16] w-full overflow-hidden bg-app-sunken">
        {item.url ? (
          isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={item.url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.filename}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            {isVideo ? (
              <Film className="h-8 w-8 text-app-muted" />
            ) : (
              <Images className="h-8 w-8 text-app-muted" />
            )}
          </div>
        )}
      </div>

      {/* Video badge */}
      {isVideo && (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          <Film className="h-2.5 w-2.5" />
          Video
        </div>
      )}

      {/* Delete button — appears on hover */}
      <button
        type="button"
        aria-label={`Remove ${item.filename}`}
        onClick={onDelete}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Filename + size */}
      <div className="p-2">
        <p className="truncate text-[11px] font-medium text-app-ink">{item.filename}</p>
        <p className="text-[10px] text-app-muted">{formatBytes(item.sizeBytes)}</p>
      </div>
    </div>
  );
};
