'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BRANDED_PRIVATE, DISCLOSE_MISSING, PRIVACY_LABELS, type CreatorInfoDto } from '../../../../types/admin/autoSlideshow';
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

/** What blocks posting to TikTok, or null: privacy picked, disclosure complete, consent given. */
export const choicesProblem = (c: TikTokChoices, disclose: boolean): string | null => {
  if (disclose && !c.brandOrganic && !c.brandContent) return DISCLOSE_MISSING;
  if (!c.privacyLevel) return 'Pick who can see it on TikTok.';
  if (c.brandContent && c.privacyLevel === 'SELF_ONLY') return BRANDED_PRIVATE;
  if (!c.consent) return 'Tick the box to agree to TikTok\'s terms.';
  return null;
};

/** The label TikTok puts on the post: "Paid partnership" wins when both are ticked. */
const labelOf = (c: TikTokChoices) => (c.brandContent ? 'Paid partnership' : c.brandOrganic ? 'Promotional content' : null);

function Check({ on, onChange, disabled, hint, children }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label title={disabled ? hint : undefined} className={`flex min-h-11 items-center gap-3 text-[13.5px] text-[var(--ink,#000)] dark:text-neutral-100 ${disabled ? 'opacity-50' : ''}`}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--ready,#1e8049)]" />
      <span>
        {children}
        {disabled && hint && <span className="block text-[11.5px] text-[var(--mute,#7c7d82)]">{hint}</span>}
      </span>
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

/** Comments, Duet and Stitch: none ticked by default, greyed out when the creator turned them off in TikTok. */
function Interactions({ creator, value, set, photo }: { creator: CreatorInfoDto; value: TikTokChoices; set: (patch: Partial<TikTokChoices>) => void; photo: boolean }) {
  const off = 'Turned off in your TikTok settings';
  return (
    <fieldset className="pt-1">
      <legend className="text-[12px] font-semibold text-[var(--mute,#7c7d82)]">Allow users to</legend>
      <div className="flex flex-wrap gap-x-5">
        <Check on={value.allowComments && !creator.commentDisabled} onChange={(v) => set({ allowComments: v })} disabled={creator.commentDisabled} hint={off}>Comment</Check>
        {!photo && <Check on={Boolean(value.allowDuet) && !creator.duetDisabled} onChange={(v) => set({ allowDuet: v })} disabled={creator.duetDisabled} hint={off}>Duet</Check>}
        {!photo && <Check on={Boolean(value.allowStitch) && !creator.stitchDisabled} onChange={(v) => set({ allowStitch: v })} disabled={creator.stitchDisabled} hint={off}>Stitch</Check>}
      </div>
    </fieldset>
  );
}

/** "Disclose video content": off by default; on, the person says who it promotes and sees the label TikTok adds. */
function Disclosure({ value, set, disclose, onDisclose, noun }: { value: TikTokChoices; set: (patch: Partial<TikTokChoices>) => void; disclose: boolean; onDisclose: (on: boolean) => void; noun: string }) {
  const label = labelOf(value);
  const isPrivate = value.privacyLevel === 'SELF_ONLY';
  return (
    <div>
      <Check on={disclose} onChange={onDisclose}>
        Disclose {noun === 'video' ? 'video' : 'post'} content
        <span className="block text-[11.5px] text-[var(--mute,#7c7d82)]">Turn on to show this {noun === 'video' ? 'video' : 'post'} promotes goods or services in exchange for something of value.</span>
      </Check>
      {disclose && (
        <div className="pl-8">
          <Check on={value.brandOrganic} onChange={(v) => set({ brandOrganic: v })}>
            Your brand
            <span className="block text-[11.5px] text-[var(--mute,#7c7d82)]">You are promoting yourself or your own business.</span>
          </Check>
          <Check on={value.brandContent} onChange={(v) => set({ brandContent: v })} disabled={isPrivate && !value.brandContent} hint={BRANDED_PRIVATE}>
            Branded content
            <span className="block text-[11.5px] text-[var(--mute,#7c7d82)]">You are promoting another brand or a third party.</span>
          </Check>
          {label
            ? <p className="rounded-lg bg-neutral-100 px-3 py-2 text-[12.5px] text-[var(--ink,#000)] dark:bg-neutral-900 dark:text-neutral-100">Your {noun} will be labeled as &ldquo;{label}&rdquo;</p>
            : <p className="text-xs text-red-600 dark:text-red-400">{DISCLOSE_MISSING}</p>}
        </div>
      )}
    </div>
  );
}

type Props = {
  creator: CreatorInfoDto;
  value: TikTokChoices;
  onChange: (next: TikTokChoices) => void;
  disclose: boolean;
  onDisclose: (on: boolean) => void;
  /** A photo carousel: no Duet or Stitch (TikTok offers them for videos only). */
  photo?: boolean;
};

/**
 * TikTok's Direct Post choices for this video: the account is shown, privacy is picked by hand (no default), Comment,
 * Duet and Stitch start off, disclosure is set, and the Music Usage Confirmation is accepted.
 */
export function TikTokFields({ creator, value, onChange, disclose, onDisclose, photo = false }: Props) {
  const set = (patch: Partial<TikTokChoices>) => onChange({ ...value, ...patch });
  // Turning disclosure off clears its boxes, so no label, policy or privacy limit lingers.
  const toggleDisclose = (on: boolean) => {
    if (!on) set({ brandOrganic: false, brandContent: false });
    onDisclose(on);
  };
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
        {creator.privacyOptions.map((p) => {
          const blocked = p === 'SELF_ONLY' && value.brandContent;
          return <option key={p} value={p} disabled={blocked} title={blocked ? BRANDED_PRIVATE : undefined}>{PRIVACY_LABELS[p] ?? p}{blocked ? ' (not for branded content)' : ''}</option>;
        })}
      </select>
      <Interactions creator={creator} value={value} set={set} photo={photo} />
      <Disclosure value={value} set={set} disclose={disclose} onDisclose={toggleDisclose} noun={photo ? 'photos' : 'video'} />
      <p className="pt-1 text-[12.5px] text-[var(--mute,#7c7d82)]">Your {photo ? 'post' : 'video'} may take a few minutes to process and show on your TikTok profile after you post it.</p>
      <Check on={value.consent} onChange={(v) => set({ consent: v })}>
        By posting, I agree to TikTok&apos;s{' '}
        {value.brandContent ? <><a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a> and </> : null}
        <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>
      </Check>
    </div>
  );
}
