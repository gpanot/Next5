'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { PRIVACY_LABELS, type CreatorInfoDto } from '../../../../types/admin/autoSlideshow';
import type { TikTokChoices } from '../../../../types/admin/blitzSchedule';
import { errorOf } from '../../labClient';
import { useLabClient } from '../../LabClientProvider';
import { scheduleApi } from './scheduleApi';

type CreatorState = { status: 'loading' } | { status: 'error'; message: string; notConnected: boolean } | { status: 'ready'; creator: CreatorInfoDto };

/** The workspace's TikTok account, read live before each post (TikTok's Direct Post rule). */
export function useTikTokCreator() {
  const client = useLabClient();
  const [state, setState] = useState<CreatorState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    scheduleApi.creator(client)
      .then((res): CreatorState => (res.ok ? { status: 'ready', creator: res.data.creator } : { status: 'error', message: errorOf(res), notConnected: res.status === 409 }))
      .catch((): CreatorState => ({ status: 'error', message: 'Could not reach TikTok. Check your connection.', notConnected: false }))
      .then((next) => !cancelled && setState(next));
    return () => {
      cancelled = true;
    };
  }, [client]);
  return state;
}

/** TikTok's choices are valid: privacy picked, consent given, disclosure complete. */
export const choicesReady = (c: TikTokChoices, disclose: boolean) =>
  Boolean(c.privacyLevel) && c.consent && !(disclose && !c.brandOrganic && !c.brandContent) && !(c.brandContent && c.privacyLevel === 'SELF_ONLY');

function Check({ on, onChange, disabled, children }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className={`flex min-h-11 items-center gap-3 text-[13.5px] text-[var(--ink,#000)] dark:text-neutral-100 ${disabled ? 'opacity-50' : ''}`}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--ready,#1e8049)]" />
      <span>{children}</span>
    </label>
  );
}

function CreatorRow({ creator }: { creator: CreatorInfoDto }) {
  return (
    <div className="flex items-center gap-3">
      {creator.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold dark:bg-neutral-800">{creator.nickname.charAt(0)}</span>
      )}
      <p className="min-w-0 truncate text-[13px] text-[var(--mute,#7c7d82)]">
        Posting as <b className="font-semibold text-[var(--ink,#000)] dark:text-neutral-100">@{creator.username}</b>
      </p>
    </div>
  );
}

type Props = {
  creator: CreatorInfoDto;
  value: TikTokChoices;
  onChange: (next: TikTokChoices) => void;
  disclose: boolean;
  onDisclose: (on: boolean) => void;
};

/**
 * TikTok's Direct Post choices for this video: the account is shown, privacy is picked by hand (no default), comments
 * and disclosure are set, and the Music Usage Confirmation is accepted.
 */
export function TikTokFields({ creator, value, onChange, disclose, onDisclose }: Props) {
  const set = (patch: Partial<TikTokChoices>) => onChange({ ...value, ...patch });
  const incomplete = disclose && !value.brandOrganic && !value.brandContent;
  return (
    <div className="space-y-1">
      <CreatorRow creator={creator} />
      <select
        aria-label="Who can see this post"
        value={value.privacyLevel}
        onChange={(e) => set({ privacyLevel: e.target.value })}
        className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-3 text-base text-[var(--ink,#000)] focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
      >
        <option value="" disabled>Who can see this post…</option>
        {creator.privacyOptions.map((p) => <option key={p} value={p}>{PRIVACY_LABELS[p] ?? p}</option>)}
      </select>
      <Check on={value.allowComments && !creator.commentDisabled} onChange={(v) => set({ allowComments: v })} disabled={creator.commentDisabled}>Allow comments</Check>
      <Check on={disclose} onChange={onDisclose}>This video promotes a brand, product or service</Check>
      {disclose && (
        <div className="pl-8">
          <Check on={value.brandOrganic} onChange={(v) => set({ brandOrganic: v })}>Your brand (&quot;Promotional content&quot; label)</Check>
          <Check on={value.brandContent} onChange={(v) => set({ brandContent: v })}>Branded content (&quot;Paid partnership&quot; label)</Check>
          {incomplete && <p className="text-xs text-red-600 dark:text-red-400">Pick at least one.</p>}
          {value.brandContent && value.privacyLevel === 'SELF_ONLY' && <p className="text-xs text-red-600 dark:text-red-400">Branded content cannot be private.</p>}
        </div>
      )}
      <Check on={value.consent} onChange={(v) => set({ consent: v })}>
        I agree to TikTok&apos;s{' '}
        {value.brandContent ? <><a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a> and </> : null}
        <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>
      </Check>
    </div>
  );
}
