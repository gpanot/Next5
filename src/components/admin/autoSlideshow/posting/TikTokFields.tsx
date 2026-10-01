'use client';

import { PRIVACY_LABELS, type CreatorInfoDto } from '../../../../types/admin/autoSlideshow';
import { Toggle } from '../Toggle';

export type TikTokFieldValues = { privacy: string; comments: boolean; brandOrganic: boolean; consent: boolean };

const field = 'min-h-11 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 text-base text-white focus:border-white/50 focus:outline-none';

/** TikTok's required choices in the dark editor: the account shown, privacy picked by hand, comments, disclosure, consent. */
export function TikTokFields({ creator, value, onChange }: { creator: CreatorInfoDto; value: TikTokFieldValues; onChange: (v: TikTokFieldValues) => void }) {
  const set = (patch: Partial<TikTokFieldValues>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-2">
      <p className="text-sm">TikTok as <span className="font-semibold">{creator.nickname}</span> <span className="text-white/50">@{creator.username}</span></p>
      <select aria-label="Who can see this post on TikTok" value={value.privacy} onChange={(e) => set({ privacy: e.target.value })} className={field}>
        <option value="" disabled>Who can see it on TikTok…</option>
        {creator.privacyOptions.map((p) => <option key={p} value={p}>{PRIVACY_LABELS[p] ?? p}</option>)}
      </select>
      <div className="text-white [&_span]:text-white">
        <Toggle on={value.comments && !creator.commentDisabled} onChange={(comments) => set({ comments })} disabled={creator.commentDisabled}>Allow comments</Toggle>
        <Toggle on={value.brandOrganic} onChange={(brandOrganic) => set({ brandOrganic })}>Promotes my own business (&quot;Promotional content&quot; label)</Toggle>
        <Toggle on={value.consent} onChange={(consent) => set({ consent })}>
          I agree to TikTok&apos;s <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>
        </Toggle>
      </div>
    </div>
  );
}
