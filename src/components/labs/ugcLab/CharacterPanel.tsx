'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { AvatarPanel } from './AvatarPanel';
import { CharacterGrid } from './CharacterGrid';
import { RealPersonPanel } from './RealPersonPanel';
import {
  EmptyState, ErrorLine, FileButton, MediaGridSkeleton, Pill, PrimaryButton, Section, SecondaryButton, Spinner, fieldClass, labelClass,
} from './ui';
import { useUgcCharacters } from './useUgcCharacters';
import { errorOf, useLabClient } from './api';

type CharacterPanelProps = {
  /** Called when the user picks a character (photo, AI, or avatar). The Hook step opens next. */
  onCharacterSelected: (character: UgcCharacterDto) => void;
  /** Called when a saved character changes, e.g. its JSON was generated after it was picked. */
  onCharacterUpdated: (character: UgcCharacterDto) => void;
};

type Reference = { key: string; url: string };

const AiCharacters = ({
  characters,
  selectedId,
  onSelect,
}: {
  characters: ReturnType<typeof useUgcCharacters>;
  selectedId: string | null;
  onSelect: (c: UgcCharacterDto) => void;
}) => {
  const client = useLabClient();
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
    const res = await client.request<Partial<Reference>>('/ugc-lab/upload', { form }).catch(() => null);
    setUploading(false);
    if (res?.ok && res.data.key && res.data.url) setReference({ key: res.data.key, url: res.data.url });
    else setActionError(res ? errorOf(res) : 'Upload failed');
  }

  async function generate() {
    setGenerating(true);
    setActionError('');
    const res = await client.request<{ character?: UgcCharacterDto }>('/ugc-lab/character', { json: { referenceKey: reference?.key } })
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
        <CharacterGrid characters={characters.characters} selectedId={selectedId} onSelect={onSelect} onArchive={characters.archive} onUpdate={characters.update} />
      )}
    </div>
  );
};

/** Pick a photo, AI character, or your own avatar. Scripts are generated later in the Hook step. */
export function CharacterPanel({ onCharacterSelected, onCharacterUpdated }: CharacterPanelProps) {
  const [mode, setMode] = useState<'photo' | 'ai' | 'avatar'>('photo');
  const photos = useUgcCharacters('photo', onCharacterUpdated);
  const aiCharacters = useUgcCharacters('ai', onCharacterUpdated);
  const avatars = useUgcCharacters('avatar', onCharacterUpdated);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function switchMode(next: 'photo' | 'ai' | 'avatar') {
    if (next === mode) return;
    setMode(next);
    setSelectedId(null);
  }

  function handleSelect(c: UgcCharacterDto) {
    setSelectedId(c.id);
    onCharacterSelected(c);
  }

  const description =
    mode === 'photo'
      ? 'Use a photo. The video starts on this exact photo and keeps its place and light.'
      : mode === 'ai'
        ? 'Use an AI portrait. Seedance keeps the look.'
        : 'Your own avatar. Upload a photo, generate a JSON to lock every visual detail.';

  return (
    <Section
      title="Character"
      description={description}
      actions={
        <>
          <Pill active={mode === 'photo'} onClick={() => switchMode('photo')}>Photo</Pill>
          <Pill active={mode === 'ai'} onClick={() => switchMode('ai')}>AI character</Pill>
          <Pill active={mode === 'avatar'} onClick={() => switchMode('avatar')}>Your Avatar</Pill>
        </>
      }
    >
      {mode === 'photo' && (
        <RealPersonPanel photos={photos} selectedId={selectedId} onSelect={handleSelect} />
      )}
      {mode === 'ai' && (
        <AiCharacters characters={aiCharacters} selectedId={selectedId} onSelect={handleSelect} />
      )}
      {mode === 'avatar' && (
        <AvatarPanel avatars={avatars} selectedId={selectedId} onSelect={handleSelect} />
      )}
    </Section>
  );
}
