'use client';

import { BLITZ_PLATFORM_LABELS, BLITZ_PLATFORMS, type BlitzPlatform } from '../../../../types/admin/blitzSchedule';
import { YOUTUBE_PRIVACY_LABELS, type YouTubePrivacyChoice } from '../../../../types/admin/autoSlideshow';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import { ConnectTikTok } from './ConnectTikTok';
import { TikTokFields } from './TikTokFields';
import type { PostChoices } from './usePostChoices';

const handle = (u: string | null | undefined) => (u ? (u.startsWith('@') ? u : `@${u}`) : 'connected');

/** "Post to": TikTok or YouTube Shorts, one per video. */
function PlatformTabs({ c }: { c: PostChoices }) {
  return (
    <div role="radiogroup" aria-label="Post to" className="grid grid-cols-2 gap-2">
      {BLITZ_PLATFORMS.map((p) => {
        const on = c.platform === p;
        const account = c.accounts?.accounts[p];
        return (
          <button key={p} type="button" role="radio" aria-checked={on} onClick={() => c.setPlatform(p)} className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 text-left transition active:scale-95 ${on ? 'border-[var(--ink,#000)] bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-900' : 'border-[var(--line,#e8e5e1)] dark:border-neutral-800'}`}>
            <PlatformIcon id={p} className="h-5 w-5 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">{BLITZ_PLATFORM_LABELS[p]}</span>
              <span className="block truncate text-[11.5px] text-[var(--mute,#7c7d82)]">{c.accounts ? (account ? handle(account.username) : 'Not connected') : '…'}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The query to come back with after connecting a platform here (Post now reopens itself); absent = the page as is. */
type ResumeFor = (platform: BlitzPlatform) => string;

function YouTubePart({ c, resumeFor }: { c: PostChoices; resumeFor?: ResumeFor }) {
  if (!c.accounts) return <div className="h-20 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-label="Loading your YouTube channel" />;
  if (!c.accounts.accounts.youtube) return <ConnectTikTok provider="youtube" resume={resumeFor?.('youtube')} />;
  return (
    <div className="space-y-1">
      <select aria-label="Who can see this Short" value={c.youtube} onChange={(e) => c.setYouTube(e.target.value as YouTubePrivacyChoice)} className="min-h-11 w-full rounded-xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-3 text-base text-[var(--ink,#000)] focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">
        {(Object.keys(YOUTUBE_PRIVACY_LABELS) as YouTubePrivacyChoice[]).map((p) => <option key={p} value={p}>{YOUTUBE_PRIVACY_LABELS[p]}</option>)}
      </select>
      <p className="text-[12px] text-[var(--mute,#7c7d82)]">Posted as a YouTube Short. Until Google approves the app, YouTube keeps every upload private.</p>
    </div>
  );
}

function TikTokPart({ c, resumeFor }: { c: PostChoices; resumeFor?: ResumeFor }) {
  const { creator } = c;
  if (creator.status === 'loading') return <div className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-label="Loading your TikTok account" />;
  if (creator.status === 'error') {
    if (creator.notConnected) return <ConnectTikTok resume={resumeFor?.('tiktok')} />;
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">{creator.message}</p>;
  }
  return <TikTokFields creator={creator.creator} value={c.tiktok} onChange={c.setTikTok} disclose={c.disclose} onDisclose={c.setDisclose} />;
}

/** Platform picker, then that platform's choices (or its Connect row). Shared by approving and posting now. */
export function PostChoicesForm({ choices, resumeFor }: { choices: PostChoices; resumeFor?: ResumeFor }) {
  const platform: BlitzPlatform = choices.platform;
  return (
    <div className="space-y-3">
      <PlatformTabs c={choices} />
      {platform === 'youtube' ? <YouTubePart c={choices} resumeFor={resumeFor} /> : <TikTokPart c={choices} resumeFor={resumeFor} />}
    </div>
  );
}
