'use client';

import { useState } from 'react';
import type { BlitzBankAudienceDto, BlitzBankDto, BlitzBankMatrixDto, BlitzBankStoryDto } from '../../../types/admin/workspaceDetail';
import { useAdminApi } from '../business/useAdminApi';
import { PanelError, PanelSkeleton } from './PanelStates';
import { CampaignBlock } from './CampaignBlock';
import { IdeaPlanTimeline } from './IdeaPlanTimeline';
import { LearningPanel } from './LearningPanel';
import { StageChip } from './StageChip';
import { ARCHETYPE_LABELS, StoryBlitzCards } from './StoryBlitzCards';

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  growing: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  building: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function StoryCard({ story, index }: { story: BlitzBankStoryDto; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <li className="rounded-xl border border-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition active:scale-[0.99]">
        <span className="min-w-0 space-y-0.5">
          <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
            Story {index + 1} <StageChip stage={story.stage} /> {story.format && <span className="font-normal">{story.format}</span>}
          </span>
          <span className="block truncate text-sm font-semibold text-ink dark:text-zinc-100">{story.lines[0]?.text}</span>
          {story.trigger && <span className="block truncate text-xs text-muted">About: {story.trigger}</span>}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${story.used > 0 ? 'bg-zinc-100 text-muted dark:bg-zinc-800' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
          {story.used > 0 ? `${story.used} cards` : 'unused'}
        </span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-line px-4 py-3 md:grid-cols-2 dark:border-zinc-800">
          <dl className="space-y-2">
            {story.lines.map((l) => (
              <div key={l.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{l.label}</dt>
                <dd className="text-sm text-ink dark:text-zinc-200">{l.text}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-2">
            {story.hooks.map((h) => (
              <li key={`${h.archetype}-${h.text}`} className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{ARCHETYPE_LABELS[h.archetype] ?? h.archetype}</span>
                <span className="block text-sm font-medium text-ink dark:text-zinc-100">{h.text}</span>
              </li>
            ))}
          </ul>
          <section className="space-y-2 md:col-span-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Blitzes made · {story.cards.length}</h4>
            <StoryBlitzCards cards={story.cards} />
          </section>
        </div>
      )}
    </li>
  );
}

function AudienceSection({ audience }: { audience: BlitzBankAudienceDto }) {
  const hooks = audience.stories.reduce((n, s) => n + s.hooks.length, 0);
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-ink dark:text-zinc-100">{audience.idc}</h3>
        <p className="text-xs text-muted">
          {audience.stories.length} stories × {hooks} hooks · tone {audience.tone}
          {audience.categories.length > 0 && <> · {audience.categories.join(', ')}</>}
        </p>
        {audience.proofNote && <p className="text-xs text-muted">{audience.proofNote}</p>}
      </div>
      <CampaignBlock audience={audience} />
      <ul className="space-y-2">
        {audience.stories.map((s, i) => <StoryCard key={s.id} story={s} index={i} />)}
      </ul>
    </section>
  );
}

function BankBlock({ bank }: { bank: BlitzBankDto }) {
  const stories = bank.audiences.reduce((n, a) => n + a.stories.length, 0);
  const cards = bank.audiences.reduce((n, a) => n + a.stories.reduce((m, s) => m + s.hooks.length, 0), 0);
  return (
    <article className="space-y-4 rounded-xl border border-line bg-app-sunken/40 p-4 dark:border-zinc-800">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 truncate text-sm font-bold text-ink dark:text-zinc-100">{bank.sourceUrl.replace(/^https?:\/\//, '') || 'Site profile'}</h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[bank.status] ?? 'bg-zinc-100 text-muted dark:bg-zinc-800'}`}>{bank.status}</span>
        <span className="text-xs text-muted">
          {bank.audiences.length} audiences · {stories} stories · {cards} scripted cards · updated {when(bank.updatedAt)}
        </span>
      </header>
      {bank.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{bank.error}</p>}
      {bank.audiences.map((a) => <AudienceSection key={a.idc} audience={a} />)}
    </article>
  );
}

/** Blitz Matrix tab: the workspace's calendar plan, then its Blitz Script Banks (the scripts its Blitz ideas are made from). */
export function BlitzMatrixPanel({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { data, error, refresh } = useAdminApi<BlitzBankMatrixDto>(token, `/api/admin/workspaces/${workspaceId}/blitz-matrix`);
  if (error) return <PanelError message={error} onRetry={refresh} />;
  if (!data) return <PanelSkeleton rows={4} />;
  if (data.banks.length === 0 && data.plan.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-800">
        No Blitz Matrix yet. It is written when the workspace&apos;s first run starts, or with its first batch of ideas.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <IdeaPlanTimeline plan={data.plan} />
      <LearningPanel learning={data.learning} />
      {data.banks.map((b) => <BankBlock key={b.id} bank={b} />)}
    </div>
  );
}
