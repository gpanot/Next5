'use client';

/**
 * Purpose & Positioning section — shown on the Brand page after website extraction.
 * Displays: Mission, Differentiation, Owned Space.
 */
import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { BrandExtractData, ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { Field } from '../../ui/Field';

type Props = {
  product: ProductLineDto | null;
  data: BrandExtractData;
  onUpdate: (next: BrandExtractData) => void;
};

type EditState = Pick<BrandExtractData, 'mission' | 'differentiation' | 'ownedSpace'>;

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-app-muted mb-1">{children}</p>
  );
}

export function BrandPurposeSection({ product, data, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditState>({
    mission: data.mission,
    differentiation: data.differentiation,
    ownedSpace: data.ownedSpace,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft({ mission: data.mission, differentiation: data.differentiation, ownedSpace: data.ownedSpace });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/app/workspace/brand-extract', {
        method: 'PATCH',
        json: { product, mission: draft.mission, differentiation: draft.differentiation, ownedSpace: draft.ownedSpace },
      });
      onUpdate({ ...data, ...draft });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const hasContent = data.mission || data.differentiation || data.ownedSpace;

  return (
    <section className="flex flex-col gap-0 rounded-2xl border border-app-line bg-app-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-app-line">
        <h2 className="text-[15px] font-semibold text-app-ink">Purpose &amp; Positioning</h2>
        {!editing && (
          <button type="button" className="text-[13px] text-app-accent font-medium" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-5 p-5">
        {editing ? (
          <>
            <Field label="Mission" htmlFor="brand-mission">
              <textarea
                id="brand-mission"
                rows={2}
                value={draft.mission}
                onChange={(e) => setDraft((s) => ({ ...s, mission: e.target.value }))}
                className="w-full rounded-xl border border-app-line px-3 py-2 text-[13px] text-app-ink focus:outline-none focus:ring-1 focus:ring-app-accent resize-none"
              />
            </Field>
            <Field label="Differentiation" htmlFor="brand-diff">
              <textarea
                id="brand-diff"
                rows={3}
                value={draft.differentiation}
                onChange={(e) => setDraft((s) => ({ ...s, differentiation: e.target.value }))}
                className="w-full rounded-xl border border-app-line px-3 py-2 text-[13px] text-app-ink focus:outline-none focus:ring-1 focus:ring-app-accent resize-none"
              />
            </Field>
            <Field label="Owned Space" htmlFor="brand-owned-space">
              <textarea
                id="brand-owned-space"
                rows={2}
                value={draft.ownedSpace}
                onChange={(e) => setDraft((s) => ({ ...s, ownedSpace: e.target.value }))}
                className="w-full rounded-xl border border-app-line px-3 py-2 text-[13px] text-app-ink focus:outline-none focus:ring-1 focus:ring-app-accent resize-none"
              />
            </Field>
            {error && <p className="text-[12px] text-app-danger">{error}</p>}
            <div className="flex items-center gap-3">
              <AppButton size="sm" loading={saving} onClick={save}>Save</AppButton>
              <AppButton size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</AppButton>
            </div>
          </>
        ) : (
          <>
            {data.mission && (
              <div className="flex flex-col gap-1">
                <SubLabel>Mission</SubLabel>
                <p className="text-[13px] text-app-ink leading-relaxed">{data.mission}</p>
              </div>
            )}
            {data.differentiation && (
              <div className="flex flex-col gap-1">
                <SubLabel>Differentiation</SubLabel>
                <p className="text-[13px] text-app-ink leading-relaxed">{data.differentiation}</p>
              </div>
            )}
            {data.ownedSpace && (
              <div className="flex flex-col gap-1">
                <SubLabel>Owned Space</SubLabel>
                {/* Owned Space gets a highlighted callout — matches the screenshot */}
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <p className="text-[13px] text-amber-900 leading-relaxed">{data.ownedSpace}</p>
                </div>
              </div>
            )}
            {!hasContent && (
              <p className="text-[13px] text-app-muted italic">Add your website to generate this section.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
