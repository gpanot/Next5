'use client';

import { useMemo, useState } from 'react';
import { PRIVACY_LABELS, type AutoSlideshowDto, type CreatorInfoDto } from '../../../types/admin/autoSlideshow';
import { formatWhen, spreadTimes, tomorrow } from './schedule';
import type { ScheduleRequest } from './usePosting';

type Props = { creator: CreatorInfoDto; slideshows: AutoSlideshowDto[]; busy: boolean; onSchedule: (req: ScheduleRequest) => Promise<boolean> };

const DEFAULT_TIMES = ['09:00', '13:00', '19:00'];
const field = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';
const label = 'block space-y-1 text-[11px] font-semibold tracking-wide text-muted uppercase';

function Toggle({ on, onChange, disabled, children }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex min-h-11 items-center gap-3 text-sm text-ink dark:text-zinc-100 ${disabled ? 'opacity-50' : ''}`}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-blue-600" />
      <span>{children}</span>
    </label>
  );
}

/**
 * Approval form, following TikTok's Direct Post UX rules: the approver sees the account, picks privacy (no default),
 * sets comments, discloses commercial content, and accepts the Music Usage Confirmation before anything is scheduled.
 */
export function SchedulePlanner({ creator, slideshows, busy, onSchedule }: Props) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(slideshows.map((s) => s.id)));
  const [startDate, setStartDate] = useState(tomorrow);
  const [perDay, setPerDay] = useState(2);
  const [times, setTimes] = useState(DEFAULT_TIMES);
  const [privacy, setPrivacy] = useState('');
  const [comments, setComments] = useState(!creator.commentDisabled);
  const [disclose, setDisclose] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [brandContent, setBrandContent] = useState(false);
  const [consent, setConsent] = useState(false);

  const chosen = slideshows.filter((s) => picked.has(s.id));
  const when = useMemo(() => spreadTimes(chosen.length, startDate, times, perDay), [chosen.length, startDate, times, perDay]);
  const discloseIncomplete = disclose && !brandOrganic && !brandContent;
  const brandedPrivate = brandContent && privacy === 'SELF_ONLY';
  const ready = chosen.length > 0 && when.length === chosen.length && privacy && consent && !discloseIncomplete && !brandedPrivate;

  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const submit = async () => {
    const ok = await onSchedule({
      items: chosen.map((s, i) => ({ slideshowId: s.id, scheduledAt: when[i]!.toISOString() })),
      privacyLevel: privacy,
      allowComments: comments,
      brandOrganic: disclose && brandOrganic,
      brandContent: disclose && brandContent,
      consent,
    });
    if (ok) setConsent(false);
  };

  return (
    <div className="space-y-5">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {slideshows.map((s) => (
          <li key={s.id} className="shrink-0">
            <button onClick={() => toggle(s.id)} aria-pressed={picked.has(s.id)} className={`relative block h-28 w-22 overflow-hidden rounded-lg border-2 transition active:scale-95 ${picked.has(s.id) ? 'border-blue-600' : 'border-transparent opacity-50'}`}>
              {s.slides[0]?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.slides[0].imageUrl} alt={s.topic} className="h-full w-full object-cover" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className={label}><span>Start</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} /></label>
        <label className={label}>
          <span>Posts a day</span>
          <select value={perDay} onChange={(e) => setPerDay(Number(e.target.value))} className={field}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        {times.slice(0, perDay).map((t, i) => (
          <label key={i} className={label}><span>Time {i + 1}</span><input type="time" value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} className={field} /></label>
        ))}
      </div>
      {chosen.length > 0 && <p className="text-xs text-muted">{chosen.length} posts · first {when[0] ? formatWhen(when[0]) : '—'} · last {when[when.length - 1] ? formatWhen(when[when.length - 1]!) : '—'}</p>}

      <div className="space-y-2 rounded-xl border border-line p-4 dark:border-zinc-800">
        <label className={label}>
          <span>Who can see these posts</span>
          <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={field}>
            <option value="" disabled>Choose…</option>
            {creator.privacyOptions.map((p) => <option key={p} value={p}>{PRIVACY_LABELS[p] ?? p}</option>)}
          </select>
        </label>
        {creator.privacyOptions.length === 1 && creator.privacyOptions[0] === 'SELF_ONLY' && (
          <p className="text-xs text-amber-700 dark:text-amber-400">Only &quot;Only me&quot; is offered: the TikTok app is not audited yet, so posts stay private.</p>
        )}
        <Toggle on={comments} onChange={setComments} disabled={creator.commentDisabled}>Allow comments{creator.commentDisabled ? ' (turned off on this account)' : ''}</Toggle>
        <Toggle on={disclose} onChange={setDisclose}>This content promotes a brand, product or service</Toggle>
        {disclose && (
          <div className="space-y-1 pl-8">
            <Toggle on={brandOrganic} onChange={setBrandOrganic}>Your brand — shows a &quot;Promotional content&quot; label</Toggle>
            <Toggle on={brandContent} onChange={setBrandContent}>Branded content (a third party) — shows a &quot;Paid partnership&quot; label</Toggle>
            {discloseIncomplete && <p className="text-xs text-red-600">Pick at least one.</p>}
            {brandedPrivate && <p className="text-xs text-red-600">Branded content cannot be private.</p>}
          </div>
        )}
      </div>

      <Toggle on={consent} onChange={setConsent}>
        By posting, you agree to TikTok&apos;s{' '}
        {brandContent ? <><a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a> and </> : null}
        <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>.
      </Toggle>

      <button onClick={() => void submit()} disabled={!ready || busy} className="min-h-12 w-full rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500">
        {busy ? 'Scheduling…' : `Approve & schedule ${chosen.length} ${chosen.length === 1 ? 'post' : 'posts'} as @${creator.username}`}
      </button>
      <p className="text-center text-[11px] text-muted">TikTok can take a few minutes to publish each post after it is sent.</p>
    </div>
  );
}
