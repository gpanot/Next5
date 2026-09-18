'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../../types/admin/ugc';
import { errorOf, ugcRequest } from './api';
import { CharacterGrid } from './CharacterGrid';
import { RealPersonPanel, type RealPersonReady } from './RealPersonPanel';
import {
  EmptyState, ErrorLine, FileButton, MediaGridSkeleton, Pill, PrimaryButton, SecondaryButton, Section, Spinner,
} from './ui';
import { useUgcCharacters } from './useUgcCharacters';

type CharacterPanelProps = {
  token: string;
  hook: string;
  selectedId: string | null;
  onCharacterSelected: (character: UgcCharacterDto) => void;
  onRealPersonReady: (params: RealPersonReady) => void;
};

type Reference = { key: string; url: string };

const AiCharacters = ({ token, selectedId, onSelect }: { token: string; selectedId: string | null; onSelect: (c: UgcCharacterDto) => void }) => {
  const { characters, error, loading, reload, add, archive } = useUgcCharacters(token, 'ai');
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
    add(res.data.character);
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

      {loading && <MediaGridSkeleton count={6} />}
      {error && <ErrorLine message={error} onRetry={reload} />}
      {!loading && !error && characters.length === 0 && (
        <EmptyState title="No AI characters yet." hint="Generate one above. It is saved for next time." />
      )}
      {characters.length > 0 && <CharacterGrid characters={characters} selectedId={selectedId} onSelect={onSelect} onArchive={archive} />}
    </div>
  );
};

export function CharacterPanel({ token, hook, selectedId, onCharacterSelected, onRealPersonReady }: CharacterPanelProps) {
  const [mode, setMode] = useState<'photo' | 'ai'>('photo');

  return (
    <Section
      title="Character"
      description={mode === 'photo'
        ? 'Use a photo. The video starts on this exact photo and keeps its place and light.'
        : 'Use an AI portrait. Seedance keeps the look and invents the room.'}
      actions={
        <>
          <Pill active={mode === 'photo'} onClick={() => setMode('photo')}>Photo</Pill>
          <Pill active={mode === 'ai'} onClick={() => setMode('ai')}>AI character</Pill>
        </>
      }
    >
      {mode === 'photo'
        ? <RealPersonPanel token={token} hook={hook} onReady={onRealPersonReady} />
        : <AiCharacters token={token} selectedId={selectedId} onSelect={onCharacterSelected} />}
    </Section>
  );
}
