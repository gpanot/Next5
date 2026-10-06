'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SHORT_STEP_LABELS, videoModelLabel, type ShortDetailDto, type ShortStep } from '../../../types/admin/shorts';
import { BeatsPanel } from './BeatsPanel';
import { ScriptPanel } from './ScriptPanel';
import { Section } from './Section';
import { StatusPill } from './StatusPill';
import { StepsPanel } from './StepsPanel';
import { isRunning, rerunShort, seconds, usd, useShortDetail } from './useShorts';

function Player({ short }: { short: ShortDetailDto }) {
  return (
    <div className="mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-sm">
      {short.videoUrl ? (
        <video key={short.videoUrl} src={short.videoUrl} poster={short.posterUrl ?? undefined} controls playsInline className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-zinc-300">
          {isRunning(short.status) && <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" aria-hidden />}
          {short.status === 'FAILED' ? 'No video: the short failed.' : 'The video appears here when it is ready.'}
        </div>
      )}
    </div>
  );
}

function Summary({ short, token, onRerun }: { short: ShortDetailDto; token: string; onRerun: () => void }) {
  const [step, setStep] = useState<ShortStep>(short.failedStep ?? 4);
  const [busy, setBusy] = useState(false);
  const rerun = async () => {
    setBusy(true);
    await rerunShort(token, short.id, step).catch(() => undefined);
    setBusy(false);
    onRerun();
  };
  const stats = [
    ['Model', videoModelLabel(short.videoModel)],
    ['Workspace', short.workspaceName],
    ['Video length', short.durationS ? `${short.durationS.toFixed(1)} s` : '—'],
    ['Total cost', usd(short.totalUsdMicros)],
    ['Generation time', seconds(short.totalMs)],
    ['Voice', short.audio ? `${short.audio.voice} · ${short.audio.sentences} sentences` : '—'],
  ];
  return (
    <Section title="Summary">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-app-muted">{k}</dt>
            <dd className="text-sm font-semibold text-app-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {short.audio?.url && <audio src={short.audio.url} controls className="w-full" />}
      {!isRunning(short.status) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-app-line pt-3">
          <select value={step} onChange={(e) => setStep(Number(e.target.value) as ShortStep)} className="min-h-11 rounded-lg border border-app-line bg-app-panel px-2 text-sm text-app-ink">
            {([1, 2, 3, 4, 5] as ShortStep[]).map((s) => <option key={s} value={s}>From {s}. {SHORT_STEP_LABELS[s]}</option>)}
          </select>
          <button type="button" onClick={rerun} disabled={busy} className="min-h-11 rounded-lg border border-app-line px-4 text-sm font-bold text-app-ink transition hover:bg-app-sunken disabled:opacity-40">
            {busy ? 'Starting…' : 'Run again'}
          </button>
        </div>
      )}
    </Section>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="aspect-[9/16] animate-pulse rounded-2xl bg-app-sunken" />
      <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-app-sunken" />)}</div>
    </div>
  );
}

/** One short in full: the video, then everything needed to understand how it was made and what went wrong. */
export function ShortDetail({ token, id }: { token: string; id: string }) {
  const { short, error, refresh } = useShortDetail(token, id);
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="space-y-1">
        <Link href="/admin/shorts" className="text-xs font-semibold text-app-muted hover:text-app-ink">← All shorts</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-app-ink md:text-2xl">{short?.hook ?? 'Short'}</h1>
          {short && <StatusPill status={short.status} failedStep={short.failedStep} />}
        </div>
      </div>
      {error && !short && <p className="rounded-xl bg-app-accent-soft p-4 text-sm text-app-danger">{error}</p>}
      {!short && !error && <DetailSkeleton />}
      {short && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Player short={short} />
            <Summary short={short} token={token} onRerun={refresh} />
          </div>
          <div className="min-w-0 space-y-4">
            <StepsPanel short={short} />
            <ScriptPanel short={short} />
            <BeatsPanel short={short} />
          </div>
        </div>
      )}
    </div>
  );
}
