'use client';

import { BLITZ_PLATFORM_LABELS, BLITZ_PLATFORMS, type BlitzPlatform } from '../../../../types/admin/blitzSchedule';
import { YOUTUBE_PRIVACY_LABELS, type YouTubePrivacyChoice } from '../../../../types/admin/autoSlideshow';
import { useLabClient } from '../../LabClientProvider';
import { ChannelList } from './ChannelList';
import { labWorkspaceOf, startLabConnect } from './labConnect';
import { TikTokFields } from './TikTokFields';
import type { PostChoices } from './usePostChoices';

/** The query to come back with after connecting a platform here (Post now reopens itself); absent = the page as is. */
type ResumeFor = (platform: BlitzPlatform) => string;

/** "Post to": the same channel rows as a slideshow's approval, one pick (a video posts to TikTok or YouTube Shorts). */
function Channels({ c, resumeFor }: { c: PostChoices; resumeFor?: ResumeFor }) {
  const client = useLabClient();
  if (!c.accounts) return <div className="h-28 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-label="Loading your accounts" />;
  const rows = BLITZ_PLATFORMS.map((p) => {
    const account = c.accounts!.accounts[p];
    return { id: p, label: BLITZ_PLATFORM_LABELS[p], username: account?.username ?? null, connected: Boolean(account), available: c.accounts!.configured[p] };
  });
  const connect = labWorkspaceOf(client) ? (p: BlitzPlatform) => startLabConnect(client, p, resumeFor?.(p)) : undefined;
  return <ChannelList mode="one" rows={rows} value={[c.platform]} onChange={([p]) => p && c.setPlatform(p)} connect={connect} />;
}

/** YouTube's privacy, once the channel is connected (its row in the list offers Connect until then). */
function YouTubePart({ c }: { c: PostChoices }) {
  if (!c.accounts?.accounts.youtube) return null;
  return (
    <div className="space-y-1">
      <select aria-label="Who can see this Short" value={c.youtube} onChange={(e) => c.setYouTube(e.target.value as YouTubePrivacyChoice)} className="min-h-11 w-full rounded-xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-3 text-base text-[var(--ink,#000)] focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">
        {(Object.keys(YOUTUBE_PRIVACY_LABELS) as YouTubePrivacyChoice[]).map((p) => <option key={p} value={p}>{YOUTUBE_PRIVACY_LABELS[p]}</option>)}
      </select>
      <p className="text-[12px] text-[var(--mute,#7c7d82)]">Posted as a YouTube Short. Until Google approves the app, YouTube keeps every upload private.</p>
    </div>
  );
}

/** TikTok's Direct Post choices, read live from the account (its row in the list offers Connect until it is connected). */
function TikTokPart({ c }: { c: PostChoices }) {
  const { creator } = c;
  if (creator.status === 'loading') return <div className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-label="Loading your TikTok account" />;
  if (creator.status === 'error') {
    if (creator.notConnected) return null;
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">{creator.message}</p>;
  }
  return <TikTokFields creator={creator.creator} value={c.tiktok} onChange={c.setTikTok} disclose={c.disclose} onDisclose={c.setDisclose} />;
}

/** Channel list, then the picked platform's choices. Shared by approving and posting now. */
export function PostChoicesForm({ choices, resumeFor }: { choices: PostChoices; resumeFor?: ResumeFor }) {
  const platform: BlitzPlatform = choices.platform;
  return (
    <div className="space-y-3">
      <Channels c={choices} resumeFor={resumeFor} />
      {platform === 'youtube' ? <YouTubePart c={choices} /> : <TikTokPart c={choices} />}
    </div>
  );
}
