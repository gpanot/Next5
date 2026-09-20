'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloneVideoDto } from '../../../../server/admin/cloneVideos';
import { ugcRequest, errorOf } from '../ugcLab/api';
import {
  DangerButton,
  EmptyState,
  ErrorLine,
  MediaGridSkeleton,
  Section,
  SecondaryButton,
  Spinner,
  StatusPill,
  usd,
} from '../ugcLab/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';

const POLL_MS = 6_000;

// ── helpers ──────────────────────────────────────────────────────────────────

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

// ── CloneCard ────────────────────────────────────────────────────────────────

function CloneCard({
  token,
  video,
  onChange,
  onDelete,
}: {
  token: string;
  video: CloneVideoDto;
  onChange: (v: CloneVideoDto) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Poll while generating
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (video.status !== 'generating') return;
    let stopped = false;
    const tick = async () => {
      const res = await ugcRequest<{ video?: CloneVideoDto }>(
        token,
        `/api/admin/ugc-lab/clone/library/${video.id}`,
      ).catch(() => null);
      if (!stopped && res?.ok && res.data.video) onChangeRef.current(res.data.video);
    };
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => { stopped = true; window.clearInterval(id); };
  }, [token, video.id, video.status]);

  const elapsed = useRef(0);
  useEffect(() => {
    if (video.status !== 'generating') return;
    const start = Date.now();
    const id = window.setInterval(() => { elapsed.current = Math.floor((Date.now() - start) / 1000); }, 1000);
    return () => window.clearInterval(id);
  }, [video.status]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    const res = await ugcRequest(token, `/api/admin/ugc-lab/clone/library/${video.id}`, { method: 'DELETE' }).catch(() => null);
    setDeleting(false);
    if (res?.ok) onDelete(video.id);
    else setDeleteError(res ? errorOf(res) : 'Delete failed');
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      {/* ── Video / placeholder ── */}
      <div className="relative aspect-[9/16] w-full bg-surface-alt">
        {video.videoUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={video.videoUrl}
            src={video.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full bg-black object-contain"
          />
        ) : video.characterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.characterUrl}
            alt="Character"
            className="h-full w-full object-cover opacity-60"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Spinner />
          </div>
        )}

        {video.status === 'generating' && (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-white/90 py-2 text-[12px] text-muted">
            <Spinner /> Generating… {clock(elapsed.current)} elapsed
          </span>
        )}
        {video.status === 'failed' && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/85 px-4 text-center text-[12px] text-red-700">
            {video.error ?? 'Generation failed'}
          </span>
        )}
      </div>

      {/* ── Meta + actions ── */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={video.status === 'ready' ? 'ready' : video.status === 'failed' ? 'failed' : 'generating'} />
          <span className="text-[11px] text-muted tabular-nums">
            {video.durationSec} s · {video.model ?? 'Seedance 2.5'} · {usd(video.estimatedCostUsd)}
          </span>
        </div>

        <p className="text-[11px] text-subtle">{new Date(video.createdAt).toLocaleString()}</p>
        <p className="font-mono text-[10px] text-subtle">{video.poyoTaskId}</p>

        {/* Reference video thumbnail link */}
        {video.refVideoUrl && (
          <a
            href={video.refVideoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-blue-600 underline"
          >
            Reference clip
          </a>
        )}

        {/* See API call */}
        <ApiCallPanel video={video} />

        <div className="flex flex-wrap gap-2">
          {video.status === 'ready' && video.videoUrl && (
            <a
              href={video.videoUrl}
              className="inline-flex min-h-9 items-center rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt"
            >
              Download
            </a>
          )}

          {confirmDelete ? (
            <>
              <DangerButton onClick={() => void handleDelete()} disabled={deleting}>
                {deleting ? <><Spinner /> Deleting…</> : 'Delete for good'}
              </DangerButton>
              <SecondaryButton onClick={() => setConfirmDelete(false)}>Keep</SecondaryButton>
            </>
          ) : (
            <DangerButton onClick={() => setConfirmDelete(true)}>Delete</DangerButton>
          )}
        </div>
        {deleteError && <p className="text-[12px] text-red-700">{deleteError}</p>}
      </div>
    </article>
  );
}

// ── ApiCallPanel ─────────────────────────────────────────────────────────────

function ApiCallPanel({ video }: { video: CloneVideoDto }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  /** Reconstruct a representative Seedance API body (minus vendor URLs that have expired) */
  const body = {
    model:          video.model ?? 'doubao-seedance-2.5-face',
    duration:       video.durationSec,
    resolution:     video.resolution ?? '480p',
    generate_audio: true,
    content_filter: false,
    prompt:         video.prompt ?? '(not stored)',
    image_with_roles: [
      { url: '<character-vendor-url>',  role: 'reference_image' },
      { url: '<first-frame-vendor-url>', role: 'first_frame' },
    ],
    // audio_urls: ['<voice-vendor-url>']  // included when voice was uploaded
  };

  const json = JSON.stringify(body, null, 2);

  async function copyJson() {
    await navigator.clipboard.writeText(json).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        See API call
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-line bg-surface-alt p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
              reapi · {video.model ?? 'doubao-seedance-2.5-face'}
            </span>
            <button
              type="button"
              onClick={() => void copyJson()}
              className="text-[10px] text-blue-600 hover:underline"
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-ink leading-relaxed">
            {json}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── CloneLibrary ─────────────────────────────────────────────────────────────

export function CloneLibrary({ token }: { token: string }) {
  const [videos, setVideos] = useState<CloneVideoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await ugcRequest<{ videos?: CloneVideoDto[] }>(
      token,
      '/api/admin/ugc-lab/clone/library',
    ).catch(() => null);
    setLoading(false);
    if (res?.ok && res.data.videos) setVideos(res.data.videos);
    else setError(res ? errorOf(res) : 'Could not load library');
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const update = useCallback((v: CloneVideoDto) => {
    setVideos((prev) => prev.map((x) => (x.id === v.id ? v : x)));
  }, []);

  const remove = useCallback((id: string) => {
    setVideos((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const totalCost = videos.reduce((s, v) => s + (v.status === 'failed' ? 0 : v.estimatedCostUsd), 0);

  return (
    <Section
      title="Library"
      description={
        loading
          ? 'Loading…'
          : `${videos.length} video${videos.length === 1 ? '' : 's'} · about ${usd(totalCost)} spent`
      }
    >
      {loading && <MediaGridSkeleton />}
      {error && <ErrorLine message={error} onRetry={() => void load()} />}
      {!loading && !error && videos.length === 0 && (
        <EmptyState
          title="No clones yet."
          hint="Every video you generate is saved here so it never expires."
        />
      )}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <CloneCard
              key={v.id}
              token={token}
              video={v}
              onChange={update}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
