'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { errorOf, useLabClient } from './api';
import { CharacterGrid } from './CharacterGrid';
import { PortraitJsonPanel } from './PortraitJsonPanel';
import { EmptyState, ErrorLine, FileButton, MediaGridSkeleton, PrimaryButton } from './ui';
import { usePortraitJson } from './usePortraitJson';
import type { useUgcCharacters } from './useUgcCharacters';

type AvatarPanelProps = {
  avatars: ReturnType<typeof useUgcCharacters>;
  selectedId: string | null;
  onSelect: (avatar: UgcCharacterDto) => void;
};

/** Upload your own photo as an avatar + optionally lock it into a Portrait Clone JSON. */
export function AvatarPanel({ avatars, selectedId, onSelect }: AvatarPanelProps) {
  const client = useLabClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  /** The avatar in focus (just uploaded or tapped) — shown with the JSON panel before it is used. */
  const [justUploaded, setJustUploaded] = useState<UgcCharacterDto | null>(null);
  const portrait = usePortraitJson(avatars.update);

  async function upload(file: File) {
    setUploading(true);
    setUploadError('');
    setJustUploaded(null);
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'avatar');
    const res = await client.request<{ character?: UgcCharacterDto }>('/ugc-lab/upload', { form }).catch(() => null);
    setUploading(false);
    if (!res?.ok || !res.data.character) {
      setUploadError(res ? errorOf(res) : 'Upload failed');
      return;
    }
    avatars.add(res.data.character);
    setJustUploaded(res.data.character);
  }

  // Read from the list so a JSON generated from the grid shows here too.
  const focusId = justUploaded?.id ?? selectedId;
  const targetForAnalysis = avatars.characters.find((c) => c.id === focusId) ?? justUploaded;

  return (
    <div className="flex flex-col gap-4">
      {/* Upload area */}
      <div className="flex flex-col gap-3 rounded-xl bg-surface-alt p-4">
        <div>
          <p className="text-[13px] font-medium text-ink">Upload your photo</p>
          <p className="mt-0.5 text-[12px] text-muted">
            Cropped to 9:16. The video starts on this frame and keeps the same place and light.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FileButton
            primary
            label="Upload your photo"
            busyLabel="Uploading…"
            busy={uploading}
            onFile={(f) => void upload(f)}
          />
          {uploadError && <p className="text-[12px] text-red-700">{uploadError}</p>}
        </div>
      </div>

      {/* Character JSON panel — shown right after upload or when a tile is tapped */}
      {targetForAnalysis && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img
              src={targetForAnalysis.url}
              alt="Your avatar"
              className="h-16 w-9 rounded-lg object-cover ring-1 ring-line"
            />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-ink">Lock your look</p>
              <p className="text-[12px] text-muted">
                Generate a JSON that pins every visual detail (face, skin, hair, outfit).
                In the Video step, pick the photo or the JSON to compare results.
              </p>
            </div>
          </div>

          <PortraitJsonPanel
            character={targetForAnalysis}
            busy={portrait.isBusy(targetForAnalysis.id)}
            error={portrait.errorFor(targetForAnalysis.id)}
            onGenerate={() => void portrait.generate(targetForAnalysis)}
          />

          <div className="border-t border-line pt-3">
            <PrimaryButton onClick={() => onSelect(targetForAnalysis)}>
              Use this avatar →
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Saved avatars grid */}
      {avatars.loading && <MediaGridSkeleton count={4} />}
      {avatars.error && <ErrorLine message={avatars.error} onRetry={avatars.reload} />}
      {!avatars.loading && !avatars.error && avatars.characters.length === 0 && !justUploaded && (
        <EmptyState
          title="No avatars yet."
          hint="Upload a photo of yourself. Then generate a JSON to lock your look."
        />
      )}
      {avatars.characters.length > 0 && (
        <CharacterGrid
          characters={avatars.characters}
          selectedId={justUploaded?.id ?? selectedId}
          onSelect={(c) => {
            // Show the portrait panel (and JSON download) without advancing to Hook step.
            // "Use this avatar →" button is the explicit advance action.
            setJustUploaded(c);
          }}
          onArchive={avatars.archive}
          onUpdate={avatars.update}
        />
      )}
    </div>
  );
}
