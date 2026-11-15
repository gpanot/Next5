'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../lib/apiClient';
import type { CampaignDto, PostMediaDto } from '../../../types/business/campaigns';
import { getPlaybook } from './api';

const POLL_MS = 5000;

const isMaking = (c: CampaignDto | null) => Boolean(c && c.status === 'scheduled' && c.posts.some((p) => !p.skipped && p.mediaStatus === 'generating'));

/** A signed URL without its signature: the same file across polls. */
const fileOf = (url: string | null) => (url ? url.split('?')[0] : null);
const keepUrl = (prev: string | null, next: string | null) => (prev && fileOf(prev) === fileOf(next) ? prev : next);

/** Each poll re-signs every URL. Keep the old one per file, or a ready video reloads every 5 s and stays grey. */
const keepMedia = (prev: PostMediaDto | null | undefined, next: PostMediaDto | null): PostMediaDto | null => {
  if (!prev || !next) return next;
  return {
    coverUrl: keepUrl(prev.coverUrl, next.coverUrl),
    videoUrl: keepUrl(prev.videoUrl, next.videoUrl),
    slideUrls: next.slideUrls.map((url) => prev.slideUrls.find((old) => fileOf(old) === fileOf(url)) ?? url),
  };
};

const withStableUrls = (prev: CampaignDto | null, next: CampaignDto): CampaignDto => {
  if (!prev || prev.id !== next.id) return next;
  return { ...next, posts: next.posts.map((post) => ({ ...post, media: keepMedia(prev.posts.find((p) => p.id === post.id)?.media, post.media) })) };
};

type Loaded = { campaign: CampaignDto | null; error: string | null; done: boolean };

/** One playbook campaign: loads it, and polls while its posts are still being made. */
export const usePlaybook = (id: string | null) => {
  const [state, setState] = useState<Loaded>({ campaign: null, error: null, done: !id });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPlaybook(id)
      .then((campaign) => !cancelled && setState((prev) => ({ campaign: withStableUrls(prev.campaign, campaign), error: null, done: true })))
      .catch((err: unknown) => !cancelled && setState((prev) => ({ ...prev, error: err instanceof ApiError ? err.message : 'Could not open this plan.', done: true })));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setCampaign = useCallback((campaign: CampaignDto) => setState((prev) => ({ campaign: withStableUrls(prev.campaign, campaign), error: null, done: true })), []);

  const making = isMaking(state.campaign);
  useEffect(() => {
    if (!making) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [making, reload]);

  return { campaign: state.campaign, setCampaign, loading: !state.done, error: state.error, reload, making };
};
