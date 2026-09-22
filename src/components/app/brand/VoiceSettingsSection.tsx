'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { ProductLineDto, WorkspaceAngleDto } from '../../../types/business/me';

// ── Types ────────────────────────────────────────────────────────────────────

const MENTION_OPTIONS = [
  { value: 'never',     label: 'Never' },
  { value: 'rarely',   label: 'Rarely' },
  { value: 'sometimes',label: 'Sometimes' },
  { value: 'often',    label: 'Often' },
  { value: 'always',   label: 'Always' },
] as const;
type MentionFreq = (typeof MENTION_OPTIONS)[number]['value'];

const DOT_COLORS = [
  'bg-red-400', 'bg-violet-400', 'bg-blue-400',
  'bg-emerald-400', 'bg-orange-400', 'bg-pink-400',
] as const;
const dot = (i: number) => DOT_COLORS[i % DOT_COLORS.length];

type Props = {
  angles: WorkspaceAngleDto[];
  mentionFrequency: string;
  genderFilter: string | null;
  product: ProductLineDto | null;
  onChange: (next: WorkspaceAngleDto[]) => void;
};

// ── Weight slider row ─────────────────────────────────────────────────────────
const WeightRow = ({ angle, index, onChange }: { angle: WorkspaceAngleDto; index: number; onChange: (id: string, w: number) => void }) => (
  <div className="grid grid-cols-[1.5rem_1fr_6rem] items-center gap-3">
    <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dot(index)}`} />
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-app-ink">{angle.label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={angle.weight}
        aria-label={`${angle.label} weight`}
        onChange={(e) => onChange(angle.id, Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-app-accent"
      />
    </div>
    <div className="flex items-center gap-1 justify-end">
      <input
        type="number"
        min={0}
        max={100}
        value={angle.weight}
        aria-label={`${angle.label} weight value`}
        onChange={(e) => onChange(angle.id, Math.max(0, Math.min(100, Number(e.target.value))))}
        className="w-14 rounded-lg border border-app-line bg-app-bg px-2 py-1 text-right text-[13px] text-app-ink"
      />
      <span className="text-[13px] text-app-muted">%</span>
    </div>
  </div>
);

// ── Main section ─────────────────────────────────────────────────────────────
export const VoiceSettingsSection = ({ angles, mentionFrequency, genderFilter, product, onChange }: Props) => {
  const [mention, setMention] = useState<MentionFreq>((mentionFrequency as MentionFreq) ?? 'sometimes');
  const [gender, setGender] = useState<string | null>(genderFilter);
  const [saving, setSaving] = useState(false);

  const totalWeight = angles.reduce((s, a) => s + a.weight, 0);

  // ── Weight updates (live, no server call until blur/equalize) ────────────
  const [localAngles, setLocalAngles] = useState<WorkspaceAngleDto[]>(angles);
  // Sync when parent sends fresh angles (e.g. after regeneration)
  const prevAnglesRef = { current: angles };
  if (prevAnglesRef.current !== angles && JSON.stringify(angles) !== JSON.stringify(localAngles)) {
    setLocalAngles(angles);
  }

  const handleWeightChange = (id: string, weight: number) => {
    setLocalAngles((prev) => prev.map((a) => (a.id === id ? { ...a, weight } : a)));
  };

  const equalize = () => {
    if (localAngles.length === 0) return;
    const eq = Math.floor(100 / localAngles.length);
    setLocalAngles((prev) => prev.map((a) => ({ ...a, weight: eq })));
  };

  const saveWeights = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/app/workspace/angles', {
        method: 'PUT',
        json: {
          product,
          angles: localAngles.map((a, i) => ({ id: a.id, weight: a.weight, position: i })),
        },
      });
      onChange(localAngles);
    } catch {
      // silently ignore
    } finally {
      setSaving(false);
    }
  };

  const saveMention = async (value: MentionFreq) => {
    setMention(value);
    await apiFetch('/api/app/workspace/voice', {
      method: 'PATCH',
      json: { product, mentionFrequency: value },
    }).catch(() => undefined);
  };

  const saveGender = async (value: string | null) => {
    // Toggle off if already selected
    const next = gender === value ? null : value;
    setGender(next);
    await apiFetch('/api/app/workspace/voice', {
      method: 'PATCH',
      json: { product, genderFilter: next ?? '' },
    }).catch(() => undefined);
  };

  const hasChanges = JSON.stringify(localAngles.map((a) => a.weight)) !== JSON.stringify(angles.map((a) => a.weight));

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-app-line bg-app-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-semibold text-app-ink">Voice &amp; Angles</h2>
          <p className="text-[12px] text-app-muted">
            {localAngles.length} angle{localAngles.length !== 1 ? 's' : ''} · mention {mention}
          </p>
        </div>
      </div>

      {/* ── Angle distribution ─────────────────────────────────────────── */}
      {localAngles.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="label-caps text-[10px] font-semibold uppercase tracking-wider text-app-muted">Angle distribution</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={equalize} className="text-[12px] text-app-accent hover:underline">
                Equalize
              </button>
              <span className={`text-[12px] font-medium tabular-nums ${totalWeight === 100 ? 'text-app-muted' : 'text-app-danger'}`}>
                {totalWeight}/100
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {localAngles.map((angle, i) => (
              <WeightRow key={angle.id} angle={angle} index={i} onChange={handleWeightChange} />
            ))}
          </div>
          {hasChanges && (
            <button
              type="button"
              onClick={() => void saveWeights()}
              disabled={saving}
              className="self-start rounded-xl bg-app-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save weights'}
            </button>
          )}
        </div>
      )}

      {/* ── Mention business ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 border-t border-app-line pt-4">
        <p className="label-caps text-[10px] font-semibold uppercase tracking-wider text-app-muted">Mention business</p>
        <p className="text-[12px] text-app-muted">How often to mention your business in generated content.</p>
        <div className="flex flex-wrap gap-2">
          {MENTION_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => void saveMention(value)}
              className={[
                'rounded-2xl border px-4 py-2 text-[13px] transition-colors',
                mention === value
                  ? 'border-app-accent bg-app-accent text-white'
                  : 'border-app-line bg-app-bg text-app-ink hover:bg-app-sunken',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gender preference ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 border-t border-app-line pt-4">
        <p className="label-caps text-[10px] font-semibold uppercase tracking-wider text-app-muted">Gender preference</p>
        <p className="text-[12px] text-app-muted">Filter platform videos by gender. No selection shows all.</p>
        <div className="grid grid-cols-2 gap-2">
          {(['men', 'women'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => void saveGender(g)}
              className={[
                'rounded-2xl border py-2.5 text-[13px] font-medium transition-colors',
                gender === g
                  ? 'border-app-accent bg-app-accent text-white'
                  : 'border-app-line bg-app-bg text-app-ink hover:bg-app-sunken',
              ].join(' ')}
            >
              Only {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
