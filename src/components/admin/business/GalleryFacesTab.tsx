'use client';

import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch, useAdminApi } from './useAdminApi';

// ─── Shared types ────────────────────────────────────────────────────────────

type Face = { id: string; gender: string | null; age: number | null; ethnicity: string | null; archived: boolean; url: string | null; createdAt: string };

type GalleryDraft = {
  draftId: string;
  generatedKey: string;
  referenceKey: string;
  prompt: string;
  negativePrompt: string;
  portraitJson: Record<string, unknown>;
  gender: string;
  age: string;
  ethnicity: string;
  createdAt: string;
  /** Refreshed presigned URL — not persisted, fetched on mount. */
  generatedUrl?: string;
  referenceUrl?: string;
};

const DRAFTS_STORAGE_KEY = 'admin_gallery_face_drafts';

const loadDrafts = (): GalleryDraft[] => {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]') as GalleryDraft[];
  } catch {
    return [];
  }
};

const saveDrafts = (drafts: GalleryDraft[]): void => {
  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
};

// ─── Shared helpers ──────────────────────────────────────────────────────────

const inputClass = 'rounded-lg border border-line bg-white px-3 py-2 text-[13px]';

const uploadFace = async (token: string, file: File, fields: { gender: string; age: string; ethnicity: string }): Promise<void> => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(fields).forEach(([key, value]) => value.trim() && form.append(key, value.trim()));
  const res = await fetch('/api/admin/influencer-gallery', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(data.message ?? data.error ?? `Upload failed (${res.status})`);
  }
};

// ─── Library Face tab ────────────────────────────────────────────────────────

