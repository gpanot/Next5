'use client';

import { YOUTUBE_PRIVACY_LABELS, type YouTubePrivacyChoice } from '../../../../types/admin/autoSlideshow';

type Props = { value: YouTubePrivacyChoice; onChange: (v: YouTubePrivacyChoice) => void; tone?: 'light' | 'dark' };

const TONE = {
  dark: 'border-white/15 bg-zinc-900 text-white focus:border-white/50',
  light: 'border-line bg-white text-ink focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100',
};

/** YouTube Shorts' one choice: who can see it. Private is the default, and what YouTube forces until Google audits the app. */
export function YouTubeFields({ value, onChange, tone = 'light' }: Props) {
  const dark = tone === 'dark';
  return (
    <div className="space-y-1">
      <select aria-label="Who can see this Short on YouTube" value={value} onChange={(e) => onChange(e.target.value as YouTubePrivacyChoice)} className={`min-h-11 w-full rounded-lg border px-3 text-base focus:outline-none ${TONE[tone]}`}>
        {(Object.keys(YOUTUBE_PRIVACY_LABELS) as YouTubePrivacyChoice[]).map((p) => <option key={p} value={p}>{YOUTUBE_PRIVACY_LABELS[p]}</option>)}
      </select>
      <p className={`text-xs ${dark ? 'text-white/50' : 'text-muted'}`}>Posted as a YouTube Short. The video is made first (about 90 seconds), then uploaded. Until Google approves the app, YouTube keeps every upload private.</p>
    </div>
  );
}
