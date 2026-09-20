'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../../types/admin/ugc';
import { errorOf, ugcRequest } from './api';
import { CharacterGrid } from './CharacterGrid';
import { EmptyState, ErrorLine, FileButton, MediaGridSkeleton, PrimaryButton, SecondaryButton, Spinner } from './ui';
import type { useUgcCharacters } from './useUgcCharacters';

type AvatarPanelProps = {
  token: string;
  avatars: ReturnType<typeof useUgcCharacters>;
  selectedId: string | null;
  onSelect: (avatar: UgcCharacterDto) => void;
};

type PortraitPreviewProps = { json: Record<string, unknown>; characterId: string };

/** Downloads the portrait JSON as a .json file. */
function downloadPortraitJson(json: Record<string, unknown>, characterId: string) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portrait-clone-${characterId.slice(-8)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Shows the key fields from the portrait JSON so the user can verify accuracy, and lets them download the full file. */
const PortraitPreview = ({ json, characterId }: PortraitPreviewProps) => {
  const [expanded, setExpanded] = useState(false);
  const face = json.face as Record<string, unknown> | undefined;
  const hair = json.hair as Record<string, unknown> | undefined;
  const subject = json.subject as Record<string, unknown> | undefined;
  const constraints = json.critical_constraints as string[] | undefined;

  return (
    <div className="rounded-xl border border-line bg-surface-alt p-3 text-[12px]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-ink">Portrait JSON locked</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted underline hover:text-ink"
          >
            {expanded ? 'Collapse' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={() => downloadPortraitJson(json, characterId)}
            className="text-muted underline hover:text-ink"
          >
            Download .json
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          {subject && (
            <div>
              <p className="text-muted">Subject</p>
              <p className="text-ink">
                {[subject.gender, subject.apparent_age, subject.build].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
          {face && (
            <div>
              <p className="text-muted">Face</p>
              <p className="text-ink">
                {[face.shape, face.eye_shape, face.skin_tone_hex].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
          {hair && (
            <div>
              <p className="text-muted">Hair</p>
              <p className="text-ink">
                {[hair.color_hex, hair.length, hair.style].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
          {constraints && constraints.length > 0 && (
            <div>
              <p className="text-muted">Critical constraints ({constraints.length})</p>
              <ul className="list-disc list-inside text-ink">
                {constraints.slice(0, 4).map((c, i) => <li key={i}>{c}</li>)}
                {constraints.length > 4 && <li className="text-muted">+{constraints.length - 4} more</li>}
              </ul>
            </div>
          )}
          {/* Full raw JSON in a scrollable box */}
          <div>
            <p className="text-muted">Full JSON</p>
            <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-line bg-white p-2 text-[10px] leading-relaxed text-ink">
              {JSON.stringify(json, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

/** Upload your own photo as an avatar + optionally analyse it with the Portrait Clone skill. */
export function AvatarPanel({ token, avatars, selectedId, onSelect }: AvatarPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [analyseError, setAnalyseError] = useState('');
  /** The character just uploaded — shown with an "Analyse photo" CTA before it goes into the grid. */
  const [justUploaded, setJustUploaded] = useState<UgcCharacterDto | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError('');
    setJustUploaded(null);
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'avatar');
    const res = await ugcRequest<{ character?: UgcCharacterDto }>(token, '/api/admin/ugc-lab/upload', { form }).catch(() => null);
    setUploading(false);
    if (!res?.ok || !res.data.character) {
      setUploadError(res ? errorOf(res) : 'Upload failed');
      return;
    }
    avatars.add(res.data.character);
    setJustUploaded(res.data.character);
  }

  async function analysePortrait(character: UgcCharacterDto) {
    setAnalysing(true);
    setAnalyseError('');
    const res = await ugcRequest<{ character?: UgcCharacterDto; portraitJson?: Record<string, unknown> }>(
      token,
      '/api/admin/ugc-lab/portrait-clone',
      { json: { characterId: character.id } },
    ).catch(() => null);
    setAnalysing(false);
    if (!res?.ok || !res.data.character) {
      setAnalyseError(res ? errorOf(res) : 'Portrait analysis failed');
      return;
    }
    avatars.update(res.data.character);
    setJustUploaded(res.data.character);
  }

  const targetForAnalysis = justUploaded ?? (selectedId ? avatars.characters.find((c) => c.id === selectedId) ?? null : null);

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

      {/* Portrait analysis CTA — shown right after upload */}
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
                Analyse the photo to pin every visual detail (face, skin, hair, outfit) into a JSON.
                Seedance uses it to stay consistent across generations.
              </p>
            </div>
          </div>

          {targetForAnalysis.portraitJson ? (
            <PortraitPreview json={targetForAnalysis.portraitJson} characterId={targetForAnalysis.id} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton
                onClick={() => void analysePortrait(targetForAnalysis)}
                disabled={analysing}
              >
                {analysing ? <><Spinner /> Analysing… about 20 s</> : 'Analyse photo (Portrait Clone)'}
              </PrimaryButton>
              <span className="text-[11px] text-muted">Optional — but strongly recommended for consistency</span>
            </div>
          )}
          {analyseError && <p className="text-[12px] text-red-700">{analyseError}</p>}

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
          hint="Upload a photo of yourself. The AI will analyse it to lock your look across all videos."
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
        />
      )}
    </div>
  );
}
