'use client';

import { useCallback, useEffect, useState } from 'react';
import { fmtDate, ROUTE_LABELS, ROUTE_ORDER } from '../../lib/admin-format';

type AdminPrompt = {
  id: string;
  route_id: string;
  scene_index: number;
  prompt: string;
  is_active: boolean;
  updated_at: string;
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-ink" />
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <p className="py-10 text-center text-[13px] text-red-600">{msg}</p>;
}

const SCENE_LABELS = ['Preview (Shot 1)', 'Shot 2', 'Shot 3', 'Shot 4', 'Shot 5'];

type PromptCardProps = {
  prompt: AdminPrompt;
  onSave: (id: string, text: string) => Promise<void>;
};

const PromptCard = ({ prompt, onSave }: PromptCardProps) => {
  const [text, setText]         = useState(prompt.prompt);
  const [savedText, setSavedText] = useState(prompt.prompt);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [err, setErr]           = useState('');
  const isDirty                 = text !== savedText;

  const sceneLabel = SCENE_LABELS[prompt.scene_index] ?? `Scene ${prompt.scene_index}`;

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    try {
      await onSave(prompt.id, text);
      setSavedText(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border bg-white p-5 transition-shadow ${isDirty ? 'border-accent shadow-sm' : 'border-line'}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent-strong">
            Scene {prompt.scene_index + 1}
          </p>
          <p className="text-[13px] font-medium text-ink">{sceneLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted">{text.length} chars</span>
          {isDirty && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Unsaved</span>
          )}
          {saved && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Saved ✓</span>
          )}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink/10"
        spellCheck={false}
      />

      {err && <p className="mt-1 text-[12px] text-red-600">{err}</p>}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-muted">Last updated {fmtDate(prompt.updated_at)}</p>
        <div className="flex gap-2">
          {isDirty && (
            <button
              onClick={() => { setText(savedText); setErr(''); }}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted hover:text-ink"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="rounded-lg bg-ink px-4 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

type PromptsTabProps = { token: string };

export const PromptsTab = ({ token }: PromptsTabProps) => {
  const [prompts, setPrompts]         = useState<AdminPrompt[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTE_ORDER[0]);

  useEffect(() => {
    fetch('/api/admin/prompts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts ?? []))
      .catch(() => setError('Failed to load prompts'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = useCallback(async (id: string, newPrompt: string) => {
    const res = await fetch(`/api/admin/prompts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt: newPrompt }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
    const updated = await res.json();
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, prompt: updated.prompt, updated_at: updated.updated_at } : p)),
    );
  }, [token]);

  if (loading) return <Spinner />;
  if (error)   return <ErrMsg msg={error} />;

  const routePrompts = prompts.filter((p) => p.route_id === selectedRoute);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-[22px] tracking-[0.04em] text-ink uppercase">Prompts</h2>
          <span className="text-[13px] text-muted">{prompts.length}</span>
        </div>
        <p className="text-[12px] text-muted">5 studios · 5 scenes each · {prompts.length} total</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROUTE_ORDER.map((routeId) => (
          <button
            key={routeId}
            onClick={() => setSelectedRoute(routeId)}
            className={`rounded-full border px-4 py-1.5 text-[12px] font-medium transition-colors ${
              selectedRoute === routeId
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white text-muted hover:border-ink hover:text-ink'
            }`}
          >
            {ROUTE_LABELS[routeId] ?? routeId}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {routePrompts
          .sort((a, b) => a.scene_index - b.scene_index)
          .map((p) => (
            <PromptCard key={p.id} prompt={p} onSave={handleSave} />
          ))}
      </div>
    </div>
  );
};
