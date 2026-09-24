'use client';

/**
 * Identity & Product section — shown on the Brand page after website extraction.
 * Displays: Core Identity, Product Offering, Unique Benefits, Problem Solution.
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

type EditState = Pick<BrandExtractData, 'coreIdentity' | 'productOffering' | 'uniqueBenefits' | 'problemSolution'>;

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-app-muted mb-1">{children}</p>
  );
}

function ReadBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <SubLabel>{label}</SubLabel>
      <p className="text-[13px] text-app-ink leading-relaxed">{value}</p>
    </div>
  );
}

export function BrandIdentitySection({ product, data, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditState>({
    coreIdentity: data.coreIdentity,
    productOffering: data.productOffering,
    uniqueBenefits: data.uniqueBenefits,
    problemSolution: data.problemSolution,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft({
      coreIdentity: data.coreIdentity,
      productOffering: data.productOffering,
      uniqueBenefits: data.uniqueBenefits,
      problemSolution: data.problemSolution,
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/app/workspace/brand-extract', {
        method: 'PATCH',
        json: { product, ...draft },
      });
      onUpdate({ ...data, ...draft });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-0 rounded-2xl border border-app-line bg-app-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-app-line">
        <h2 className="text-[15px] font-semibold text-app-ink">Identity &amp; Product</h2>
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
            <Field label="Core Identity" htmlFor="core-identity">
              <textarea
                id="core-identity"
                rows={3}
                value={draft.coreIdentity}
                onChange={(e) => setDraft((s) => ({ ...s, coreIdentity: e.target.value }))}
                className="w-full rounded-xl border border-app-line px-3 py-2 text-[13px] text-app-ink focus:outline-none focus:ring-1 focus:ring-app-accent resize-none"
              />
            </Field>
            <Field label="Product Offering" htmlFor="product-offering">
              <textarea
                id="product-offering"
                rows={3}
                value={draft.productOffering}
                onChange={(e) => setDraft((s) => ({ ...s, productOffering: e.target.value }))}
                className="w-full rounded-xl border border-app-line px-3 py-2 text-[13px] text-app-ink focus:outline-none focus:ring-1 focus:ring-app-accent resize-none"
              />
            </Field>
            <Field label="Unique Benefits" htmlFor="unique-benefits">
              <textarea
                id="unique-benefits"
                rows={3}
                value={draft.uniqueBenefits}
                onChange={(e) => setDraft((s) => ({ ...s, uniqueBenefits: e.target.value }))}
                className="w-full rounded-xl border border-app-line px-3 py-2 text-[13px] text-app-ink focus:outline-none focus:ring-1 focus:ring-app-accent resize-none"
              />
            </Field>
            <Field label="Problem Solution" htmlFor="problem-solution">
              <textarea
                id="problem-solution"
                rows={3}
                value={draft.problemSolution}
                onChange={(e) => setDraft((s) => ({ ...s, problemSolution: e.target.value }))}
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
            <ReadBlock label="Core Identity" value={data.coreIdentity} />
            <ReadBlock label="Product Offering" value={data.productOffering} />
            <ReadBlock label="Unique Benefits" value={data.uniqueBenefits} />
            <ReadBlock label="Problem Solution" value={data.problemSolution} />
            {!data.coreIdentity && !data.productOffering && !data.uniqueBenefits && !data.problemSolution && (
              <p className="text-[13px] text-app-muted italic">Add your website to generate this section.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
