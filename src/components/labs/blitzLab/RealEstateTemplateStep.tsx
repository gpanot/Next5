'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { ListingFacts, ReAngle, SlideshowCopy } from '../../../server/labs/slideshowCopy';
import { useLabClient } from '../LabClientProvider';

// ── Angle metadata (descriptions only — no slide text) ────────────────────────

const ANGLE_META: Record<ReAngle, { label: string; description: string }> = {
  just_listed: { label: 'Just Listed', description: 'Spotlight the fresh listing with price and key facts.' },
  price_reduction: { label: 'Price Reduction', description: 'Celebrate a recent price drop and drive urgency.' },
  open_house: { label: 'Open House', description: 'Promote the upcoming open house with date and time.' },
  feature_highlight: { label: 'Feature Highlight', description: 'Lead with the most impressive features of the home.' },
  sold: { label: 'Sold', description: 'Show off a closed deal and invite sellers to reach out.' },
  neighborhood: { label: 'Neighborhood', description: 'Use the city name to attract local buyers.' },
};

type AngleCardProps = {
  angle: ReAngle;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
};

const AngleCard = ({ angle, loading, disabled, onClick }: AngleCardProps) => {
  const meta = ANGLE_META[angle];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex flex-col gap-2 rounded-2xl border p-5 text-left transition-all duration-150',
        disabled ? 'opacity-40 cursor-not-allowed border-line bg-white' : 'border-line bg-white hover:border-ink hover:shadow-sm active:scale-[0.98]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-semibold text-ink">{meta.label}</p>
        {loading && <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin text-muted" />}
      </div>
      <p className="text-[12px] leading-relaxed text-muted">{meta.description}</p>
    </button>
  );
};

type Props = {
  angles: ReAngle[];
  facts: ListingFacts;
  photoTags: string[];
  /** Legacy single-slideshow path, used only when onAngleSelected is absent. */
  onCopyReady?: (copy: SlideshowCopy) => void;
  /**
   * Optional: when provided, tapping an angle calls this immediately (no LLM call).
   * The parent is responsible for navigating to the deck/editor step.
   * When absent, the original behavior (generate copy → onCopyReady) is preserved.
   */
  onAngleSelected?: (angle: ReAngle) => void;
};

export function RealEstateTemplateStep({ angles, facts, photoTags, onCopyReady, onAngleSelected }: Props) {
  const client = useLabClient();
  const [loadingAngle, setLoadingAngle] = useState<ReAngle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAngle = async (angle: ReAngle) => {
    // Fast path: parent wants to own the generation (new deck flow).
    if (onAngleSelected) {
      onAngleSelected(angle);
      return;
    }

    // Legacy path: generate copy in this step, then call onCopyReady.
    setLoadingAngle(angle);
    setError(null);
    try {
      const res = await fetch(client.url('/blitz/slideshow-copy'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
        body: JSON.stringify({ facts, angle, photoTags }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as { copy: SlideshowCopy };
      onCopyReady?.(data.copy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate copy. Try again.');
    } finally {
      setLoadingAngle(null);
    }
  };

  const factsLine = [
    facts.priceUsd ? `$${Math.round(facts.priceUsd).toLocaleString('en-US')}` : null,
    facts.beds !== null ? `${facts.beds} bd` : null,
    facts.baths !== null ? `${facts.baths} ba` : null,
    facts.sqft ? `${facts.sqft.toLocaleString('en-US')} sqft` : null,
    facts.city ?? null,
  ].filter(Boolean).join(' · ');

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      <div>
        <h2 className="text-[16px] font-semibold text-ink">Pick a slideshow angle</h2>
        {factsLine && <p className="mt-0.5 text-[12px] text-muted">{factsLine}</p>}
        <p className="mt-1 text-[13px] text-muted">
          {onAngleSelected
            ? 'Each angle generates 6 swipeable hook variations. Tap one to build the deck.'
            : 'Each angle generates a 5-slide Hook → Meat → CTA slideshow. Tap one to generate copy.'}
        </p>
      </div>

      {angles.length === 0 && (
        <p className="rounded-xl bg-surface-alt px-4 py-6 text-center text-[13px] text-muted">
          No angles are available for this listing.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {angles.map((angle) => (
          <AngleCard
            key={angle}
            angle={angle}
            loading={loadingAngle === angle}
            disabled={loadingAngle !== null}
            onClick={() => void handleAngle(angle)}
          />
        ))}
      </div>

      {error && <p className="text-[13px] text-red-600" role="alert">{error}</p>}
    </section>
  );
}
