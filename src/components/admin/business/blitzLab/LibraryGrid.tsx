'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { BlitzProjectDto } from './api';

type LibraryGridProps = {
  projects: BlitzProjectDto[];
  isLoading: boolean;
  token: string;
  onDelete: (id: string) => void;
  /** Called when a library video starts playing — so the editor preview pauses. */
  onVideoPlay: () => void;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** e.g. "1m 23s" or "45s" */
function formatDuration(createdAt: string, updatedAt: string): string | null {
  const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  if (ms <= 0) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Status badge for in-progress cards. */
function RenderBadge({ status }: { status: string }) {
  if (status === 'PENDING' || status === 'PROCESSING') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-3 text-center">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <p className="text-[12px] font-medium text-white">
          {status === 'PENDING' ? 'Queued — waiting for worker…' : 'Rendering…'}
        </p>
      </div>
    );
  }
  if (status === 'FAILED') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-3 text-center">
        <p className="text-[12px] font-medium text-red-400">Render failed</p>
      </div>
    );
  }
  return null;
}

function LibraryCard({
  project,
  token,
  onDelete,
  onVideoPlay,
}: {
  project: BlitzProjectDto;
  token: string;
  onDelete: (id: string) => void;
  onVideoPlay: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const isPending = project.renderStatus === 'PENDING' || project.renderStatus === 'PROCESSING';
  const renderDuration = project.renderStatus === 'COMPLETED'
    ? formatDuration(project.createdAt, project.updatedAt)
    : null;

  const handleDelete = async () => {
    if (!confirm('Delete this render permanently?')) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/blitz/projects/${project.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onDelete(project.id);
    } else {
      alert('Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-line bg-white"
      data-library-card
      data-project-id={project.id}
      data-status={project.renderStatus}
    >
      {/* Video / placeholder area */}
      <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>
        {project.renderedVideoUrl ? (
          <video
            src={project.renderedVideoUrl}
            className="h-full w-full object-cover"
            controls={false}
            loop
            playsInline
            onMouseEnter={(e) => {
              onVideoPlay();
              const v = e.currentTarget as HTMLVideoElement;
              // Hover is not a user gesture, so an unmuted play() can be rejected
              // by the autoplay policy. Try with sound, fall back to silent.
              v.muted = false;
              v.volume = 1;
              v.play().catch(() => {
                v.muted = true;
                void v.play();
              });
            }}
            onMouseLeave={(e) => {
              const v = e.currentTarget as HTMLVideoElement;
              v.pause();
              v.currentTime = 0;
              v.muted = true;
            }}
          />
        ) : (
          <div className="h-full w-full bg-surface-alt" />
        )}

        {/* Overlay badge for queued / rendering / failed */}
        <RenderBadge status={project.renderStatus} />

        {/* Download button */}
        {project.renderedVideoUrl && (
          <a
            href={project.renderedVideoUrl}
            download={`blitz-${project.id}.mp4`}
            className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-ink hover:bg-white"
            onClick={(e) => {
              if (project.isIdentifiablePerson) {
                e.preventDefault();
                alert('Export blocked: this project is marked as containing an identifiable person.');
              }
            }}
          >
            ↓ Download
          </a>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-start justify-between gap-1 px-2 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[11px] text-muted">
              {isPending ? 'In queue…' : formatDate(project.createdAt)}
            </p>
            {renderDuration && (
              <span className="shrink-0 rounded bg-surface-alt px-1 py-0.5 text-[10px] tabular-nums text-muted">
                {renderDuration}
              </span>
            )}
          </div>
          {project.captionText && (
            <p className="line-clamp-2 text-[12px] text-ink">{project.captionText}</p>
          )}
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete render"
          className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        >
          {deleting
            ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            : <Trash2 className="h-3.5 w-3.5" />
          }
        </button>
      </div>
    </div>
  );
}

export function LibraryGrid({ projects, isLoading, token, onDelete, onVideoPlay }: LibraryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-surface-alt" style={{ aspectRatio: '9/16' }} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="text-[13px] text-ink">No renders yet</p>
        <p className="text-[12px] text-muted">
          Compose a video in the editor above and click &ldquo;Done Editing&rdquo; to start the first render.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {projects.map((project) => (
        <LibraryCard
          key={project.id}
          project={project}
          token={token}
          onDelete={onDelete}
          onVideoPlay={onVideoPlay}
        />
      ))}
    </div>
  );
}
