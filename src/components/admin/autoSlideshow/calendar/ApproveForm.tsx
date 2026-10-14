'use client';

import { useState } from 'react';
import { PLATFORM_LABELS, type CreatorInfoDto, type PostPlatform, type YouTubePrivacyChoice } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { YouTubeFields } from '../posting/YouTubeFields';
import type { ScheduleRequest } from '../usePosting';
import type { TikTokChoices } from '../../../../types/admin/blitzSchedule';
import { choicesProblem, TikTokFields } from '../../../labs/blitzLab/schedule/TikTokFields';

type Props = {
  token: string;
  runId: string;
  items: ScheduleRequest['items'];
  platforms: PostPlatform[];
  busy: boolean;
  onApprove: (req: ScheduleRequest) => Promise<boolean>;
  /** Posts approved in all, when more than `items` (Blitz videos ride along on TikTok). */
  total?: number;
};

const count = (n: number) => `${n} ${n === 1 ? 'post' : 'posts'}`;
const approveLabel = (n: number, platforms: PostPlatform[]) => `Approve ${count(n)} on ${platforms.map((p) => PLATFORM_LABELS[p]).join(' + ')}`;

/** Instagram and/or YouTube, no TikTok: Instagram posts are public on the account; YouTube asks who can see the Short. */
function NoTikTok({ items, platforms, busy, onApprove }: Omit<Props, 'token' | 'runId' | 'total'>) {
  const [yt, setYt] = useState<YouTubePrivacyChoice>('private');
  const withYouTube = platforms.includes('youtube');
  return (
    <div className="space-y-3">
      {withYouTube && <YouTubeFields value={yt} onChange={setYt} />}
      <button onClick={() => void onApprove({ items, platforms, tiktok: null, youtube: withYouTube ? { privacyLevel: yt } : null })} disabled={busy} className="min-h-12 w-full rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95 disabled:opacity-40">
        {busy ? 'Scheduling…' : approveLabel(items.length, platforms)}
      </button>
    </div>
  );
}

/** "Posts go": straight to the profile (Direct Post), or to the account's TikTok drafts to finish in the app. */
function PostModePicker({ asDraft, canDraft, onChange }: { asDraft: boolean; canDraft: boolean; onChange: (asDraft: boolean) => void }) {
  const pill = (on: boolean) =>
    `min-h-11 rounded-full border px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${on ? 'border-emerald-500 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'border-line text-muted hover:text-ink dark:border-zinc-700 dark:hover:text-zinc-100'}`;
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-muted">Posts go</legend>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!asDraft} onClick={() => onChange(false)} className={pill(!asDraft)}>Straight to the profile</button>
        <button type="button" aria-pressed={asDraft} onClick={() => onChange(true)} disabled={!canDraft} className={pill(asDraft)}>To drafts for review</button>
      </div>
      {asDraft && <p className="text-xs text-muted">Each post lands in your TikTok inbox. Open TikTok, add a sound, and post it. Good to warm up a new account.</p>}
      {!canDraft && <p className="text-xs text-muted">Drafts need TikTok&apos;s upload permission. Reconnect the account in Settings → Accounts.</p>}
    </fieldset>
  );
}

/**
 * The approval for the whole batch. With TikTok, its Direct Post rules apply (the same fields as one slideshow or video):
 * the account is shown, privacy is picked by hand, comments start off, disclosure is set, and consent is given first.
 */
export function ApproveForm(props: Props) {
  if (!props.platforms.includes('tiktok')) return <NoTikTok items={props.items} platforms={props.platforms} busy={props.busy} onApprove={props.onApprove} />;
  return <TikTokApprove {...props} />;
}

const NO_TIKTOK: TikTokChoices = { privacyLevel: '', allowComments: false, brandOrganic: false, brandContent: false, consent: false };

function TikTokApprove({ token, runId, items, platforms, busy, onApprove, total }: Props) {
  const { data, error } = useAdminApi<{ creator: CreatorInfoDto }>(token, `/api/admin/auto-slideshow/runs/${runId}/tiktok`);
  const [tiktok, setTikTok] = useState<TikTokChoices>(NO_TIKTOK);
  const [disclose, setDisclose] = useState(false);
  const [asDraft, setAsDraft] = useState(false);
  const [yt, setYt] = useState<YouTubePrivacyChoice>('private');
  const creator = data?.creator;

  if (!creator) return error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />;

  const problem = asDraft ? null : choicesProblem(tiktok, disclose);
  const youtube = platforms.includes('youtube') ? { privacyLevel: yt } : null;
  const submit = () =>
    void onApprove({ items, platforms, youtube, tiktok: asDraft ? { privacyLevel: '', allowComments: true, brandOrganic: false, brandContent: false, consent: false, asDraft: true } : { privacyLevel: tiktok.privacyLevel, allowComments: tiktok.allowComments && !creator.commentDisabled, brandOrganic: disclose && tiktok.brandOrganic, brandContent: disclose && tiktok.brandContent, consent: tiktok.consent } });

  return (
    <div className="space-y-3">
      <PostModePicker asDraft={asDraft} canDraft={creator.canDraft} onChange={setAsDraft} />
      {!asDraft && (
        <>
          {creator.privacyOptions.length === 1 && creator.privacyOptions[0] === 'SELF_ONLY' && (
            <p className="text-xs text-amber-700 dark:text-amber-400">Only &quot;Only me&quot; is offered: the TikTok app is not audited yet, so posts stay private.</p>
          )}
          <TikTokFields photo creator={creator} value={tiktok} onChange={setTikTok} disclose={disclose} onDisclose={setDisclose} />
        </>
      )}
      {platforms.includes('youtube') && <YouTubeFields value={yt} onChange={setYt} />}
      <button onClick={submit} disabled={Boolean(problem) || busy} title={problem ?? undefined} className="min-h-12 w-full rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95 disabled:opacity-40">
        {busy ? 'Scheduling…' : approveLabel(total ?? items.length, platforms)}
      </button>
      {problem && <p className="text-center text-xs text-muted">{problem}</p>}
    </div>
  );
}