const UploadForm = ({ token, onUploaded }: { token: string; onUploaded: () => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState({ gender: '', age: '', ethnicity: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) return setMessage('Choose at least one photo.');
    setBusy(true);
    setMessage(null);
    let done = 0;
    for (const file of files) {
      try {
        await uploadFace(token, file, fields);
        done += 1;
      } catch (err) {
        setMessage(`${file.name}: ${err instanceof Error ? err.message : 'failed'}`);
      }
    }
    setBusy(false);
    if (done > 0) {
      setMessage((m) => m ?? `Uploaded ${done} face${done === 1 ? '' : 's'}.`);
      if (fileRef.current) fileRef.current.value = '';
      onUploaded();
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
      <div>
        <p className="text-[14px] font-medium text-ink">Add faces</p>
        <p className="text-[12px] text-muted">Shown in New influencer → Gallery → Browse faces. Saved as 9:16 (1080 × 1920), cropped around the face. The same details apply to every photo in one upload.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" aria-label="Face photos" className="text-[13px]" />
        <select value={fields.gender} onChange={(e) => setFields({ ...fields, gender: e.target.value })} aria-label="Gender" className={inputClass}>
          <option value="">Gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
        <input value={fields.age} onChange={(e) => setFields({ ...fields, age: e.target.value })} type="number" min={18} max={90} placeholder="Age" aria-label="Age" className={`${inputClass} w-20`} />
        <input value={fields.ethnicity} onChange={(e) => setFields({ ...fields, ethnicity: e.target.value })} maxLength={60} placeholder="Ethnicity" aria-label="Ethnicity" className={`${inputClass} w-40`} />
        <button onClick={() => void submit()} disabled={busy} className="rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {message && <p className="text-[13px] text-ink">{message}</p>}
    </div>
  );
};

const FaceCard = ({ face, onToggle }: { face: Face; onToggle: () => void }) => (
  <div className={`flex flex-col gap-2 rounded-xl border border-line bg-white p-2 ${face.archived ? 'opacity-50' : ''}`}>
    <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-surface">
      {face.url && <img src={face.url} alt={[face.gender, face.ethnicity].filter(Boolean).join(', ') || 'Gallery face'} className="h-full w-full object-cover" />}
      {face.archived && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-white">Hidden</span>}
    </div>
    <p className="truncate text-[12px] text-muted">{[face.gender, face.age, face.ethnicity].filter(Boolean).join(' · ') || 'No details'}</p>
    <button onClick={onToggle} className="rounded-lg border border-line px-2 py-1 text-[12px] text-ink hover:bg-surface">
      {face.archived ? 'Show again' : 'Hide'}
    </button>
  </div>
);

const LibraryFaceTab = ({ token }: { token: string }) => {
  const { data, error, loading, refresh } = useAdminApi<{ items: Face[] }>(token, '/api/admin/influencer-gallery');
  const [actionError, setActionError] = useState<string | null>(null);
  const faces = data?.items ?? [];

  const toggle = async (face: Face) => {
    setActionError(null);
    try {
      await adminFetch(token, '/api/admin/influencer-gallery', { method: 'PATCH', body: JSON.stringify({ id: face.id, archived: !face.archived }) });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <UploadForm token={token} onUploaded={refresh} />
      {(error || actionError) && <p className="text-[13px] text-red-700">{error ?? actionError}</p>}
      {loading && !data && <p className="text-[13px] text-muted">Loading…</p>}
      {data && faces.length === 0 && <p className="text-[13px] text-muted">No faces yet. Upload the first one above.</p>}
      <p className="text-[12px] text-muted">{faces.filter((f) => !f.archived).length} live · {faces.filter((f) => f.archived).length} hidden</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {faces.map((face) => <FaceCard key={face.id} face={face} onToggle={() => void toggle(face)} />)}
      </div>
    </div>
  );
};

// ─── Create Face tab ─────────────────────────────────────────────────────────

/** Freshens a presigned URL from the server for a stored R2 key. */
const refreshPresignUrl = async (token: string, key: string): Promise<string | null> => {
  try {
    const res = await fetch(`/api/admin/gallery-faces/presign?key=${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
};

/** One pending/generated result from the generate endpoint. */
type GenerateResult = {
  draftId: string;
  generatedKey: string;
  generatedUrl: string;
  referenceKey: string;
  referenceUrl: string;
  prompt: string;
  negativePrompt: string;
  portraitJson: Record<string, unknown>;
  createdAt: string;
};

const DraftCard = ({
  draft,
  token,
  onPromote,
  onDelete,
}: {
  draft: GalleryDraft;
  token: string;
  onPromote: (draft: GalleryDraft) => void;
  onDelete: (draft: GalleryDraft) => void;
}) => {
  const [promoting, setPromoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [fields, setFields] = useState({ gender: draft.gender, age: draft.age, ethnicity: draft.ethnicity });

  const promote = async () => {
    setPromoting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gallery-faces/promote', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedKey: draft.generatedKey, gender: fields.gender, age: fields.age, ethnicity: fields.ethnicity }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `Promote failed (${res.status})`);
      }
      onPromote(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to library');
    } finally {
      setPromoting(false);
    }
  };

  const deleteDraft = async () => {
    setDeleting(true);
    try {
      await fetch('/api/admin/gallery-faces/draft', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedKey: draft.generatedKey, referenceKey: draft.referenceKey }),
      });
      onDelete(draft);
    } catch {
      onDelete(draft); // remove locally even if delete failed
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Reference photo */}
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Reference</p>
          <div className="aspect-[9/16] overflow-hidden rounded-lg bg-surface">
            {draft.referenceUrl
              ? <img src={draft.referenceUrl} alt="Reference" className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center text-[11px] text-muted">No preview</div>}
          </div>
        </div>
        {/* Generated portrait */}
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Generated</p>
          <div className="aspect-[9/16] overflow-hidden rounded-lg bg-surface">
            {draft.generatedUrl
              ? <img src={draft.generatedUrl} alt="Generated" className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center text-[11px] text-muted">No preview</div>}
          </div>
        </div>
      </div>

      {/* Metadata for library */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select value={fields.gender} onChange={(e) => setFields({ ...fields, gender: e.target.value })} aria-label="Gender" className={`${inputClass} flex-1`}>
            <option value="">Gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
          <input value={fields.age} onChange={(e) => setFields({ ...fields, age: e.target.value })} type="number" min={18} max={90} placeholder="Age" aria-label="Age" className={`${inputClass} w-20`} />
        </div>
        <input value={fields.ethnicity} onChange={(e) => setFields({ ...fields, ethnicity: e.target.value })} maxLength={60} placeholder="Ethnicity" aria-label="Ethnicity" className={`${inputClass} w-full`} />
      </div>

      {/* Prompt toggle */}
      <button
        onClick={() => setShowPrompt((v) => !v)}
        className="text-left text-[11px] text-app-accent hover:underline"
      >
        {showPrompt ? 'Hide prompt' : 'View portrait-clone prompt'}
      </button>
      {showPrompt && (
        <div className="rounded-lg bg-surface p-2">
          <p className="whitespace-pre-wrap font-mono text-[10px] text-ink">{draft.prompt}</p>
          {draft.negativePrompt && (
            <>
              <p className="mt-2 text-[10px] font-medium text-muted">Negative:</p>
              <p className="font-mono text-[10px] text-red-700">{draft.negativePrompt}</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-[12px] text-red-700">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => void promote()}
          disabled={promoting || deleting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {promoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {promoting ? 'Adding…' : 'Add to Library'}
        </button>
        <button
          onClick={() => void deleteDraft()}
          disabled={promoting || deleting}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-50"
          aria-label="Delete draft"
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      </div>

      <p className="text-[10px] text-muted">{new Date(draft.createdAt).toLocaleString()}</p>
    </div>
  );
};

/** Status messages while generating. */
const STEPS = [
  'Uploading reference photo…',
  'Analysing face with GPT-4o (portrait-clone)…',
  'Generating portrait with Gemini 3 Pro Image…',
  'Storing result…',
];

const CreateFaceTab = ({ token, onLibraryChanged }: { token: string; onLibraryChanged: () => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  /** The actual File object kept in state — single source of truth, independent of DOM input. */
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [drafts, setDrafts] = useState<GalleryDraft[]>([]);
  const [refreshingUrls, setRefreshingUrls] = useState(false);

  // Load drafts from localStorage + refresh their presigned URLs on mount
  useEffect(() => {
    const stored = loadDrafts();
    if (stored.length === 0) { setDrafts([]); return; }
    setRefreshingUrls(true);
    void (async () => {
      const refreshed = await Promise.all(
        stored.map(async (d) => ({
          ...d,
          generatedUrl: await refreshPresignUrl(token, d.generatedKey) ?? undefined,
          referenceUrl: await refreshPresignUrl(token, d.referenceKey) ?? undefined,
        })),
      );
      setDrafts(refreshed);
      setRefreshingUrls(false);
    })();
  }, [token]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setPromoteError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Progress ticker while generating (steps auto-advance every ~20s)
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startProgressTimer = useCallback(() => {
    setStepIdx(0);
    let idx = 0;
    const tick = () => {
      idx = Math.min(idx + 1, STEPS.length - 1);
      setStepIdx(idx);
      if (idx < STEPS.length - 1) stepTimerRef.current = setTimeout(tick, 20_000);
    };
    stepTimerRef.current = setTimeout(tick, 8_000);
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (stepTimerRef.current) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
    setStepIdx(0);
  }, []);

  const generate = async () => {
    const file = selectedFile;
    if (!file) return setError('Pick a reference photo first.');
    setBusy(true);
    setError(null);
    setResult(null);
    startProgressTimer();

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/gallery-faces/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `Generation failed (${res.status})`);
      }
      const data = (await res.json()) as GenerateResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Try again.');
    } finally {
      stopProgressTimer();
      setBusy(false);
    }
  };

  const saveResultAsDraft = (res: GenerateResult, fields: { gender: string; age: string; ethnicity: string }) => {
    const draft: GalleryDraft = {
      draftId: res.draftId,
      generatedKey: res.generatedKey,
      referenceKey: res.referenceKey,
      prompt: res.prompt,
      negativePrompt: res.negativePrompt,
      portraitJson: res.portraitJson,
      gender: fields.gender,
      age: fields.age,
      ethnicity: fields.ethnicity,
      createdAt: res.createdAt,
      generatedUrl: res.generatedUrl,
      referenceUrl: res.referenceUrl,
    };
    const updated = [draft, ...loadDrafts()];
    saveDrafts(updated);
    setDrafts(updated);
    setResult(null);
    clearFile();
  };

  const removeDraft = (draft: GalleryDraft) => {
    const updated = loadDrafts().filter((d) => d.draftId !== draft.draftId);
    saveDrafts(updated);
    setDrafts(updated);
  };

  const [resultFields, setResultFields] = useState({ gender: '', age: '', ethnicity: '' });
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const promoteResult = async () => {
    if (!result) return;
    setPromoting(true);
    setPromoteError(null);
    try {
      const res2 = await fetch('/api/admin/gallery-faces/promote', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedKey: result.generatedKey, gender: resultFields.gender, age: resultFields.age, ethnicity: resultFields.ethnicity }),
      });
      if (!res2.ok) {
        const d = (await res2.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `Promote failed (${res2.status})`);
      }
      setResult(null);
      clearFile();
      onLibraryChanged();
    } catch (err2) {
      setPromoteError(err2 instanceof Error ? err2.message : 'Failed');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Generate panel */}
      {!result && (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4">
          <div>
            <p className="text-[14px] font-medium text-ink">Generate a face from a reference photo</p>
            <p className="text-[12px] text-muted">
              Upload any portrait photo. Gemini 3 Pro Image will generate a new face that matches the reference — same look, not the same identity.
            </p>
          </div>

          {/* Single always-mounted input — avoids the dual-ref bug */}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={onFileChange}
            aria-label="Reference photo"
            className="hidden"
            id="gallery-face-upload"
          />

          {/* Upload area */}
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line bg-surface p-6">
            {previewUrl ? (
              <>
                <div className="relative w-32">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl">
                    <img src={previewUrl} alt="Reference preview" className="h-full w-full object-cover" />
                  </div>
                  <button
                    onClick={clearFile}
                    aria-label="Remove photo"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[12px] text-muted">Reference photo selected</p>
                <label
                  htmlFor="gallery-face-upload"
                  className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink hover:bg-white"
                >
                  Change photo
                </label>
              </>
            ) : (
              <label htmlFor="gallery-face-upload" className="flex cursor-pointer flex-col items-center gap-2">
                <ImagePlus className="h-8 w-8 text-muted" />
                <p className="text-[13px] text-muted">Click to choose a reference photo</p>
              </label>
            )}
          </div>

          {/* Busy state */}
          {busy && (
            <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink" />
              <div>
                <p className="text-[13px] font-medium text-ink">{STEPS[stepIdx]}</p>
                <p className="text-[11px] text-muted">This takes 60–90 seconds. Please wait.</p>
              </div>
            </div>
          )}

          {error && <p className="text-[13px] text-red-700">{error}</p>}

          <button
            onClick={() => void generate()}
            disabled={busy || !selectedFile}
            className="flex items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {busy ? 'Generating…' : 'Generate Portrait'}
          </button>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4">
          <p className="text-[14px] font-semibold text-ink">Generated portrait</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-muted">Reference photo</p>
              <div className="aspect-[9/16] overflow-hidden rounded-xl bg-surface">
                <img src={result.referenceUrl} alt="Reference" className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-muted">Generated (9:16)</p>
              <div className="aspect-[9/16] overflow-hidden rounded-xl bg-surface">
                <img src={result.generatedUrl} alt="Generated portrait" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select value={resultFields.gender} onChange={(e) => setResultFields({ ...resultFields, gender: e.target.value })} aria-label="Gender" className={`${inputClass} flex-1`}>
                <option value="">Gender (optional)</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <input value={resultFields.age} onChange={(e) => setResultFields({ ...resultFields, age: e.target.value })} type="number" min={18} max={90} placeholder="Age" className={`${inputClass} w-20`} />
            </div>
            <input value={resultFields.ethnicity} onChange={(e) => setResultFields({ ...resultFields, ethnicity: e.target.value })} maxLength={60} placeholder="Ethnicity (optional)" className={`${inputClass} w-full`} />
          </div>
          {promoteError && <p className="text-[12px] text-red-700">{promoteError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => void promoteResult()}
              disabled={promoting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {promoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {promoting ? 'Adding to library…' : 'Add to Library'}
            </button>
            <button
              onClick={() => saveResultAsDraft(result, resultFields)}
              className="flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-[13px] text-ink hover:bg-surface"
            >
              Save as Draft
            </button>
            <button
              onClick={() => { setResult(null); clearFile(); }}
              aria-label="Discard"
              className="flex items-center justify-center rounded-xl border border-line px-3 py-2.5 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drafts listing */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-medium text-ink">Saved drafts</p>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">{drafts.length}</span>
          {refreshingUrls && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
        </div>
        {drafts.length === 0 && !refreshingUrls && (
          <p className="text-[13px] text-muted">No drafts yet. Generate a portrait and choose "Save as Draft".</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.draftId}
              draft={draft}
              token={token}
              onPromote={(d) => {
                removeDraft(d);
                onLibraryChanged();
              }}
              onDelete={removeDraft}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main tab with sub-tabs ──────────────────────────────────────────────────

type SubTab = 'library' | 'create';

/** Admin gallery faces: Library Face (curated) + Create Face (AI generation). */
export const GalleryFacesTab = ({ token }: { token: string }) => {
  const [subTab, setSubTab] = useState<SubTab>('library');
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  const subTabClass = (t: SubTab) =>
    [
      'shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
      subTab === t ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
    ].join(' ');

  return (
    <div className="flex flex-col gap-0">
      {/* Sub-tab bar */}
      <div className="mb-6 flex gap-0 border-b border-line">
        <button className={subTabClass('library')} onClick={() => setSubTab('library')}>
          Library Faces
        </button>
        <button className={subTabClass('create')} onClick={() => setSubTab('create')}>
          Create Face
        </button>
      </div>

      {/* Sub-tab content */}
      {subTab === 'library' && <LibraryFaceTab key={libraryRefreshKey} token={token} />}
      {subTab === 'create' && (
        <CreateFaceTab
          token={token}
          onLibraryChanged={() => {
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
};
