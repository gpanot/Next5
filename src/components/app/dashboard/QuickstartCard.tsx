'use client';

import { ChevronDown, PartyPopper, X } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import type { CalendarDto } from '../../../types/business/calendar';
import type { IntegrationsDto } from '../../../types/business/integrations';
import type { MeDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { AutofillCalendar } from './quickstart/AutofillCalendar';
import { ConnectSocial } from './quickstart/ConnectSocial';
import { ListingImport } from './quickstart/ListingImport';
import { QuickstartStep, type StepState } from './quickstart/QuickstartStep';
import { useQuickstartState } from './quickstart/useQuickstartState';

const TOTAL = 3;
const month = (): string => new Date().toLocaleDateString('en-US', { month: 'long' });
const postsLine = (planned: number): string => `Calendar on · ${planned} post${planned === 1 ? '' : 's'} ready for ${month()}`;

/** Done steps are done; the first open step is "next"; the calendar step waits for a face or a listing. */
const statesOf = (done: boolean[], calendarLocked: boolean): StepState[] => {
  const next = done.findIndex((d) => !d);
  return done.map((d, i) => (d ? 'done' : i === 1 && calendarLocked ? 'locked' : i === next ? 'next' : 'todo'));
};

const Progress = ({ completed }: { completed: number }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-app-sunken" role="progressbar" aria-label="Quickstart progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={TOTAL}>
      <div className="h-full rounded-full bg-app-accent transition-[width] duration-500" style={{ width: `${(completed / TOTAL) * 100}%` }} />
    </div>
    <span className="text-[12px] font-medium tabular-nums text-app-muted">{completed}/{TOTAL}</span>
  </div>
);

/** Brand home checklist: a listing, a filled calendar, a connected account. */
export const QuickstartCard = ({ me }: { me: MeDto }) => {
  const { saved, save } = useQuickstartState(me.workspace?.id ?? null);
  const calendar = useApi<CalendarDto>('/api/app/calendar');
  const integrations = useApi<IntegrationsDto>('/api/app/integrations?product=brand');
  const planned = calendar.data?.progress.planned ?? 0;

  const done = [
    saved.step2Done,
    saved.step3Done || planned > 0,
    (integrations.data?.connections.length ?? 0) > 0,
  ];
  const completed = done.filter(Boolean).length;
  const states = statesOf(done, !done[0] && !me.workspace?.hasIdentity);

  if (saved.dismissed || completed === TOTAL) {
    const allDone = completed === TOTAL;
    return (
      <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm ${allDone ? 'border-app-success/30 bg-app-success/10' : 'border-app-line bg-app-panel'}`}>
        <p className={`flex items-center gap-2 text-[14px] ${allDone ? 'font-medium text-app-success' : 'text-app-muted'}`}>
          {allDone && <PartyPopper aria-hidden className="h-4 w-4" />}
          {allDone ? postsLine(planned) : `Quickstart · ${completed}/${TOTAL} done`}
        </p>
        {allDone && !saved.dismissed ? (
          <button type="button" aria-label="Hide" onClick={() => save({ dismissed: true })} className="flex h-8 w-8 items-center justify-center rounded-lg text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink">
            <X aria-hidden className="h-4 w-4" />
          </button>
        ) : !allDone ? (
          <AppButton variant="ghost" size="sm" onClick={() => save({ dismissed: false })}>Show steps</AppButton>
        ) : null}
      </div>
    );
  }

  return (
    <section aria-label="Quickstart" className="overflow-hidden rounded-2xl border border-app-line bg-app-panel shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-app-ink">Get your 30-day calendar ready</h2>
          <p className="mt-0.5 text-[13px] text-app-muted">3 steps. About 5 minutes.</p>
          <div className="mt-2.5"><Progress completed={completed} /></div>
        </div>
        <button type="button" aria-label="Hide quickstart" onClick={() => save({ dismissed: true })} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink">
          <ChevronDown aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <ol className="divide-y divide-app-line border-t border-app-line">
        <QuickstartStep n={1} state={states[0]} title="Import a listing" sub="Paste a Zillow link. We make videos from the real home photos.">
          <ListingImport onDone={() => save({ step2Done: true })} />
        </QuickstartStep>
        <QuickstartStep n={2} state={states[1]} title="Fill your 30-day calendar" sub="We plan a post on each of your posting days.">
          <AutofillCalendar calendar={calendar.data} locked={states[1] === 'locked'} onFilled={() => save({ step3Done: true })} onChanged={calendar.refresh} />
        </QuickstartStep>
        <QuickstartStep n={3} state={states[2]} title="Connect Instagram or TikTok" sub="So your posts go out on time.">
          <ConnectSocial available={integrations.data?.available ?? null} />
        </QuickstartStep>
      </ol>
    </section>
  );
};
