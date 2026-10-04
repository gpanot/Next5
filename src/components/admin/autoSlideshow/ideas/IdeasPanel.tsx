'use client';

import { Sparkles, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { RotatingLine } from '../../shared/RotatingLine';
import { money, PRICE_CENTS } from '../pricing/pricing';
import { HookPicker } from './HookPicker';
import { IdeaDeck } from './IdeaDeck';
import { KeptIdeas } from './KeptIdeas';
import type { IdeasState } from './useIdeas';
import { useIdeaMusic } from './useIdeaMusic';

export type Make = { making: boolean; errors: Record<string, string>; make: (kept: IdeaDto[]) => Promise<void> };
type Props = { ideas: IdeasState; maker: Make; onClose: () => void };

const WRITING_LINES = [
  'Reading what your customers care about…',
  'Writing first lines that stop the scroll…',
  'Picking photos and clips for each idea…',
  'Spreading them over the next 2 weeks…',
];

/** As in the canvas: ✕ (back to the start card), the title, "3 / 12", and a progress bar. */
function Header({ ideas, onClose }: { ideas: IdeasState; onClose: () => void }) {
  const total = ideas.deck.length + ideas.kept.length + ideas.skipped.length;
  const decided = ideas.kept.length + ideas.skipped.length;
  return (
    <div className="space-y-3">
      <header className="flex items-center gap-1.5">
        <button type="button" onClick={onClose} aria-label="Close ideas" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
          <X aria-hidden className="h-5 w-5" strokeWidth={2.4} />
        </button>
        <h2 className="min-w-0 flex-1 text-base font-extrabold text-ink dark:text-zinc-100">Your next 2 weeks</h2>
        {total > 0 && <span className="text-[13px] font-bold text-zinc-600 tabular-nums dark:text-zinc-400">{Math.min(decided + 1, total)} / {total}</span>}
      </header>
      {total > 0 && (
        <div className="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={decided} aria-label="Ideas looked at">
          <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${(decided / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function Writing() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Writing your ideas">
      <div className="mx-auto aspect-[9/16] h-[min(600px,calc(100dvh-16rem))] max-w-full animate-pulse rounded-[26px] bg-zinc-100 lg:h-[min(560px,calc(100dvh-28rem))] dark:bg-zinc-800" />
      <RotatingLine lines={WRITING_LINES} />
      <p className="text-center text-xs text-muted">This takes 1 to 3 minutes. You can keep using the calendar.</p>
    </div>
  );
}

function Empty({ onGenerate, error }: { onGenerate: () => void; error: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"><Sparkles aria-hidden className="h-6 w-6" /></span>
      <p className="max-w-[30ch] text-sm text-muted">Get 12 post ideas for the next 2 weeks. Keep the ones you like. Skip the rest.</p>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={onGenerate} className="min-h-12 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 dark:bg-blue-500">
        {error ? 'Try again' : 'Get my 12 ideas'}
      </button>
    </div>
  );
}

/** "Make N · $X": pinned under the panel once something is kept. */
export function MakeBar({ ideas, maker, plain = false }: { ideas: IdeasState; maker: Make; plain?: boolean }) {
  const n = ideas.kept.length;
  if (n === 0) return null;
  return (
    <div className={plain ? 'py-3' : 'sticky bottom-0 -mx-4 mt-2 rounded-b-[20px] border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95'}>
      <button type="button" onClick={() => void maker.make(ideas.kept)} disabled={maker.making} className="min-h-12 w-full rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400">
        {maker.making ? 'Putting them on your calendar…' : `Make ${n} · ${money(PRICE_CENTS * n)}`}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-muted">You pay only for the ones you keep. Nothing posts until you approve.</p>
    </div>
  );
}

/** What the panel shows: writing, empty, the deck, or the kept list once every idea was looked at. */
function Body({ ideas, maker, onEditHook, onShuffle }: { ideas: IdeasState; maker: Make; onEditHook: (idea: IdeaDto) => void; onShuffle: ((idea: IdeaDto) => void) | null }): ReactNode {
  if (ideas.loading) return <div className="mx-auto aspect-[9/16] h-[min(600px,calc(100dvh-16rem))] max-w-full animate-pulse rounded-[26px] bg-zinc-100 lg:h-[min(560px,calc(100dvh-28rem))] dark:bg-zinc-800" />;
  if (ideas.generating && ideas.deck.length === 0) return <Writing />;
  const total = ideas.deck.length + ideas.making.length + ideas.kept.length + ideas.skipped.length;
  if (total === 0) return <Empty onGenerate={() => void ideas.generate()} error={ideas.error} />;
  const current = ideas.current;
  if (!current) return <KeptIdeas kept={ideas.kept} skipped={ideas.skipped.length} errors={maker.errors} generating={ideas.generating} onReviewSkipped={ideas.reviewSkipped} onMore={() => void ideas.generate()} />;
  const next = ideas.deck.find((i) => i.id !== current.id) ?? null;
  return <IdeaDeck idea={current} next={next} canUndo={ideas.canUndo} onDecide={ideas.decide} onUndo={ideas.undo} onEditHook={onEditHook} onShuffle={onShuffle} />;
}

/**
 * The ideas panel beside the calendar (a full-screen sheet on phones): swipe through free ideas, then "Make N" puts the
 * kept ones on their days. Videos and photo slideshows mix as set in Settings › Content.
 */
export function IdeasPanel({ ideas, maker, onClose }: Props) {
  const [hookFor, setHookFor] = useState<IdeaDto | null>(null);
  const music = useIdeaMusic(ideas.client);
  const shuffle = (idea: IdeaDto) => {
    const track = music.randomOther(idea.card?.audio?.assetKey);
    if (track) ideas.setMusic(idea, track);
  };
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-white p-4 dark:bg-zinc-900">
      <Header ideas={ideas} onClose={onClose} />
      {ideas.making.length > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-muted dark:bg-zinc-950">
          <span aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
          Making {ideas.making.length === 1 ? 'a photo slideshow' : `${ideas.making.length} photo slideshows`} for you. {ideas.making.length === 1 ? 'It joins' : 'They join'} the ideas in 1 to 2 minutes.
        </p>
      )}
      {ideas.error && ideas.deck.length + ideas.kept.length > 0 && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{ideas.error}</p>}
      <div className="flex-1"><Body ideas={ideas} maker={maker} onEditHook={setHookFor} onShuffle={music.canShuffle ? shuffle : null} /></div>
      <MakeBar ideas={ideas} maker={maker} />
      {hookFor && <HookPicker idea={hookFor} onPick={(id) => ideas.pickHook(hookFor, id)} onClose={() => setHookFor(null)} />}
    </div>
  );
}
