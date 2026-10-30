'use client';

import { useState } from 'react';
import { copyViralMediaUrl, type CopyViralDirector, type CopyViralProject, type CopyViralResolution } from '../../../types/admin/copyViral';
import { DirectorCommand, DirectorPicker } from './DirectorPicker';
import { directorCommand, renderEdit, secondsLabel } from './useCopyViral';

function SideBySide({ token, project }: { token: string; project: CopyViralProject }) {
  const edit = project.edit;
  if (!edit?.video || !project.reference) return null;
  const v = edit.finishedAt ?? undefined;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:max-w-4xl">
      <figure className="space-y-1.5">
        <figcaption className="text-xs font-bold text-app-muted uppercase">Original · {secondsLabel(project.durationMs)}</figcaption>
        <video src={copyViralMediaUrl(token, project.id, project.reference)} controls playsInline className="aspect-[9/16] w-full rounded-xl bg-black shadow-sm" />
      </figure>
      <figure className="space-y-1.5">
        <figcaption className="text-xs font-bold text-app-muted uppercase">Mine · {secondsLabel(edit.durationMs)} · {edit.resolution === '720x1280' ? '720×1280 draft' : '1080×1920'}</figcaption>
        <video
          src={copyViralMediaUrl(token, project.id, edit.video, v)}
          poster={edit.poster ? copyViralMediaUrl(token, project.id, edit.poster, v) : undefined}
          controls
          playsInline
          className="aspect-[9/16] w-full rounded-xl bg-black shadow-sm"
        />
      </figure>
    </div>
  );
}

/** Step 3: make the edit from my takes with the local engine, then compare it with the original. */
export function EditPanel({ token, project, onChange }: { token: string; project: CopyViralProject; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<CopyViralResolution>(project.edit?.resolution ?? '1080x1920');
  const [director, setDirector] = useState<CopyViralDirector>(project.edit?.director ?? 'claude');
  const edit = project.edit;
  const backgrounds = project.shots.filter((s) => s.background).length;
  const running = project.status === 'RENDERING';
  const missing = project.shots.filter((s) => !s.clip).map((s) => s.index + 1);
  const v = edit?.finishedAt ?? undefined;

  const start = async () => {
    setError(null);
    try {
      await renderEdit(token, project.id, resolution, director);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={running || missing.length > 0 || project.status !== 'READY'}
          className="min-h-11 rounded-xl bg-app-cta px-5 text-sm font-bold text-app-cta-ink shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        >
          {running ? edit?.step ?? 'Making my edit…' : edit ? 'Make my edit again' : 'Make my edit'}
        </button>
        <DirectorPicker value={director} onChange={setDirector} />
        <div className="inline-flex rounded-xl bg-app-sunken p-1 text-xs font-bold">
          {(['1080x1920', '720x1280'] as const).map((r) => (
            <button key={r} type="button" onClick={() => setResolution(r)} className={`min-h-8 rounded-lg px-3 transition ${resolution === r ? 'bg-app-panel text-app-ink shadow-sm' : 'text-app-muted hover:text-app-ink'}`}>
              {r === '1080x1920' ? '1080×1920' : '720×1280 (quick draft)'}
            </button>
          ))}
        </div>
        <p className="text-sm text-app-muted">
          {missing.length
            ? `Takes missing for shot ${missing.join(', ')}`
            : `Silences cut, the reel's look, captions, list reveals${backgrounds ? `, ${backgrounds} green-screen picture${backgrounds > 1 ? 's' : ''}` : ''} · ${director === 'claude' ? 'Claude Code: 5 to 20 min' : 'about 1 to 4 min'}`}
        </p>
      </div>
      {director === 'claude' && !missing.length && <DirectorCommand command={directorCommand(project.id, null, resolution)} />}
      {running && <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-app-sunken"><div className="h-full w-1/3 animate-pulse rounded-full bg-app-ink" /></div>}
      {(error || edit?.error) && <p className="rounded-xl bg-app-accent-soft p-3 text-sm break-words text-app-danger">{error ?? edit?.error}</p>}
      {edit?.status === 'DONE' && (
        <>
          <SideBySide token={token} project={project} />
          <div className="flex flex-wrap gap-2 text-sm">
            {edit.video && <a href={copyViralMediaUrl(token, project.id, edit.video, v)} download className="rounded-xl border border-app-line px-3 py-2 font-semibold text-app-ink hover:bg-app-sunken">Download MP4</a>}
            {edit.srt && <a href={copyViralMediaUrl(token, project.id, edit.srt, v)} download className="rounded-xl border border-app-line px-3 py-2 font-semibold text-app-ink hover:bg-app-sunken">Captions .srt</a>}
            <a href={copyViralMediaUrl(token, project.id, 'render.log', v)} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 font-semibold text-app-muted hover:text-app-ink">Engine log</a>
            {edit.director === 'claude' && <a href={copyViralMediaUrl(token, project.id, 'claude-short-edit.log', v)} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 font-semibold text-app-muted hover:text-app-ink">Claude Code log</a>}
          </div>
          {edit.sheet && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={copyViralMediaUrl(token, project.id, edit.sheet, v)} alt="One still per shot" className="w-full max-w-4xl rounded-xl border border-app-line" />
          )}
        </>
      )}
      {edit?.status === 'FAILED' && <a href={copyViralMediaUrl(token, project.id, edit.director === 'claude' ? 'claude-short-edit.log' : 'render.log', v)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-app-muted underline">{edit.director === 'claude' ? 'Claude Code log' : 'Engine log'}</a>}
      {!edit && !running && <p className="rounded-xl border border-dashed border-app-line p-8 text-center text-sm text-app-muted">Upload a take for every shot, then make the edit here.</p>}
    </div>
  );
}
