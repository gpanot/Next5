'use client';

import { useState } from 'react';
import { CharacterPanel } from './ugcLab/CharacterPanel';
import { LibraryPanel } from './ugcLab/LibraryPanel';
import { ResearchPanel } from './ugcLab/ResearchPanel';
import { Pill } from './ugcLab/ui';
import type { ScriptReady } from './ugcLab/useScriptFlow';
import { VideoPanel, type VideoSelection } from './ugcLab/VideoPanel';

type Step = 'research' | 'character' | 'video' | 'library';

const STEPS: { id: Step; label: string }[] = [
  { id: 'research', label: '1 · Research' },
  { id: 'character', label: '2 · Character' },
  { id: 'video', label: '3 · Video' },
  { id: 'library', label: 'Library' },
];

type UgcLabTabProps = { token: string };

const SelectionBar = ({ hook, selection, onClearHook, onClearSelection }: {
  hook: string;
  selection: VideoSelection | null;
  onClearHook: () => void;
  onClearSelection: () => void;
}) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[12px]">
    {hook && (
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-muted">Hook</span>
        <span className="max-w-[240px] truncate text-ink">{hook}</span>
        <button type="button" onClick={onClearHook} className="text-subtle underline hover:text-ink">Clear</button>
      </span>
    )}
    {selection && (
      <span className="flex items-center gap-2">
        <span className="text-muted">{selection.character.kind === 'photo' ? 'Photo' : 'Character'}</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img src={selection.character.url} alt="" className="h-9 w-[20px] rounded object-cover ring-1 ring-line" />
        <span className="text-ink tabular-nums">{selection.duration} s</span>
        <button type="button" onClick={onClearSelection} className="text-subtle underline hover:text-ink">Clear</button>
      </span>
    )}
  </div>
);

export function UgcLabTab({ token }: UgcLabTabProps) {
  const [step, setStep] = useState<Step>('research');
  const [hook, setHook] = useState('');
  const [selection, setSelection] = useState<VideoSelection | null>(null);

  function selectHook(selected: string) {
    setHook(selected);
    setStep('character');
  }

  // Photos and AI characters both end on a picked script, which also sets the video length.
  function selectScript(ready: ScriptReady) {
    setSelection(ready);
    setStep('video');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((s) => (
          <Pill key={s.id} active={step === s.id} onClick={() => setStep(s.id)}>{s.label}</Pill>
        ))}
      </div>

      {(hook || selection) && step !== 'library' && (
        <SelectionBar hook={hook} selection={selection} onClearHook={() => setHook('')} onClearSelection={() => setSelection(null)} />
      )}

      {step === 'research' && <ResearchPanel token={token} onHookSelected={selectHook} />}
      {step === 'character' && (
        <CharacterPanel token={token} hook={hook} onReady={selectScript} />
      )}
      {step === 'video' && <VideoPanel token={token} selection={selection} onOpenLibrary={() => setStep('library')} />}
      {step === 'library' && <LibraryPanel token={token} />}
    </div>
  );
}
