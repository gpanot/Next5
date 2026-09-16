'use client';

import { useState } from 'react';
import { adminFetch, useAdminApi } from './useAdminApi';
import { ModelTestRunCard, type RunDto } from './ModelTestRunCard';
import { ModelPicker, type BenchModelDto } from './ModelPicker';

type Bench = {
  models: BenchModelDto[];
  studioModels: { slug: string; photos: number }[];
  templates: { id: string; name: string }[];
  shots: { id: string; label: string }[];
  formats: string[];
  categories: { id: string; label: string }[];
  runs: RunDto[];
};

/** What customers get today, so a run always compares against the live model. */
const DEFAULT_MODEL = 'google/nano-banana-2/edit';

const field = 'w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink';
const labelClass = 'flex flex-col gap-1 text-[12px] font-medium text-muted';

/** Admin bench: one product photo, the same prompt, several image models — with time and price per model. */
export const ModelTestTab = ({ token }: { token: string }) => {
  const { data, error, loading, refresh } = useAdminApi<Bench>(token, '/api/admin/model-tests');
  const [form, setForm] = useState({ studioModel: '', templateId: '', shot: 'full_body_front', format: 'square_1_1', resolution: '1k', name: '', category: 'dress', colorName: '', fit: '', notes: '', label: '' });
  const [models, setModels] = useState<string[]>([DEFAULT_MODEL]);
  const [files, setFiles] = useState<{ front: File | null; detail: File | null; back: File | null }>({ front: null, detail: null, back: null });
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Runs from the server until the page changes them (a new run, or a poll update).
  const [ownRuns, setOwnRuns] = useState<RunDto[] | null>(null);
  const runs = ownRuns ?? data?.runs ?? [];
  const setRuns = (next: RunDto[] | ((prev: RunDto[]) => RunDto[])) => setOwnRuns((prev) => (typeof next === 'function' ? next(prev ?? data?.runs ?? []) : next));
  // The first studio model and look are used until the admin picks others.
  const studioModel = form.studioModel || (data?.studioModels[0]?.slug ?? '');
  const templateId = form.templateId || (data?.templates[0]?.id ?? '');

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const run = async () => {
    if (!files.front || models.length === 0) return;
    setRunning(true);
    setMessage(null);
    const body = new FormData();
    body.set('front', files.front);
    if (files.detail) body.set('detail', files.detail);
    if (files.back) body.set('back', files.back);
    Object.entries({ ...form, studioModel, templateId }).forEach(([k, v]) => body.set(k, v));
    body.set('models', JSON.stringify(models));
    try {
      const res = await fetch('/api/admin/model-tests', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      const json = (await res.json()) as { run?: RunDto; message?: string; error?: string };
      if (!res.ok || !json.run) throw new Error(json.message ?? json.error ?? 'Could not start the test.');
      setRuns((prev) => [json.run as RunDto, ...prev]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not start the test.');
    } finally {
      setRunning(false);
    }
  };

  const onRunUpdate = (updated: RunDto) => setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  const onRunDelete = async (id: string) => {
    setRuns((prev) => prev.filter((r) => r.id !== id));
    await adminFetch(token, `/api/admin/model-tests/${id}`, { method: 'DELETE' }).catch(() => undefined);
  };

  if (loading) return <p className="text-[13px] text-muted">Loading the bench…</p>;
  if (error) return <p className="text-[13px] text-red-700">{error} <button onClick={refresh} className="underline">Retry</button></p>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Model test</h2>
          <p className="text-[13px] text-muted">Upload a product photo and run the real drop prompt through several models. Each result shows how long it took and what it cost.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(['front', 'detail', 'back'] as const).map((side) => (
            <label key={side} className={labelClass}>
              {side === 'front' ? 'Product photo (required)' : `${side} photo (optional)`}
              <input type="file" accept="image/*" className="text-[12px]" onChange={(e) => setFiles((f) => ({ ...f, [side]: e.target.files?.[0] ?? null }))} />
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <label className={labelClass}>Product name
            <input className={field} value={form.name} placeholder="From the file name" onChange={(e) => set('name')(e.target.value)} />
          </label>
          <label className={labelClass}>Category
            <select className={field} value={form.category} onChange={(e) => set('category')(e.target.value)}>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className={labelClass}>Colour
            <input className={field} value={form.colorName} onChange={(e) => set('colorName')(e.target.value)} />
          </label>
          <label className={labelClass}>Notes
            <input className={field} value={form.notes} placeholder="e.g. cropped length" onChange={(e) => set('notes')(e.target.value)} />
          </label>
          <label className={labelClass}>Studio model
            <select className={field} value={studioModel} onChange={(e) => set('studioModel')(e.target.value)}>
              {data.studioModels.map((m) => <option key={m.slug} value={m.slug}>{m.slug} ({m.photos} photos)</option>)}
            </select>
          </label>
          <label className={labelClass}>Shop look
            <select className={field} value={templateId} onChange={(e) => set('templateId')(e.target.value)}>
              {data.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>Shot
            <select className={field} value={form.shot} onChange={(e) => set('shot')(e.target.value)}>
              {data.shots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className={labelClass}>Format and size
            <div className="flex gap-2">
              <select className={field} value={form.format} onChange={(e) => set('format')(e.target.value)}>
                {data.formats.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className={field} value={form.resolution} onChange={(e) => set('resolution')(e.target.value)}>
                <option value="1k">1K</option>
                <option value="2k">2K</option>
              </select>
            </div>
          </label>
        </div>

        <ModelPicker models={data.models} selected={models} onChange={setModels} />

        {message && <p className="text-[13px] text-red-700">{message}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!files.front || models.length === 0 || running || !studioModel || !templateId}
            onClick={() => void run()}
            className="rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
          >
            {running ? 'Starting…' : `Run ${models.length} model${models.length === 1 ? '' : 's'}`}
          </button>
          <span className="text-[12px] text-muted">
            About ${(models.reduce((sum, id) => sum + (data.models.find((m) => m.id === id)?.price ?? 0), 0) / 1_000_000).toFixed(3)} per run
          </span>
        </div>
      </section>

      {runs.map((run) => <ModelTestRunCard key={run.id} token={token} run={run} onUpdate={onRunUpdate} onDelete={() => void onRunDelete(run.id)} />)}
      {runs.length === 0 && <p className="text-[13px] text-muted">No test runs yet.</p>}
    </div>
  );
};
