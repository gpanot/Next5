'use client';

import { useRef, useState } from 'react';
import { adminFetch, useAdminApi } from './useAdminApi';

type Face = { id: string; gender: string | null; age: number | null; ethnicity: string | null; archived: boolean; url: string | null; createdAt: string };

const inputClass = 'rounded-lg border border-line bg-white px-3 py-2 text-[13px]';

/** Uploads one face (multipart; adminFetch forces JSON, so this call sets its own headers). */
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
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL */}
      {face.url && <img src={face.url} alt={[face.gender, face.ethnicity].filter(Boolean).join(', ') || 'Gallery face'} className="h-full w-full object-cover" />}
      {face.archived && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-white">Hidden</span>}
    </div>
    <p className="truncate text-[12px] text-muted">{[face.gender, face.age, face.ethnicity].filter(Boolean).join(' · ') || 'No details'}</p>
    <button onClick={onToggle} className="rounded-lg border border-line px-2 py-1 text-[12px] text-ink hover:bg-surface">
      {face.archived ? 'Show again' : 'Hide'}
    </button>
  </div>
);

/** Curated faces for the influencer gallery: upload, hide, show again. */
export const GalleryFacesTab = ({ token }: { token: string }) => {
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
