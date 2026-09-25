'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { errorOf, useLabClient } from './api';
import { CharacterGrid } from './CharacterGrid';
import { EmptyState, ErrorLine, FileButton, MediaGridSkeleton } from './ui';
import type { useUgcCharacters } from './useUgcCharacters';

type RealPersonPanelProps = {
  photos: ReturnType<typeof useUgcCharacters>;
  selectedId: string | null;
  onSelect: (photo: UgcCharacterDto) => void;
};

/** Upload a photo or pick a saved one. The video starts on this exact photo. */
export function RealPersonPanel({ photos, selectedId, onSelect }: RealPersonPanelProps) {
  const client = useLabClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'photo');
    const res = await client.request<{ character?: UgcCharacterDto }>('/ugc-lab/upload', { form }).catch(() => null);
    setUploading(false);
    if (!res?.ok || !res.data.character) {
      setError(res ? errorOf(res) : 'Upload failed');
      return;
    }
    photos.add(res.data.character);
    onSelect(res.data.character);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <FileButton primary label="Upload a photo" busyLabel="Uploading…" busy={uploading} onFile={(f) => void upload(f)} />
        <span className="text-[12px] text-muted">Cropped to 9:16 around the person. Saved for next time.</span>
      </div>
      {error && <p className="text-[13px] text-red-700">{error}</p>}

      {photos.loading && <MediaGridSkeleton count={6} />}
      {photos.error && <ErrorLine message={photos.error} onRetry={photos.reload} />}
      {!photos.loading && !photos.error && photos.characters.length === 0 && (
        <EmptyState title="No photos yet." hint="Upload a photo of the person in the place the video should happen." />
      )}
      {photos.characters.length > 0 && (
        <CharacterGrid characters={photos.characters} selectedId={selectedId} onSelect={onSelect} onArchive={photos.archive} onUpdate={photos.update} />
      )}
    </div>
  );
}
