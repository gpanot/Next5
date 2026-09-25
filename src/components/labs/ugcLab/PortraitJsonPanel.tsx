'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { portraitDetails } from '../../../lib/ugcPromptClient';
import { copyPortraitJson, downloadPortraitJson, portraitJsonText } from './portraitJsonFile';
import { PrimaryButton, SecondaryButton, Spinner } from './ui';

type PortraitJsonPanelProps = {
  character: UgcCharacterDto;
  busy: boolean;
  error: string;
  onGenerate: () => void;
};

const GENERATE_HINT = 'Locks face, skin, hair, outfit, place and light into one JSON. Use it in the Video step instead of the photo.';

/** Generate the Portrait Clone JSON, then copy, download or regenerate it. */
export function PortraitJsonPanel({ character, busy, error, onGenerate }: PortraitJsonPanelProps) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'blocked'>('idle');
  const json = character.portraitJson;

  async function copy() {
    if (!json) return;
    setCopied((await copyPortraitJson(json)) ? 'copied' : 'blocked');
    window.setTimeout(() => setCopied('idle'), 2000);
  }

  if (!json) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[12px] text-muted">{GENERATE_HINT}</p>
        <PrimaryButton onClick={onGenerate} disabled={busy} className="self-start">
          {busy ? <><Spinner /> Generating JSON… about 1 min</> : 'Generate JSON'}
        </PrimaryButton>
        {error && <p className="text-[12px] text-red-700">{error}</p>}
      </div>
    );
  }

  const constraints = Array.isArray(json.critical_constraints) ? json.critical_constraints.map(String) : [];
  const details = portraitDetails(json);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={() => void copy()}>
          {copied === 'copied' ? 'Copied' : copied === 'blocked' ? 'Copy blocked' : 'Copy JSON'}
        </PrimaryButton>
        <SecondaryButton onClick={() => downloadPortraitJson(json, character.id)}>Download .json</SecondaryButton>
        <SecondaryButton onClick={onGenerate} disabled={busy}>
          {busy ? <><Spinner /> Regenerating…</> : 'Regenerate'}
        </SecondaryButton>
      </div>
      {error && <p className="text-[12px] text-red-700">{error}</p>}
      {details.length > 0 && <p className="text-[12px] text-ink">{details.join(' · ')}</p>}
      {constraints.length > 0 && (
        <ul className="list-inside list-disc text-[12px] text-ink">
          {constraints.slice(0, 5).map((c) => <li key={c}>{c}</li>)}
          {constraints.length > 5 && <li className="text-muted">+{constraints.length - 5} more constraints</li>}
        </ul>
      )}
      <pre className="max-h-72 min-h-0 overflow-auto overscroll-contain rounded-lg border border-line bg-surface-alt p-3 text-[10px] leading-relaxed text-ink">
        {portraitJsonText(json)}
      </pre>
    </div>
  );
}
