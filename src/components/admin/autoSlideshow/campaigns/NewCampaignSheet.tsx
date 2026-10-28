'use client';

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { adminFetch } from '../../business/useAdminApi';
import { CastPicker } from '../brand/CastPicker';
import { announceCreditsChanged, CREDITS_HINT } from '../creditsEvents';
import { SettingsModal } from '../settings/SettingsModal';
import { useCheckoutReturn } from '../settings/credits/useCheckoutReturn';
import { clearBrandCastResume, markBrandCastResume, type BrandCastResume } from './brandCastResume';

/** Most Brand Cast slideshows one tap makes. */
const MAX_BRAND_CAST = 5;

const COUNTS = Array.from({ length: MAX_BRAND_CAST }, (_, i) => i + 1);

const button = 'min-h-12 flex-1 rounded-full px-5 text-sm font-semibold transition active:scale-95 disabled:opacity-40';

const countClass = (active: boolean) =>
  [
    'min-h-12 flex-1 rounded-xl border text-base font-bold tabular-nums transition active:scale-95',
    active ? 'border-app-cta bg-app-cta text-app-cta-ink' : 'border-app-line text-app-ink hover:bg-app-sunken',
  ].join(' ');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The server's 409: the run cannot take more yet (its site is still being read) or it failed. A run busy making
 *  slideshows queues the new ones instead. */
const STILL_WORKING = 'Run not found or still working';

type ChoiceProps = {
  title: string;
  /** What it is, in one short line. */
  text: string;
  /** What it does for the business. */
  goal: string;
  /** Who it talks to. */
  audience: string;
  /** How many to make, as advice. */
  tip: string;
  visual: ReactNode;
  disabled?: boolean;
  onPick: () => void;
};

/** One kind of campaign: a small picture of its slides, what it is, what it is for, and who it reaches. */
function Choice({ title, text, goal, audience, tip, visual, disabled, onPick }: ChoiceProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="flex w-full items-start gap-3 rounded-xl border border-app-line bg-app-panel p-4 text-left shadow-sm transition hover:border-app-cta active:scale-[0.98] disabled:opacity-50 disabled:hover:border-app-line"
    >
      <span className="flex h-20 w-12 shrink-0 items-center sm:h-24 sm:w-16 justify-center rounded-xl bg-app-sunken text-app-ink">{visual}</span>
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block text-base font-semibold text-app-ink">{title}</span>
        <span className="block text-sm text-app-muted">{text}</span>
        <span className="flex flex-nowrap gap-1 pt-0.5">
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-app-accent-soft px-1.5 py-0.5 sm:px-2 text-[11px] font-semibold text-app-accent">
            <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="max-sm:hidden"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>
            {goal}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-app-line px-1.5 py-0.5 sm:px-2 text-[11px] font-medium text-app-muted">
            <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="max-sm:hidden"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.8 2.7 2.6 3 5.2" /></svg>
            {audience}
          </span>
        </span>
        <span className="block pt-0.5 text-xs font-medium text-app-ink">{tip}</span>
      </span>
    </button>
  );
}

/** Brand Cast: one story slide told by a brand face, with lines of story under it and a heart for trust. */
const StoryVisual = () => (
  <svg aria-hidden viewBox="0 0 64 88" className="h-16 w-auto sm:h-20">
    <rect x="10" y="4" width="44" height="78" rx="7" className="fill-app-panel stroke-app-line" strokeWidth="2" />
    <circle cx="32" cy="28" r="9" className="fill-app-accent-soft stroke-app-accent" strokeWidth="2" />
    <path d="M18 50c2.5-7 7.5-10 14-10s11.5 3 14 10" fill="none" className="stroke-app-accent" strokeWidth="2" strokeLinecap="round" />
    <rect x="17" y="58" width="30" height="4" rx="2" className="fill-app-ink" />
    <rect x="17" y="66" width="22" height="3" rx="1.5" className="fill-app-muted" opacity="0.6" />
    <rect x="17" y="72" width="26" height="3" rx="1.5" className="fill-app-muted" opacity="0.6" />
    <path d="M50 14c-1.8-2.6-6-1.4-6 1.6 0 2.6 3.3 4.6 6 6.6 2.7-2 6-4 6-6.6 0-3-4.2-4.2-6-1.6z" className="fill-app-accent" />
  </svg>
);

