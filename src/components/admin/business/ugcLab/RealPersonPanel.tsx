'use client';

import { useState } from 'react';
import type { UgcDuration, UgcScene } from '../../../../config/ugcLab';
import type { UgcCharacterDto } from '../../../../types/admin/ugc';
import { errorOf, ugcRequest } from './api';
import { CharacterGrid } from './CharacterGrid';
import { ScriptPicker, type ScriptOption } from './ScriptPicker';
import { EmptyState, ErrorLine, FileButton, MediaGridSkeleton, Spinner, fieldClass, labelClass } from './ui';
import { useUgcCharacters } from './useUgcCharacters';

export type RealPersonReady = { character: UgcCharacterDto; script: string; duration: UgcDuration };

type RealPersonPanelProps = {
  token: string;
  hook: string; // the hook selected in Research, editable here
  onReady: (params: RealPersonReady) => void;
};

const SHOT_LABELS: Record<UgcScene['shot'], string> = { close: 'Close-up', medium: 'Waist up', wide: 'Full body' };

const SceneDetails = ({ scene }: { scene: UgcScene }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
    <dt className="text-muted">Person</dt><dd className="text-ink">{scene.person}</dd>
    <dt className="text-muted">Place</dt><dd className="text-ink">{scene.setting}</dd>
    <dt className="text-muted">Action</dt><dd className="text-ink">{scene.action}</dd>
    <dt className="text-muted">Framing</dt><dd className="text-ink">{SHOT_LABELS[scene.shot]}</dd>
  </dl>
);

export function RealPersonPanel({ token, hook, onReady }: RealPersonPanelProps) {
  const photos = useUgcCharacters(token, 'photo');
  const [hookDraft, setHookDraft] = useState(hook);
  const [selected, setSelected] = useState<UgcCharacterDto | null>(null);
  const [busy, setBusy] = useState<'' | 'upload' | 'describe' | 'scripts'>('');
  const [error, setError] = useState('');
  const [scripts, setScripts] = useState<ScriptOption[]>([]);
  const [duration, setDuration] = useState<UgcDuration | null>(null);
  const [edited, setEdited] = useState('');

  async function describe(photo: UgcCharacterDto): Promise<UgcCharacterDto> {
    if (photo.scene) return photo;
    setBusy('describe');
    const res = await ugcRequest<{ scene?: UgcScene }>(token, '/api/admin/ugc-lab/describe', { json: { characterId: photo.id } }).catch(() => null);
    if (!res?.ok || !res.data.scene) {
      setError(`${res ? errorOf(res) : 'Could not describe the photo'} — scripts will not mention the place.`);
      return photo;
    }
    const described = { ...photo, scene: res.data.scene };
    photos.update(described);
    return described;
  }

  async function writeScripts(photo: UgcCharacterDto) {
    if (!hookDraft.trim()) {
      setError('Type a hook first (or pick one in Research).');
      return;
    }
    setBusy('scripts');
    const res = await ugcRequest<{ scripts?: ScriptOption[] }>(token, '/api/admin/ugc-lab/scripts', { json: { hook: hookDraft, scene: photo.scene } })
      .catch(() => null);
    if (res?.ok && res.data.scripts) setScripts(res.data.scripts.filter((s) => s.text));
    else setError(res ? errorOf(res) : 'Script generation failed');
  }

  async function choose(photo: UgcCharacterDto) {
    setSelected(photo);
    setError('');
    setScripts([]);
    setDuration(null);
    const described = await describe(photo);
    setSelected(described);
    await writeScripts(described);
    setBusy('');
  }

  async function upload(file: File) {
    setBusy('upload');
    setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'photo');
    const res = await ugcRequest<{ character?: UgcCharacterDto }>(token, '/api/admin/ugc-lab/upload', { form }).catch(() => null);
    if (!res?.ok || !res.data.character) {
      setBusy('');
      setError(res ? errorOf(res) : 'Upload failed');
      return;
    }
    photos.add(res.data.character);
    await choose(res.data.character);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className={labelClass}>
        Hook
        <input value={hookDraft} onChange={(e) => setHookDraft(e.target.value)} placeholder="Pick one in Research or type it" className={fieldClass} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <FileButton primary label="Upload a photo" busyLabel="Uploading…" busy={busy === 'upload'} onFile={(f) => void upload(f)} />
        <span className="text-[12px] text-muted">Cropped to 9:16 around the person. Saved for next time.</span>
      </div>

      {photos.loading && <MediaGridSkeleton count={6} />}
      {photos.error && <ErrorLine message={photos.error} onRetry={photos.reload} />}
      {!photos.loading && !photos.error && photos.characters.length === 0 && (
        <EmptyState title="No photos yet." hint="Upload a photo of the person in the place the video should happen." />
      )}
      {photos.characters.length > 0 && (
        <CharacterGrid characters={photos.characters} selectedId={selected?.id ?? null} onSelect={(c) => void choose(c)} onArchive={photos.archive} />
      )}

      {selected?.scene && <div className="rounded-xl bg-surface-alt p-3"><SceneDetails scene={selected.scene} /></div>}

      {(busy === 'describe' || busy === 'scripts') && (
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Spinner /> {busy === 'describe' ? 'Reading the photo…' : 'Writing 3 scripts…'}
        </p>
      )}
      {error && <p className="text-[13px] text-red-700">{error}</p>}

      {selected && !busy && scripts.length === 0 && hookDraft.trim() && (
        <button type="button" onClick={() => void writeScripts(selected).finally(() => setBusy(''))} className="self-start text-[13px] text-ink underline">
          Write scripts for this photo
        </button>
      )}

      {selected && scripts.length > 0 && (
        <ScriptPicker
          scripts={scripts}
          selected={duration}
          edited={edited}
          onSelect={(s) => { setDuration(s.duration); setEdited(s.text); }}
          onEdit={setEdited}
          onConfirm={() => duration && onReady({ character: selected, script: edited.trim(), duration })}
        />
      )}
    </div>
  );
}
