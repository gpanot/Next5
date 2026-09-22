'use client';

import { Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { ProductLineDto, WorkspaceAngleDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { TextInput } from '../../ui/TextInput';

// ── Dot colour palette (cycles through angles) ───────────────────────────────
const DOT_COLORS = [
  'bg-red-400', 'bg-violet-400', 'bg-blue-400',
  'bg-emerald-400', 'bg-orange-400', 'bg-pink-400',
] as const;

const dot = (i: number) => DOT_COLORS[i % DOT_COLORS.length];

type Props = {
  angles: WorkspaceAngleDto[];
  genState: string;
  product: ProductLineDto | null;
  onChange: (next: WorkspaceAngleDto[]) => void;
};

// ── Add-angle form ────────────────────────────────────────────────────────────
const AddAngleForm = ({ product, onAdded, onCancel }: { product: ProductLineDto | null; onAdded: (a: WorkspaceAngleDto) => void; onCancel: () => void }) => {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const trimmed = label.trim();
    if (!trimmed) { setError('Enter an angle name.'); return; }
    setBusy(true);
    setError('');
    try {
      const angle = await apiFetch<WorkspaceAngleDto>('/api/app/workspace/angles', {
        method: 'POST',
        json: { product, label: trimmed },
      });
      onAdded(angle);
      setLabel('');
    } catch {
      setError('Could not add angle.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-app-line bg-app-sunken px-4 py-3">
      <TextInput
        id="new-angle"
        placeholder="e.g. Missed Calls, Lost Jobs"
        autoFocus
        value={label}
        onChange={(e) => { setLabel(e.target.value); setError(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter') void submit(); if (e.key === 'Escape') onCancel(); }}
        maxLength={100}
      />
      <p className="text-[11px] text-app-muted">{label.length}/100 characters</p>
      {error && <p className="text-[12px] text-app-danger">{error}</p>}
      <div className="flex gap-2">
        <AppButton size="sm" loading={busy} onClick={() => void submit()}>Add Angle</AppButton>
        <AppButton size="sm" variant="ghost" onClick={onCancel}><X aria-hidden className="h-3.5 w-3.5" /> Cancel</AppButton>
      </div>
    </div>
  );
};

// ── Inline rename field ───────────────────────────────────────────────────────
const RenameField = ({ angle, onSaved, onCancel }: { angle: WorkspaceAngleDto; onSaved: (a: WorkspaceAngleDto) => void; onCancel: () => void }) => {
  const [label, setLabel] = useState(angle.label);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = label.trim();
    if (!trimmed || trimmed === angle.label) { onCancel(); return; }
    setBusy(true);
    try {
      const updated = await apiFetch<WorkspaceAngleDto>(`/api/app/workspace/angles/${angle.id}`, {
        method: 'PATCH',
        json: { label: trimmed },
      });
      onSaved(updated);
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 items-center gap-2">
      <TextInput
        id={`rename-${angle.id}`}
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') onCancel(); }}
        maxLength={100}
        className="text-[13px]"
      />
      <AppButton size="sm" loading={busy} onClick={() => void save()}>Save</AppButton>
      <AppButton size="sm" variant="ghost" onClick={onCancel}>Cancel</AppButton>
    </div>
  );
};

// ── Main section ─────────────────────────────────────────────────────────────
export const ContentAnglesSection = ({ angles, genState, product, onChange }: Props) => {
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const generating = genState === 'pending';

  const handleAdded = (a: WorkspaceAngleDto) => {
    onChange([...angles, a]);
    setAdding(false);
  };

  const handleSaved = (updated: WorkspaceAngleDto) => {
    onChange(angles.map((a) => (a.id === updated.id ? updated : a)));
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiFetch(`/api/app/workspace/angles/${id}?product=${product}`, { method: 'DELETE' });
      onChange(angles.filter((a) => a.id !== id));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-app-line bg-app-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold text-app-ink">Content Angles</h2>
        {!generating && angles.length > 0 && (
          <span className="text-[12px] text-app-muted">{angles.length} angle{angles.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Generation state */}
      {generating && (
        <div className="flex items-center gap-2 text-[13px] text-app-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Analysing your website…
        </div>
      )}

      {/* Angles list */}
      {angles.length > 0 && (
        <ul className="flex flex-col divide-y divide-app-line">
          {angles.map((angle, i) => (
            <li key={angle.id} className="flex items-center gap-3 py-3">
              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot(i)}`} />
              {renamingId === angle.id ? (
                <RenameField
                  angle={angle}
                  onSaved={handleSaved}
                  onCancel={() => setRenamingId(null)}
                />
              ) : (
                <>
                  <span className="flex-1 text-[14px] text-app-ink">{angle.label}</span>
                  <button
                    type="button"
                    aria-label={`Edit ${angle.label}`}
                    onClick={() => setRenamingId(angle.id)}
                    className="text-app-muted transition-colors hover:text-app-ink"
                  >
                    <Pencil aria-hidden className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${angle.label}`}
                    onClick={() => void handleDelete(angle.id)}
                    disabled={deletingId === angle.id}
                    className="text-app-muted transition-colors hover:text-app-danger disabled:opacity-40"
                  >
                    {deletingId === angle.id ? (
                      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 aria-hidden className="h-4 w-4" />
                    )}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!generating && angles.length === 0 && (
        <p className="text-[13px] text-app-muted">
          No angles yet. Add your website URL above and they'll be extracted automatically, or add one manually below.
        </p>
      )}

      {/* Add form or button */}
      {adding ? (
        <AddAngleForm product={product} onAdded={handleAdded} onCancel={() => setAdding(false)} />
      ) : (
        <div className="flex items-center gap-2">
          <AppButton size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus aria-hidden className="h-3.5 w-3.5" /> Add angle
          </AppButton>
          {angles.length > 0 && (
            <span className="text-[11px] text-app-muted">or use the AI refresh above to regenerate</span>
          )}
        </div>
      )}

      {/* AI attribution badge */}
      {angles.some((a) => a.source === 'ai') && (
        <div className="flex items-center gap-1.5 text-[11px] text-app-muted">
          <Sparkles aria-hidden className="h-3 w-3" />
          AI-extracted from your website
        </div>
      )}
    </section>
  );
};