/** Hooks Volume: a fan of slides, each with its own bold hook on top and the same lines under it. */
const HooksVisual = () => (
  <svg aria-hidden viewBox="0 0 64 88" className="h-16 w-auto sm:h-20">
    <g transform="rotate(-12 32 80)" opacity="0.55">
      <rect x="12" y="10" width="38" height="66" rx="6" className="fill-app-panel stroke-app-line" strokeWidth="2" />
      <rect x="17" y="18" width="28" height="5" rx="2" className="fill-app-ink" />
    </g>
    <g transform="rotate(12 32 80)" opacity="0.55">
      <rect x="14" y="10" width="38" height="66" rx="6" className="fill-app-panel stroke-app-line" strokeWidth="2" />
      <rect x="19" y="18" width="28" height="5" rx="2" className="fill-app-ink" />
    </g>
    <rect x="13" y="8" width="38" height="70" rx="6" className="fill-app-panel stroke-app-line" strokeWidth="2" />
    <rect x="18" y="15" width="28" height="6" rx="2" className="fill-app-accent" />
    <rect x="18" y="24" width="20" height="4" rx="2" className="fill-app-ink" />
    <rect x="18" y="58" width="24" height="3" rx="1.5" className="fill-app-muted" opacity="0.6" />
    <rect x="18" y="64" width="18" height="3" rx="1.5" className="fill-app-muted" opacity="0.6" />
    <path d="M38 42h8m0 0-3-3m3 3-3 3M26 42h-8m0 0 3-3m-3 3 3 3" fill="none" className="stroke-app-muted" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type CreditsAlertProps = { error: string | null; paid: ReturnType<typeof useCheckoutReturn>; onAddCredits: () => void };

/** The step's error, with an Add credits button when the balance is short, or Stripe's word once back from checkout. */
function CreditsAlert({ error, paid, onAddCredits }: CreditsAlertProps) {
  if (!error) {
    if (!paid) return null;
    return <p role="status" className={`rounded-xl p-3 text-sm ${paid.tone === 'ok' ? 'bg-app-success/10 text-app-success' : 'bg-app-sunken text-app-muted'}`}>{paid.text}</p>;
  }
  if (!error.endsWith(CREDITS_HINT)) return <p role="alert" className="text-sm text-app-danger">{error}</p>;
  return (
    <div role="alert" className="flex items-center gap-3 rounded-xl border border-app-line bg-app-sunken p-3">
      <p className="flex-1 text-sm text-app-danger">{error.slice(0, -CREDITS_HINT.length)}</p>
      <button type="button" onClick={onAddCredits} className="min-h-11 shrink-0 rounded-full bg-app-cta px-4 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
        Add credits
      </button>
    </div>
  );
}

type BrandCastProps = { token: string; workspaceId: string; runId: string; resume: BrandCastResume | null; backLabel: string; onBack: () => void; onCreated: () => void };

/** Step 2 of Brand Cast: how many slideshows (1-5), what it costs (1 credit each) and who tells them (a brand face, or
 *  "Choose for me"), then adds them to the latest run. Short on credits: Add credits opens Settings → Credits, and
 *  Stripe brings the browser back to this step with the same choices. */
function BrandCastStep({ token, workspaceId, runId, resume, backLabel, onBack, onCreated }: BrandCastProps) {
  const [count, setCount] = useState(resume?.count ?? 1);
  const [castId, setCastId] = useState<string | null>(resume?.castId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingCredits, setAddingCredits] = useState(false);
  const paid = useCheckoutReturn(token, announceCreditsChanged);

  const openCredits = () => {
    markBrandCastResume({ count, castId });
    setAddingCredits(true);
  };
  const closeCredits = () => {
    clearBrandCastResume();
    setAddingCredits(false);
    setError(null);
    announceCreditsChanged();
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/more`, { method: 'POST', body: JSON.stringify(castId ? { count, castId } : { count }) });
      announceCreditsChanged();
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create slideshows';
      setError(message === STILL_WORKING ? 'Your brand is still being set up. Try again in a minute.' : message);
      setBusy(false);
    }
  };

  return (
    <>
      <h3 id="new-campaign-title" className="text-lg font-extrabold text-app-ink">How many slideshows?</h3>
      <p className="text-sm text-app-muted">Each one gets its own hook, story and brand faces.</p>
      <div role="radiogroup" aria-label="Number of slideshows" className="flex gap-2">
        {COUNTS.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={count === n} disabled={busy} onClick={() => setCount(n)} className={countClass(count === n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="text-sm text-app-muted">
        This uses <span className="font-semibold text-app-ink">{plural(count, 'credit')}</span>. You only pay for slideshows that come out ready.
      </p>
      <CastPicker token={token} workspaceId={workspaceId} value={castId} onChange={setCastId} />
      <CreditsAlert error={error} paid={paid} onAddCredits={openCredits} />
      <div className="flex gap-2">
        <button type="button" onClick={onBack} disabled={busy} className={`${button} border border-app-line text-app-ink hover:bg-app-sunken`}>
          {backLabel}
        </button>
        <button type="button" autoFocus onClick={() => void create()} disabled={busy} className={`${button} bg-app-cta text-app-cta-ink shadow-sm`}>
          {busy ? 'Starting…' : `Create ${count}`}
        </button>
      </div>
      {/* Above the sheet (z-[100]); its clicks stay inside the sheet, so they do not close it. */}
      {addingCredits &&
        createPortal(
          <div className="relative z-[110]">
            <SettingsModal token={token} workspaceId={workspaceId} initialTab="credits" onClose={closeCredits} />
          </div>,
          document.body,
        )}
    </>
  );
}

type Props = {
  token: string;
  workspaceId: string;
  /** The workspace's latest auto run: Brand Cast slideshows join it. Null when it has none yet; undefined while loading. */
  brandRunId: string | null | undefined;
  /** Back from Stripe after Add credits: opens on the Brand Cast step with these choices. */
  resume?: BrandCastResume | null;
  /** Opens straight on the Brand Cast step (the Brand Cast tab's blank card). */
  brandFirst?: boolean;
  /** Only the Brand Cast step (the Calendar's "Create slideshows"): its Back closes the sheet. */
  brandOnly?: boolean;
  /** Hooks Volume is being created (an empty campaign on its way). */
  creatingHooks: boolean;
  onHooksVolume: () => void;
  onBrandCastCreated: () => void;
  onClose: () => void;
};

/**
 * "New campaign": pick Brand Cast (1-5 slideshows written by the Auto Slideshow engine with the brand's faces, 1 credit
 * each) or Hooks Volume (one campaign, many hooks, built in the campaign editor). A bottom sheet on phones.
 */
export function NewCampaignSheet({ token, workspaceId, brandRunId, resume = null, brandFirst = false, brandOnly = false, creatingHooks, onHooksVolume, onBrandCastCreated, onClose }: Props) {
  const [step, setStep] = useState<'choose' | 'brandCast'>(resume || brandFirst || brandOnly ? 'brandCast' : 'choose');
  // On <body>: a parent's stacking context must not cover the sheet.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={creatingHooks ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-campaign-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-app-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl"
      >
        {step === 'brandCast' && brandRunId ? (
          <BrandCastStep token={token} workspaceId={workspaceId} runId={brandRunId} resume={resume}
            backLabel={brandOnly ? 'Cancel' : 'Back'} onBack={brandOnly ? onClose : () => setStep('choose')} onCreated={onBrandCastCreated} />
        ) : (
          <>
            <div className="space-y-1">
              <h3 id="new-campaign-title" className="text-lg font-extrabold text-app-ink">New campaign</h3>
              <p className="text-sm text-app-muted">What do you want this campaign to do?</p>
            </div>
            <div className="space-y-3">
              <Choice
                title="Brand Cast"
                text={brandRunId === null ? 'Set up your brand first: this needs your website read.' : 'Story slideshows about your business and product, told by your brand faces.'}
                goal="Builds trust"
                audience="People ready to buy"
                tip="Recommended to create 1 to 3 stories"
                visual={<StoryVisual />}
                disabled={!brandRunId || creatingHooks}
                onPick={() => setStep('brandCast')}
              />
              <Choice
                title="Hooks Volume"
                text={creatingHooks ? 'Creating…' : 'Many hook slideshows that pull new people in. Find what works, then make more of it.'}
                goal="Reaches more people"
                audience="Your whole niche"
                tip="Recommended to create 4-6 posts"
                visual={<HooksVisual />}
                disabled={creatingHooks}
                onPick={onHooksVolume}
              />
            </div>
            <button type="button" onClick={onClose} disabled={creatingHooks} className={`${button} w-full border border-app-line text-app-ink hover:bg-app-sunken`}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
