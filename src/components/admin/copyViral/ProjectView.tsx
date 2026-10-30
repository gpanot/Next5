'use client';

import { useState } from 'react';
import { CUT_SENSITIVITY, isCopyViralBusy, type CopyViralProject } from '../../../types/admin/copyViral';
import { CutEditor } from './CutEditor';
import { DirectorCommand } from './DirectorPicker';
import { EditPanel } from './EditPanel';
import { RecordPlan } from './RecordPlan';
import { deleteCopyViral, reanalyzeProject, shortEditingCommand, useCopyViralProject } from './useCopyViral';

type Step = 'cuts' | 'record' | 'edit';

const STEPS: { id: Step; label: string }[] = [
  { id: 'cuts', label: '1 · Fix the cuts' },
  { id: 'record', label: '2 · Record my shots' },
  { id: 'edit', label: '3 · My edit' },
];

function StepTabs({ step, onStep }: { step: Step; onStep: (s: Step) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-app-sunken p-1">
      {STEPS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onStep(s.id)}
          className={`min-h-9 rounded-lg px-4 text-sm font-bold transition ${step === s.id ? 'bg-app-panel text-app-ink shadow-sm' : 'text-app-muted hover:text-app-ink'}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

const STATUS_TEXT: Record<CopyViralProject['status'], string> = {
  DOWNLOADING: 'Getting the reel…',
  ANALYZING: 'Finding the cuts and taking a still per shot…',
  READING: 'Reading the shots and writing my lines…',
  RENDERING: 'Making my edit…',
  READY: 'Ready',
  FAILED: 'Failed',
};

/** One Copy Viral Post project: status while it runs, then the shot breakdown. */
export function ProjectView({ token, id, onBack }: { token: string; id: string; onBack: () => void }) {
  const { project, dir, error, refresh } = useCopyViralProject(token, id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [chosenStep, setChosenStep] = useState<Step | null>(null);

  const act = async (fn: () => Promise<unknown>, after: () => void) => {
    setActionError(null);
    try {
      await fn();
      after();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (error && !project) return <p className="rounded-xl bg-app-accent-soft p-4 text-sm text-app-danger">{error}</p>;
  if (!project) return <div className="h-96 animate-pulse rounded-xl bg-app-sunken" />;
  // Opens on the recording step once the shots have been read (or are being read).
  const hasShots = project.status === 'READY' || project.status === 'READING' || project.status === 'RENDERING';
  const step: Step = chosenStep ?? (project.edit ? 'edit' : project.status === 'READING' || project.shots.some((s) => s.reading) ? 'record' : 'cuts');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <button type="button" onClick={onBack} className="text-xs font-semibold text-app-muted hover:text-app-ink">← All reels</button>
          <h2 className="truncate text-xl font-extrabold text-app-ink">{project.title}</h2>
          {project.referenceUrl && <a href={project.referenceUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-app-muted underline">{project.referenceUrl}</a>}
          {dir && <DirectorCommand label="Folder:" command={dir} />}
          {dir && project.shots.length > 0 && project.shots.every((s) => s.clip) && <DirectorCommand label="Kallaway edit in Claude Code:" command={shortEditingCommand(dir)} />}
        </div>
        <div className="flex gap-2">
          {!isCopyViralBusy(project.status) && project.reference && (
            <select
              value=""
              onChange={(e) => e.target.value && act(() => reanalyzeProject(token, id, Number(e.target.value)), refresh)}
              className="min-h-10 rounded-xl border border-app-line bg-app-panel px-3 text-sm font-semibold text-app-ink hover:bg-app-sunken"
              title="Finds the cuts again and resets your shot edits"
            >
              <option value="">Find cuts again…</option>
              {CUT_SENSITIVITY.map((c) => (
                <option key={c.threshold} value={c.threshold}>{c.label}{c.threshold === project.cutThreshold ? ' (now)' : ''}</option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => confirm('Delete this project and its files?') && act(() => deleteCopyViral(token, id), onBack)} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-app-danger hover:bg-app-sunken">Delete</button>
        </div>
      </div>
      {actionError && <p className="text-sm text-app-danger">{actionError}</p>}
      {hasShots && <StepTabs step={step} onStep={setChosenStep} />}
      {hasShots && step === 'cuts' && (
        project.status === 'READY'
          ? <CutEditor key={project.updatedAt} token={token} project={project} onSaved={refresh} />
          : <p className="rounded-xl border border-app-line p-6 text-sm text-app-muted">The cuts are locked while the project is running.</p>
      )}
      {hasShots && step === 'record' && <RecordPlan token={token} project={project} onChange={refresh} />}
      {hasShots && step === 'edit' && <EditPanel token={token} project={project} onChange={refresh} />}
      {!hasShots && (
        <div className={`rounded-xl border border-app-line p-6 text-sm ${project.status === 'FAILED' ? 'text-app-danger' : 'animate-pulse text-app-muted'}`}>
          {STATUS_TEXT[project.status]}{project.error ? `: ${project.error}` : ''}
        </div>
      )}
    </div>
  );
}
