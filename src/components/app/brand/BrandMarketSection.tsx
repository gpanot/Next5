'use client';

/**
 * Market & Competition section — shown on the Brand page after website extraction.
 * Displays: Customer Segments (with percentage bars), Competitors (chip list).
 */
import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { BrandExtractData, BrandSegmentDto, ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';

type Props = {
  product: ProductLineDto | null;
  data: BrandExtractData;
  onUpdate: (next: BrandExtractData) => void;
};

/** Horizontal percentage bar. */
function SegmentBar({ name, description, percentage }: BrandSegmentDto) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <span className="text-[13px] font-medium text-app-ink truncate">{name}</span>
          <span className="text-[12px] text-app-muted ml-2 shrink-0">{percentage}%</span>
        </div>
        {description && <p className="text-[11px] text-app-muted leading-snug mb-1">{description}</p>}
        <div className="h-1.5 w-full rounded-full bg-app-line overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-400"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function BrandMarketSection({ product, data, onUpdate }: Props) {
  const [editingCompetitors, setEditingCompetitors] = useState(false);
  const [competitorDraft, setCompetitorDraft] = useState(data.competitors.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveCompetitors = async () => {
    setSaving(true);
    setError(null);
    const newList = competitorDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await apiFetch('/api/app/workspace/brand-extract', {
        method: 'PATCH',
        json: { product, competitors: newList },
      });
      onUpdate({ ...data, competitors: newList });
      setEditingCompetitors(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const hasContent = data.customerSegments.length > 0 || data.competitors.length > 0;

  return (
    <section className="flex flex-col gap-0 rounded-2xl border border-app-line bg-app-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-app-line">
        <h2 className="text-[15px] font-semibold text-app-ink">Market &amp; Competition</h2>
      </div>

      {!hasContent ? (
        <p className="px-5 py-4 text-[13px] text-app-muted italic">Add your website to generate this section.</p>
      ) : (
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-app-line">
          {/* Customer Segments */}
          <div className="p-5 flex flex-col gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-app-muted">
              Customer Segments
            </p>
            {/* Gradient bar representing all segments stacked */}
            {data.customerSegments.length > 0 && (
              <div className="flex h-2 w-full rounded-full overflow-hidden gap-px">
                {data.customerSegments.map((seg, i) => (
                  <div
                    key={i}
                    className="h-full"
                    style={{
                      width: `${seg.percentage}%`,
                      background: `hsl(${(i * 60 + 220) % 360}, 70%, 60%)`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {data.customerSegments.map((seg, i) => (
                <SegmentBar key={i} {...seg} />
              ))}
            </div>
          </div>

          {/* Competitors */}
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-app-muted">
                Competitors
              </p>
              {!editingCompetitors && (
                <button
                  type="button"
                  className="text-[12px] text-app-accent font-medium"
                  onClick={() => { setCompetitorDraft(data.competitors.join(', ')); setEditingCompetitors(true); }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingCompetitors ? (
              <div className="flex flex-col gap-2">
                <textarea
                  rows={3}
                  value={competitorDraft}
                  onChange={(e) => setCompetitorDraft(e.target.value)}
                  placeholder="Competitor A, Competitor B, Competitor C"
                  className="w-full rounded-xl border border-app-line px-3 py-2 text-[13px] text-app-ink focus:outline-none focus:ring-1 focus:ring-app-accent resize-none"
                />
                <p className="text-[11px] text-app-muted">Comma-separated list</p>
                {error && <p className="text-[12px] text-app-danger">{error}</p>}
                <div className="flex gap-2">
                  <AppButton size="sm" loading={saving} onClick={saveCompetitors}>Save</AppButton>
                  <AppButton size="sm" variant="ghost" onClick={() => setEditingCompetitors(false)}>Cancel</AppButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.competitors.length > 0 ? (
                  data.competitors.map((name, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-app-line bg-app-surface px-3 py-1 text-[12px] font-medium text-app-ink"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <p className="text-[13px] text-app-muted italic">None detected — add manually.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
