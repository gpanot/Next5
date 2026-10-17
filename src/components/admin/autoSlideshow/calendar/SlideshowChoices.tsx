'use client';

import { useState } from 'react';
import { DISCLOSE_MISSING, type CreatorInfoDto, type PostPlatform, type RunAccountsDto, type YouTubePrivacyChoice } from '../../../../types/admin/autoSlideshow';
import type { TikTokChoices } from '../../../../types/admin/blitzSchedule';
import { choicesProblem, TikTokFields } from '../../../labs/blitzLab/schedule/TikTokFields';
import { useAdminApi } from '../../business/useAdminApi';
import { defaultPlatforms, PlatformPicker } from '../posting/PlatformPicker';
import { YouTubeFields } from '../posting/YouTubeFields';

/** Nothing picked or ticked: TikTok's Direct Post rules allow no defaults. */
const NO_TIKTOK: TikTokChoices = { privacyLevel: '', allowComments: false, brandOrganic: false, brandContent: false, consent: false };

/**
 * One slideshow's post choices on the calendar, the same as a Blitz video's: the platforms, TikTok's Direct Post
 * choices (read live from the account) and YouTube's privacy. `problem` says what is missing; `blocked` is TikTok's
 * rule that Post stays disabled while disclosure is on with no box ticked.
 */
export function useSlideshowChoices(token: string, runId: string, accounts: RunAccountsDto) {
  const [platforms, setPlatforms] = useState<PostPlatform[]>(() => defaultPlatforms(accounts));
  const [tiktok, setTikTok] = useState<TikTokChoices>(NO_TIKTOK);
  const [disclose, setDisclose] = useState(false);
  const [youtube, setYouTube] = useState<YouTubePrivacyChoice>('private');
  const withTikTok = platforms.includes('tiktok');
  const creator = useAdminApi<{ creator: CreatorInfoDto }>(token, withTikTok ? `/api/admin/auto-slideshow/runs/${runId}/tiktok` : null);

  const problem = (): string | null => {
    if (platforms.length === 0) return 'Pick where to post.';
    if (!withTikTok) return null;
    if (!creator.data) return creator.error ?? 'One moment, loading your TikTok account.';
    return choicesProblem(tiktok, disclose);
  };
  const blocked = withTikTok && creator.data && choicesProblem(tiktok, disclose) === DISCLOSE_MISSING ? DISCLOSE_MISSING : null;
  const request = () => ({
    platforms,
    tiktok: withTikTok ? { ...tiktok, brandOrganic: disclose && tiktok.brandOrganic, brandContent: disclose && tiktok.brandContent } : null,
    youtube: platforms.includes('youtube') ? { privacyLevel: youtube } : null,
  });
  return { token, accounts, platforms, setPlatforms, creator, tiktok, setTikTok, disclose, setDisclose, youtube, setYouTube, problem, blocked, request };
}

export type SlideshowChoices = ReturnType<typeof useSlideshowChoices>;

/** Platforms, then TikTok's choices (a photo post: no Duet or Stitch) and YouTube's privacy for the ones picked. */
export function SlideshowChoicesForm({ c }: { c: SlideshowChoices }) {
  const creator = c.creator.data?.creator;
  return (
    <div className="space-y-3">
      <PlatformPicker accounts={c.accounts} value={c.platforms} onChange={c.setPlatforms} token={c.token} />
      {c.platforms.includes('tiktok') && (creator
        ? <TikTokFields photo creator={creator} value={c.tiktok} onChange={c.setTikTok} disclose={c.disclose} onDisclose={c.setDisclose} />
        : c.creator.error
          ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{c.creator.error}</p>
          : <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" aria-label="Loading your TikTok account" />)}
      {c.platforms.includes('youtube') && <YouTubeFields value={c.youtube} onChange={c.setYouTube} />}
    </div>
  );
}
