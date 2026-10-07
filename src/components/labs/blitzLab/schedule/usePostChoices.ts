'use client';

import { useEffect, useState } from 'react';
import type { ApproveBlitzRequest, BlitzAccountsDto, BlitzPlatform, TikTokChoices } from '../../../../types/admin/blitzSchedule';
import type { YouTubePrivacyChoice } from '../../../../types/admin/autoSlideshow';
import { useLabClient } from '../../LabClientProvider';
import { scheduleApi } from './scheduleApi';
import { choicesReady, useTikTokCreator } from './TikTokFields';

const NO_TIKTOK: TikTokChoices = { privacyLevel: '', allowComments: true, brandOrganic: false, brandContent: false, consent: false };

/** The workspace's connected platforms; null while loading. */
export function useBlitzAccounts() {
  const client = useLabClient();
  const [accounts, setAccounts] = useState<BlitzAccountsDto | null>(null);
  useEffect(() => {
    let cancelled = false;
    scheduleApi.accounts(client).then((res) => !cancelled && setAccounts(res.ok ? res.data : { accounts: {}, configured: { tiktok: true, youtube: true } })).catch(() => !cancelled && setAccounts({ accounts: {}, configured: { tiktok: true, youtube: true } }));
    return () => {
      cancelled = true;
    };
  }, [client]);
  return accounts;
}

/**
 * Where a Blitz video posts and the choices for it: the platform (TikTok, or YouTube Shorts), TikTok's Direct Post
 * choices or YouTube's privacy. `check` says what is missing; `request` is what the server stores. `initial`: the
 * platform picked already (back from connecting it).
 */
export function usePostChoices(initial?: BlitzPlatform) {
  const accounts = useBlitzAccounts();
  const creator = useTikTokCreator();
  const [picked, setPicked] = useState<BlitzPlatform | null>(initial ?? null);
  const [tiktok, setTikTok] = useState<TikTokChoices>(NO_TIKTOK);
  const [disclose, setDisclose] = useState(false);
  const [youtube, setYouTube] = useState<YouTubePrivacyChoice>('private');
  // Until a person picks: the first connected platform, TikTok when none is.
  const platform: BlitzPlatform = picked ?? (accounts && !accounts.accounts.tiktok && accounts.accounts.youtube ? 'youtube' : 'tiktok');

  const check = (): string | null => {
    if (!accounts || (platform === 'tiktok' && creator.status === 'loading')) return 'One moment, loading your accounts.';
    if (!accounts.accounts[platform] && !(platform === 'tiktok' && creator.status === 'ready')) return platform === 'tiktok' ? 'Connect at least one social media account.' : 'Connect your YouTube channel first.';
    if (platform === 'tiktok' && creator.status === 'error') return creator.message;
    if (platform === 'tiktok' && !choicesReady(tiktok, disclose)) return 'Pick who can see it on TikTok and tick the box to agree.';
    return null;
  };
  const request = (): ApproveBlitzRequest => platform === 'youtube'
    ? { platform, youtube: { privacyLevel: youtube } }
    : { platform, tiktok: { ...tiktok, brandOrganic: disclose && tiktok.brandOrganic, brandContent: disclose && tiktok.brandContent } };
  return { accounts, creator, platform, setPlatform: setPicked, tiktok, setTikTok, disclose, setDisclose, youtube, setYouTube, check, request };
}

export type PostChoices = ReturnType<typeof usePostChoices>;
