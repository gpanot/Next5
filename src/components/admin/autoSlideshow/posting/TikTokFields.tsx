'use client';

import type { ReactNode } from 'react';
import { BRANDED_PRIVATE, DISCLOSE_MISSING, PRIVACY_LABELS, type CreatorInfoDto } from '../../../../types/admin/autoSlideshow';
import { Toggle } from '../Toggle';

export type TikTokFieldValues = { privacy: string; comments: boolean; disclose: boolean; brandOrganic: boolean; brandContent: boolean; consent: boolean };

/** Nothing ticked or picked: TikTok's Direct Post rules allow no defaults. */
export const NO_TIKTOK_FIELDS: TikTokFieldValues = { privacy: '', comments: false, disclose: false, brandOrganic: false, brandContent: false, consent: false };

/** What blocks posting to TikTok, or null. */
export const tikTokProblem = (v: TikTokFieldValues): string | null => {
  if (v.disclose && !v.brandOrganic && !v.brandContent) return DISCLOSE_MISSING;
  if (!v.privacy) return 'Pick who can see it on TikTok.';
  if (v.brandContent && v.privacy === 'SELF_ONLY') return BRANDED_PRIVATE;
  if (!v.consent) return 'Tick the box to agree to TikTok\'s terms.';
  return null;
};

const field = 'min-h-11 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 text-base text-white focus:border-white/50 focus:outline-none';
const note = 'block text-xs text-white/50!';

/** The label TikTok puts on the post: "Paid partnership" wins when both are ticked. */
const labelOf = (v: TikTokFieldValues) => (v.brandContent ? 'Paid partnership' : v.brandOrganic ? 'Promotional content' : null);

function Row({ on, onChange, disabled, hint, children }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div title={disabled ? hint : undefined}>
      <Toggle on={on} onChange={onChange} disabled={disabled}>
        {children}
        {disabled && hint && <span className={note}>{hint}</span>}
      </Toggle>
    </div>
  );
}

/** "Disclose post content": off by default; on, who it promotes and the label TikTok adds. */
function Disclosure({ value, set }: { value: TikTokFieldValues; set: (patch: Partial<TikTokFieldValues>) => void }) {
  const label = labelOf(value);
  return (
    <div>
      <Row on={value.disclose} onChange={(disclose) => set(disclose ? { disclose } : { disclose, brandOrganic: false, brandContent: false })}>
        Disclose post content
        <span className={note}>Turn on to show this post promotes goods or services in exchange for something of value.</span>
      </Row>
      {value.disclose && (
        <div className="pl-8">
          <Row on={value.brandOrganic} onChange={(brandOrganic) => set({ brandOrganic })}>
            Your brand<span className={note}>You are promoting yourself or your own business.</span>
          </Row>
          <Row on={value.brandContent} onChange={(brandContent) => set({ brandContent })} disabled={value.privacy === 'SELF_ONLY' && !value.brandContent} hint={BRANDED_PRIVATE}>
            Branded content<span className={note}>You are promoting another brand or a third party.</span>
          </Row>
          {label
            ? <p className="rounded-lg bg-white/10 px-3 py-2 text-xs">Your photos will be labeled as &ldquo;{label}&rdquo;</p>
            : <p className="text-xs text-red-300">{DISCLOSE_MISSING}</p>}
        </div>
      )}
    </div>
  );
}

/** TikTok's required choices in the dark editor: the account, privacy picked by hand, comments, disclosure, consent. */
export function TikTokFields({ creator, value, onChange }: { creator: CreatorInfoDto; value: TikTokFieldValues; onChange: (v: TikTokFieldValues) => void }) {
  const set = (patch: Partial<TikTokFieldValues>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {creator.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        )}
        <p className="text-sm">Posting to TikTok as <span className="font-semibold">{creator.nickname}</span> <span className="text-white/50">@{creator.username}</span></p>
      </div>
      <select aria-label="Who can see this post on TikTok" value={value.privacy} onChange={(e) => set({ privacy: e.target.value })} className={field}>
        <option value="" disabled>Who can see it on TikTok…</option>
        {creator.privacyOptions.map((p) => {
          const blocked = p === 'SELF_ONLY' && value.brandContent;
          return <option key={p} value={p} disabled={blocked} title={blocked ? BRANDED_PRIVATE : undefined}>{PRIVACY_LABELS[p] ?? p}{blocked ? ' (not for branded content)' : ''}</option>;
        })}
      </select>
      <div className="text-white [&_label>span]:text-white">
        <Row on={value.comments && !creator.commentDisabled} onChange={(comments) => set({ comments })} disabled={creator.commentDisabled} hint="Turned off in your TikTok settings">Allow comments</Row>
        <Disclosure value={value} set={set} />
        <p className="py-1 text-xs text-white/50">Your post may take a few minutes to process and show on your TikTok profile after you post it.</p>
        <Row on={value.consent} onChange={(consent) => set({ consent })}>
          By posting, I agree to TikTok&apos;s{' '}
          {value.brandContent ? <><a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a> and </> : null}
          <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>
        </Row>
      </div>
    </div>
  );
}
