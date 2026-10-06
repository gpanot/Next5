'use client';

import { useState } from 'react';
import { PLATFORM_LABELS, PRIVACY_LABELS, type CreatorInfoDto, type PostPlatform, type YouTubePrivacyChoice } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { Toggle } from '../Toggle';
import { YouTubeFields } from '../posting/YouTubeFields';
import type { ScheduleRequest } from '../usePosting';

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
      <button onClick={() => void onApprove({ items, platforms, tiktok: null, youtube: withYouTube ? { privacyLevel: yt } : null })} disabled={busy} className="min-h-12 w-full rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500">
        {busy ? 'Scheduling…' : approveLabel(items.length, platforms)}
      </button>
    </div>
  );
}

const field = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';

function CreatorRow({ creator }: { creator: CreatorInfoDto }) {
  return (
    <div className="flex items-center gap-3">
      {creator.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold dark:bg-zinc-800">{creator.nickname.charAt(0)}</span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink dark:text-zinc-100">{creator.nickname}</p>
        <p className="truncate text-xs text-muted">@{creator.username} · posting as this account</p>
      </div>
    </div>
  );
}

/**
 * The approval for the whole batch. With TikTok, its Direct Post rules apply: the account is shown, privacy is picked
 * by hand (no default), comments and disclosure are set, and the Music Usage Confirmation is accepted first.
 */
export function ApproveForm(props: Props) {
  if (!props.platforms.includes('tiktok')) return <NoTikTok items={props.items} platforms={props.platforms} busy={props.busy} onApprove={props.onApprove} />;
  return <TikTokApprove {...props} />;
}

function TikTokApprove({ token, runId, items, platforms, busy, onApprove, total }: Props) {
  const { data, error } = useAdminApi<{ creator: CreatorInfoDto }>(token, `/api/admin/auto-slideshow/runs/${runId}/tiktok`);
  const [privacy, setPrivacy] = useState('');
  const [comments, setComments] = useState(true);
  const [disclose, setDisclose] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [brandContent, setBrandContent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [yt, setYt] = useState<YouTubePrivacyChoice>('private');
  const creator = data?.creator;

  if (!creator) return error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />;

  const discloseIncomplete = disclose && !brandOrganic && !brandContent;
  const brandedPrivate = brandContent && privacy === 'SELF_ONLY';
  const ready = privacy && consent && !discloseIncomplete && !brandedPrivate;
  const submit = () =>
    void onApprove({ items, platforms, youtube: platforms.includes('youtube') ? { privacyLevel: yt } : null, tiktok: { privacyLevel: privacy, allowComments: comments && !creator.commentDisabled, brandOrganic: disclose && brandOrganic, brandContent: disclose && brandContent, consent } });

  return (
    <div className="space-y-3">
      <CreatorRow creator={creator} />
      <select aria-label="Who can see these posts" value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={field}>
        <option value="" disabled>Who can see these posts…</option>
        {creator.privacyOptions.map((p) => <option key={p} value={p}>{PRIVACY_LABELS[p] ?? p}</option>)}
      </select>
      {creator.privacyOptions.length === 1 && creator.privacyOptions[0] === 'SELF_ONLY' && (
        <p className="text-xs text-amber-700 dark:text-amber-400">Only &quot;Only me&quot; is offered: the TikTok app is not audited yet, so posts stay private.</p>
      )}
      <Toggle on={comments && !creator.commentDisabled} onChange={setComments} disabled={creator.commentDisabled}>Allow comments{creator.commentDisabled ? ' (turned off on this account)' : ''}</Toggle>
      <Toggle on={disclose} onChange={setDisclose}>This content promotes a brand, product or service</Toggle>
      {disclose && (
        <div className="space-y-1 pl-8">
          <Toggle on={brandOrganic} onChange={setBrandOrganic}>Your brand — shows a &quot;Promotional content&quot; label</Toggle>
          <Toggle on={brandContent} onChange={setBrandContent}>Branded content (a third party) — shows a &quot;Paid partnership&quot; label</Toggle>
          {discloseIncomplete && <p className="text-xs text-red-600">Pick at least one.</p>}
          {brandedPrivate && <p className="text-xs text-red-600">Branded content cannot be private.</p>}
        </div>
      )}
      <Toggle on={consent} onChange={setConsent}>
        I agree to TikTok&apos;s{' '}
        {brandContent ? <><a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a> and </> : null}
        <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>
      </Toggle>
      {platforms.includes('youtube') && <YouTubeFields value={yt} onChange={setYt} />}
      <button onClick={submit} disabled={!ready || busy} className="min-h-12 w-full rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500">
        {busy ? 'Scheduling…' : approveLabel(total ?? items.length, platforms)}
      </button>
    </div>
  );
}
