'use client';

/**
 * Profile Review Panel — M2 full profile editing UI.
 * Shows every field-envelope leaf with confidence badges and inline edit.
 */

import { useCallback, useState } from 'react';
import { CheckCircle2, Lock, Unlock, Edit3, AlertCircle } from 'lucide-react';
import { patchProfile, type StudioRunFull } from './api';

// ─── Types ─────────────────────────────────────────────────────────────────────

type FieldEnvelope<T = string> = {
  value: T;
  source: 'crawl' | 'inferred' | 'manual';
  confidence: number;
  evidence?: string[];
  locked: boolean;
};

type ProfileData = {
  classification?: {
    vertical?: FieldEnvelope;
    subVertical?: FieldEnvelope;
    businessModel?: FieldEnvelope;
  };
  identity?: {
    businessName?: FieldEnvelope;
    tagline?: FieldEnvelope;
    description?: FieldEnvelope;
    logoUrl?: FieldEnvelope<string | null>;
    primaryColor?: FieldEnvelope<string | null>;
  };
  positioning?: {
    promoting?: FieldEnvelope;
    offer?: FieldEnvelope;
    positioning?: FieldEnvelope;
    geography?: FieldEnvelope;
  };
  market?: {
    audienceDescription?: FieldEnvelope;
    targetCustomerIndustries?: FieldEnvelope<string[]>;
    competitors?: FieldEnvelope<string[]>;
    keywords?: FieldEnvelope<string[]>;
  };
  tone?: {
    tone?: FieldEnvelope;
    hooks?: FieldEnvelope<string[]>;
  };
};

// ─── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence, source }: { confidence: number; source: string }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? 'text-green-600 bg-green-50 border-green-200' :
    pct >= 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
    'text-red-500 bg-red-50 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {pct}% · {source}
    </span>
  );
}

// ─── Editable field ────────────────────────────────────────────────────────────

function FieldRow({
  label,
  path,
  envelope,
  onSave,
  multiline = false,
  isArray = false,
}: {
  label: string;
  path: string;
  envelope: FieldEnvelope<string | string[] | null> | undefined;
  onSave: (path: string, value: string | string[] | null, locked: boolean) => void;
  multiline?: boolean;
  isArray?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const rawValue = envelope?.value ?? (isArray ? [] : '');
  const displayValue = isArray
    ? (rawValue as string[]).join(', ')
    : (rawValue as string | null) ?? '';
  const [draft, setDraft] = useState(displayValue);

  const handleSave = () => {
    const newValue = isArray ? draft.split(',').map((s) => s.trim()).filter(Boolean) : draft;
    onSave(path, newValue, envelope?.locked ?? false);
    setEditing(false);
  };

  const handleLockToggle = () => {
    onSave(path, rawValue as string | string[] | null, !envelope?.locked);
  };

  return (
    <div className="group flex items-start gap-3 py-3 border-b border-line last:border-0">
      <div className="w-36 shrink-0 pt-0.5">
        <span className="text-[12px] font-medium text-ink">{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            {multiline ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="w-full rounded border border-line px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ink"
              />
            ) : (
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
                className="w-full rounded border border-line px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ink"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded bg-ink px-3 py-1.5 text-[11px] font-medium text-white hover:bg-ink/90"
              >
                <CheckCircle2 className="w-3 h-3" /> Save
              </button>
              <button
                onClick={() => { setDraft(displayValue); setEditing(false); }}
                className="rounded border border-line px-3 py-1.5 text-[11px] text-muted hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className={`text-[12px] flex-1 ${displayValue ? 'text-ink' : 'text-muted italic'}`}>
              {displayValue || '(not detected)'}
            </p>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => { setDraft(displayValue); setEditing(true); }}
                className="text-muted hover:text-ink"
                title="Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLockToggle}
                className={envelope?.locked ? 'text-ink' : 'text-muted hover:text-ink'}
                title={envelope?.locked ? 'Unlock' : 'Lock'}
              >
                {envelope?.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
        {!editing && envelope && (
          <div className="mt-1">
            <ConfidenceBadge confidence={envelope.confidence} source={envelope.source} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h4 className="text-[12px] font-semibold text-muted uppercase tracking-wide">{title}</h4>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────────

export function ProfileReviewPanel({
  token,
  run,
  onConfirm,
}: {
  token: string;
  run: StudioRunFull;
  onConfirm: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProfileData>((run.brandProfile.data as ProfileData) ?? {});
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (path: string, value: string | string[] | null, locked: boolean) => {
      // Update local state first
      const keys = path.split('.');
      const updated = structuredClone(data) as Record<string, unknown>;
      let cursor = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        cursor = (cursor[keys[i]] as Record<string, unknown>) ??= {};
      }
      const lastKey = keys[keys.length - 1]!;
      const existing = (cursor[lastKey] as FieldEnvelope<unknown>) ?? {};
      cursor[lastKey] = { ...existing, value, source: 'manual', confidence: 1, locked };
      setData(updated as ProfileData);

      // Persist to server
      setSaving(true);
      setSaveError(null);
      try {
        await patchProfile(token, run.id, updated);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [token, run.id, data],
  );

  const getField = (path: string): FieldEnvelope<string | string[] | null> | undefined => {
    const keys = path.split('.');
    let cursor = data as unknown;
    for (const k of keys) {
      if (typeof cursor !== 'object' || cursor === null) return undefined;
      cursor = (cursor as Record<string, unknown>)[k];
    }
    return cursor as FieldEnvelope<string | string[] | null> | undefined;
  };

  const field = (label: string, path: string, opts?: { multiline?: boolean; isArray?: boolean }) => (
    <FieldRow
      label={label}
      path={path}
      envelope={getField(path)}
      onSave={handleSave}
      multiline={opts?.multiline}
      isArray={opts?.isArray}
    />
  );

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-[12px] text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
        </div>
      )}
      {saving && <p className="text-[11px] text-muted">Saving…</p>}

      <Section title="Classification">
        {field('Vertical', 'classification.vertical')}
        {field('Sub-vertical', 'classification.subVertical')}
        {field('Business model', 'classification.businessModel')}
      </Section>

      <Section title="Identity">
        {field('Business name', 'identity.businessName')}
        {field('Tagline', 'identity.tagline')}
        {field('Description', 'identity.description', { multiline: true })}
      </Section>

      <Section title="Positioning">
        {field('Promoting', 'positioning.promoting')}
        {field('Offer', 'positioning.offer')}
        {field('Positioning', 'positioning.positioning', { multiline: true })}
        {field('Geography', 'positioning.geography')}
      </Section>

      <Section title="Market">
        {field('Audience', 'market.audienceDescription', { multiline: true })}
        {field('IDC Niches', 'market.targetCustomerIndustries', { isArray: true })}
        {field('Competitors', 'market.competitors', { isArray: true })}
        {field('Keywords', 'market.keywords', { isArray: true })}
      </Section>

      <Section title="Tone">
        {field('Tone', 'tone.tone')}
        {field('Hook patterns', 'tone.hooks', { isArray: true })}
      </Section>

      {/* Confirm to advance to research */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onConfirm}
          className="flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-[13px] font-medium text-white hover:bg-ink/90"
        >
          <CheckCircle2 className="w-4 h-4" />
          Profile looks good — start research
        </button>
      </div>
    </div>
  );
}
