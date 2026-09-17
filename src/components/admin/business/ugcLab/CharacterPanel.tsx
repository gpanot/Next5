'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2, ImageOff, ChevronRight } from 'lucide-react';

export type CharacterCandidate = {
  url: string;
  model: 'gemini-3-pro' | 'flux-1-dev';
};

type CharacterPanelProps = {
  token: string;
  onCharacterSelected: (url: string) => void;
};

const MODEL_LABELS: Record<CharacterCandidate['model'], string> = {
  'gemini-3-pro': 'Gemini 3 Pro (treg)',
  'flux-1-dev': 'FLUX 1 Dev (DeepInfra)',
};

export function CharacterPanel({ token, onCharacterSelected }: CharacterPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [referenceUrl, setReferenceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<CharacterCandidate[]>([]);
  const [selectedUrl, setSelectedUrl] = useState('');

  async function handleReferenceUpload(file: File) {
    setUploading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/admin/ugc-lab/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? `Upload failed (${res.status})`);
        return;
      }

      setReferenceUrl(data.url ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload error');
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setCandidates([]);
    setSelectedUrl('');

    try {
      const res = await fetch('/api/admin/ugc-lab/character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referenceImageUrl: referenceUrl || undefined }),
      });

      const data = (await res.json()) as {
        candidates?: CharacterCandidate[];
        error?: string;
      };

      if (!res.ok || data.error) {
        setError(data.error ?? `Generation failed (${res.status})`);
        return;
      }

      setCandidates(data.candidates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation error');
    } finally {
      setGenerating(false);
    }
  }

  function handleSelect(url: string) {
    setSelectedUrl(url);
    onCharacterSelected(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Step 2 — Build Your Character</h2>
        <p className="text-sm text-zinc-400">
          Optionally upload a style reference, then generate 2 candidates (Gemini 3 Pro + FLUX 1 Dev).
          Pick the one you want.
        </p>
      </div>

      {/* Optional reference upload */}
      <div className="rounded-xl border border-dashed border-zinc-700 p-5 space-y-3">
        <p className="text-sm text-zinc-400">
          <span className="text-white font-medium">Style reference</span> — optional screenshot for vibe
        </p>

        {referenceUrl ? (
          <div className="flex items-center gap-3">
            <img src={referenceUrl} alt="Reference" className="w-16 h-16 rounded-lg object-cover" />
            <div className="space-y-1">
              <p className="text-xs text-zinc-400">Reference uploaded ✓</p>
              <button
                onClick={() => setReferenceUrl('')}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-500 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Uploading…' : 'Upload reference image'}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleReferenceUpload(f);
            e.target.value = '';
          }}
        />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40 hover:bg-zinc-100 transition-colors"
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span>Generate 2 candidates</span>
        )}
        {generating && <span>Generating… (may take ~30s per model)</span>}
      </button>

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Candidates */}
      {candidates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Pick one — it will be your speaking character
          </p>

          <div className="grid grid-cols-2 gap-4">
            {candidates.map((c) => (
              <div
                key={c.url}
                onClick={() => handleSelect(c.url)}
                className={[
                  'relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all',
                  selectedUrl === c.url
                    ? 'border-white scale-[1.02]'
                    : 'border-transparent hover:border-zinc-600',
                ].join(' ')}
              >
                {c.url ? (
                  <img src={c.url} alt={MODEL_LABELS[c.model]} className="w-full aspect-[9/16] object-cover" />
                ) : (
                  <div className="w-full aspect-[9/16] bg-zinc-800 flex items-center justify-center">
                    <ImageOff className="w-8 h-8 text-zinc-600" />
                  </div>
                )}

                {/* Model label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-xs font-medium text-white">{MODEL_LABELS[c.model]}</p>
                </div>

                {/* Selected badge */}
                {selectedUrl === c.url && (
                  <div className="absolute top-2 right-2 bg-white rounded-full p-0.5">
                    <CheckCircle2 className="w-5 h-5 text-black" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedUrl && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              Character locked — proceed to video generation
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
