'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../../types/admin/ugc';
import { errorOf, ugcRequest } from './api';
import { CharacterGrid } from './CharacterGrid';
import { RealPersonPanel } from './RealPersonPanel';
import { ScriptFlowView } from './ScriptFlowView';
import {
  EmptyState, ErrorLine, FileButton, MediaGridSkeleton, Pill, PrimaryButton, SecondaryButton, Section, Spinner,
  fieldClass, labelClass,
} from './ui';
import { useScriptFlow, type ScriptReady } from './useScriptFlow';
import { useUgcCharacters } from './useUgcCharacters';

type CharacterPanelProps = {
  token: string;
  hook: string;
  onReady: (ready: ScriptReady) => void;
};

type Reference = { key: string; url: string };

type AiCharactersProps = {
  token: string;
  characters: ReturnType<typeof useUgcCharacters>;
  selectedId: string | null;
  onSelect: (c: UgcCharacterDto) => void;
};

const AiCharacters = ({ token, characters, selectedId, onSelect }: AiCharactersProps) => {
  const [reference, setReference] = useState<Reference | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState('');

  async function uploadReference(file: File) {
    setUploading(true);
    setActionError('');
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'reference');
    const res = await ugcRequest<Partial<Reference>>(token, '/api/admin/ugc-lab/upload', { form }).catch(() => null);
    setUploading(false);
    if (res?.ok && res.data.key && res.data.url) setReference({ key: res.data.key, url: res.data.url });
    else setActionError(res ? errorOf(res) : 'Upload failed');
  }

  async function generate() {
    setGenerating(true);
    setActionError('');
    const res = await ugcRequest<{ character?: UgcCharacterDto }>(token, '/api/admin/ugc-lab/character', { json: { referenceKey: reference?.key } })
      .catch(() => null);
    setGenerating(false);
    if (!res?.ok || !res.data.character) {
      setActionError(res ? errorOf(res) : 'Generation failed');
      return;
    }
    characters.add(res.data.character);
    onSelect(res.data.character);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-surface-alt p-4">
        <p className="text-[13px] font-medium text-ink">New AI character</p>
        <div className="flex flex-wrap items-center gap-3">
          {reference ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
              <img src={reference.url} alt="Style reference" className="h-14 w-14 rounded-lg object-cover ring-1 ring-line" />
              <SecondaryButton onClick={() => setReference(null)}>Remove reference</SecondaryButton>
            </div>
          ) : (
            <FileButton label="Add style reference (optional)" busyLabel="Uploading…" busy={uploading} onFile={(f) => void uploadReference(f)} />
          )}
          <PrimaryButton onClick={() => void generate()} disabled={generating || uploading}>
            {generating ? <><Spinner /> Generating… about 30 s</> : 'Generate with Gemini 3 Pro'}
          </PrimaryButton>
        </div>
        {actionError && <p className="text-[12px] text-red-700">{actionError}</p>}
      </div>

      {characters.loading && <MediaGridSkeleton count={6} />}
      {characters.error && <ErrorLine message={characters.error} onRetry={characters.reload} />}
      {!characters.loading && !characters.error && characters.characters.length === 0 && (
        <EmptyState title="No AI characters yet." hint="Generate one above. It is saved for next time." />
      )}
      {characters.characters.length > 0 && (
        <CharacterGrid characters={characters.characters} selectedId={selectedId} onSelect={onSelect} onArchive={characters.archive} />
      )}
    </div>
  );
};

/** Pick a photo or an AI character, then the same hook → scripts flow for both. */
export function CharacterPanel({ token, hook, onReady }: CharacterPanelProps) {
  const [mode, setMode] = useState<'photo' | 'ai'>('photo');
  const photos = useUgcCharacters(token, 'photo');
  const aiCharacters = useUgcCharacters(token, 'ai');
  const flow = useScriptFlow(token, hook, (c) => (c.kind === 'photo' ? photos.update(c) : aiCharacters.update(c)));
  const selectedId = flow.selected?.id ?? null;

  function switchMode(next: 'photo' | 'ai') {
    if (next === mode) return;
    setMode(next);
    flow.reset();
  }

  return (
    <Section
      title="Character"
      description={mode === 'photo'
        ? 'Use a photo. The video starts on this exact photo and keeps its place and light.'
        : 'Use an AI portrait. Seedance keeps the look.'}
      actions={
        <>
          <Pill active={mode === 'photo'} onClick={() => switchMode('photo')}>Photo</Pill>
          <Pill active={mode === 'ai'} onClick={() => switchMode('ai')}>AI character</Pill>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className={labelClass}>
          Hook
          <input value={flow.hookDraft} onChange={(e) => flow.setHookDraft(e.target.value)} placeholder="Pick one in Research or type it" className={fieldClass} />
        </label>

        {mode === 'photo'
          ? <RealPersonPanel token={token} photos={photos} selectedId={selectedId} onSelect={(c) => void flow.choose(c)} />
          : <AiCharacters token={token} characters={aiCharacters} selectedId={selectedId} onSelect={(c) => void flow.choose(c)} />}

        <ScriptFlowView flow={flow} onReady={onReady} />
      </div>
    </Section>
  );
}
