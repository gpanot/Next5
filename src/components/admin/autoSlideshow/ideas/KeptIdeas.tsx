'use client';

import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { IDEAS_PER_BATCH, type IdeaDto } from '../../../../types/admin/calendarIdeas';
import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
import { formatLabel, whenOf } from './ideaCards';
import { ideaCover } from './ideaCover';

type Props = {
  kept: IdeaDto[];
  skipped: number;
  errors: Record<string, string>;
  generating: boolean;
  onReviewSkipped: () => void;
  onMore: () => void;
};

/** One kept idea: its cover, first line, format and day; the reason when Make failed for it. */
function KeptRow({ idea, error }: { idea: IdeaDto; error?: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {ideaCover(idea) && <CoverMedia src={ideaCover(idea)!.url} video={ideaCover(idea)!.video} />}
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="line-clamp-2 text-sm font-semibold text-ink dark:text-zinc-100">{idea.hook}</span>
        <span className="block text-xs text-muted">{formatLabel(idea)} · {whenOf(idea)}</span>
        {error && <span className="block text-xs text-red-600 dark:text-red-400">{error}</span>}
      </span>
    </li>
  );
}

/** End of the deck: what was kept, skipped ones to look at again, or a new batch. */
export function KeptIdeas({ kept, skipped, errors, generating, onReviewSkipped, onMore }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Check aria-hidden className="h-6 w-6" />
        </span>
        <h3 className="text-lg font-extrabold text-ink dark:text-zinc-100">{kept.length > 0 ? `${kept.length} kept ${kept.length === 1 ? 'idea is' : 'ideas are'} not made yet` : 'You saw every idea'}</h3>
        <p className="max-w-[28ch] text-sm text-muted">The ones you kept are on your calendar. Nothing posts until you approve.</p>
      </div>
      {kept.length > 0 && <ul className="space-y-2">{kept.map((i) => <KeptRow key={i.id} idea={i} error={errors[i.id]} />)}</ul>}
      <div className="flex flex-col gap-2">
        {skipped > 0 && (
          <button type="button" onClick={onReviewSkipped} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800">
            <RotateCcw aria-hidden className="h-4 w-4" /> Look at {skipped} skipped {skipped === 1 ? 'idea' : 'ideas'} again
          </button>
        )}
        <button type="button" onClick={onMore} disabled={generating} className="flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-blue-600 transition hover:bg-blue-50 active:scale-95 disabled:opacity-40 dark:text-blue-400 dark:hover:bg-blue-950">
          <Sparkles aria-hidden className="h-4 w-4" /> {generating ? 'Writing new ideas…' : `Get ${IDEAS_PER_BATCH} more ideas (free)`}
        </button>
      </div>
    </div>
  );
}
