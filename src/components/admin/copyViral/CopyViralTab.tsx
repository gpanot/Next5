'use client';

import { useState } from 'react';
import { copyViralMediaUrl, type CopyViralProject } from '../../../types/admin/copyViral';
import { NewProjectForm } from './NewProjectForm';
import { ProjectView } from './ProjectView';
import { timecode, useCopyViralList } from './useCopyViral';

const STATUS_LABEL: Record<CopyViralProject['status'], string> = { DOWNLOADING: 'Downloading', ANALYZING: 'Analyzing', READING: 'Reading shots', RENDERING: 'Making the edit', READY: 'Shots ready', FAILED: 'Failed' };

function ProjectCard({ token, project: p, onOpen }: { token: string; project: CopyViralProject; onOpen: () => void }) {
  const cover = p.shots[0]?.frame;
  return (
    <button type="button" onClick={onOpen} className="group block w-full overflow-hidden rounded-xl border border-app-line bg-app-panel text-left shadow-sm transition hover:shadow-md active:scale-[0.99]">
      <div className="aspect-[9/16] bg-app-sunken">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={copyViralMediaUrl(token, p.id, cover)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-app-muted">{STATUS_LABEL[p.status]}…</div>
        )}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="truncate text-sm font-bold text-app-ink">{p.title}</p>
        <p className={`text-xs ${p.status === 'FAILED' ? 'text-app-danger' : 'text-app-muted'}`}>
          {STATUS_LABEL[p.status]}{p.status === 'READY' ? ` · ${p.shots.length} shots · ${p.shots.filter((s) => s.clip).length} takes · ${timecode(p.durationMs)}` : ''}
        </p>
      </div>
    </button>
  );
}

function ProjectGrid({ token, onOpen }: { token: string; onOpen: (id: string) => void }) {
  const { projects, error } = useCopyViralList(token);
  if (error && !projects) return <p className="rounded-xl bg-app-accent-soft p-4 text-sm text-app-danger">{error}</p>;
  if (!projects) {
    return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[9/19] animate-pulse rounded-xl bg-app-sunken" />)}</div>;
  }
  if (projects.length === 0) {
    return <p className="rounded-xl border border-dashed border-app-line p-10 text-center text-sm text-app-muted">No reels yet. Paste a viral reel link above.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
      {projects.map((p) => <li key={p.id}><ProjectCard token={token} project={p} onOpen={() => onOpen(p.id)} /></li>)}
    </ul>
  );
}

/** Admin › Copy Viral Post: a viral reel taken apart shot by shot, to record again. Localhost only. */
export function CopyViralTab({ token }: { token: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (openId) return <ProjectView token={token} id={openId} onBack={() => setOpenId(null)} />;
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-app-ink md:text-3xl">Copy Viral Post</h1>
        <p className="text-sm text-app-muted">A viral reel in, its shots out: cuts, timings and a still per shot. Fix the cuts, then record each shot yourself. Runs on localhost only.</p>
      </div>
      <NewProjectForm token={token} onCreated={(p) => setOpenId(p.id)} />
      <ProjectGrid token={token} onOpen={setOpenId} />
    </div>
  );
}
