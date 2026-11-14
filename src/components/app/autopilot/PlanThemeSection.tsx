'use client';

import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { beatOf, isCardKind } from '../../../lib/realtorPlaybooks';
import { slideThemeOf, type SlideTheme } from '../../../lib/slideThemes';
import type { CampaignDto } from '../../../types/business/campaigns';
import { SlideThemePicker } from '../slideThemes/SlideThemePicker';

/** Posts of the plan that are photo slideshows of the home (market updates and tip cards have their own look). */
const homeSlideshows = (campaign: CampaignDto) =>
  campaign.posts.filter((p) => {
    const kind = beatOf(p.beatKey)?.slideshow;
    return !p.skipped && p.format === 'slideshow' && kind && kind !== 'market_stats' && !isCardKind(kind);
  });

/** Plan step: the look of this plan's home slideshows. Hidden when the plan has none. Saved on pick. */
export const PlanThemeSection = ({ campaign }: { campaign: CampaignDto }) => {
  const count = homeSlideshows(campaign).length;
  const url = campaign.listingId && count > 0 ? `/api/app/campaigns/${campaign.id}/slide-theme` : null;
  const api = useApi<{ theme: string }>(url);
  const [picked, setPicked] = useState<SlideTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!url || !campaign.listingId) return null;
  const value = picked ?? slideThemeOf(api.data?.theme);

  const pick = async (theme: SlideTheme) => {
    const before = value;
    setPicked(theme);
    setError(null);
    try {
      await apiFetch(url, { method: 'PUT', json: { theme } });
    } catch (err) {
      setPicked(before);
      setError(err instanceof ApiError ? err.message : 'Could not save the theme.');
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-app-line bg-app-panel p-4 sm:p-5">
      <header>
        <h2 className="text-[15px] font-semibold text-app-ink">Slideshow theme</h2>
        <p className="text-[13px] text-app-muted">Used for the {count} slideshow{count === 1 ? '' : 's'} of this plan. Your home&apos;s own photos are used.</p>
      </header>
      {api.loading && !api.data ? (
        <div className="flex gap-3 overflow-hidden">{[0, 1, 2].map((i) => <div key={i} className="aspect-[9/16] w-[120px] shrink-0 animate-pulse rounded-xl bg-app-sunken" />)}</div>
      ) : (
        <SlideThemePicker value={value} onChange={(t) => void pick(t)} />
      )}
      {(error || api.error) && <p className="text-[13px] text-app-danger" role="alert">{error ?? api.error}</p>}
    </section>
  );
};
