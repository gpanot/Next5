'use client';

import type { BlitzProjectDto } from './api';

type LibraryGridProps = {
  projects: BlitzProjectDto[];
  isLoading: boolean;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function LibraryGrid({ projects, isLoading }: LibraryGridProps) {
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
        <div key={project.id} className="flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-line bg-white">
          {/* Video card — no separate thumbnail in v0, the <video> IS the thumbnail */}
          <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>
            {project.renderedVideoUrl ? (
              <video
                src={project.renderedVideoUrl}
                className="h-full w-full object-cover"
                controls={false}
                loop
                muted
                playsInline
                onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-white/40">
                No preview
              </div>
            )}
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

          <div className="px-2 pb-2">
            <p className="truncate text-[11px] text-muted">{formatDate(project.createdAt)}</p>
            {project.captionText && (
              <p className="line-clamp-2 text-[12px] text-ink">{project.captionText}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
