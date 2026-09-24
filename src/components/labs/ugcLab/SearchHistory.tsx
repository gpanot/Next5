'use client';

/**
 * SearchHistory — the permanent, day-grouped list of past TikTok searches.
 *
 * Every successful search is kept in localStorage so a niche never has to be
 * re-run just to see its results again — each one costs ~20 s and a TikTok API
 * call. Shared by the UGC Lab HookPanel and the reusable Researcher, which
 * supply their own card rendering through `renderCard`.
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ago, groupByDay, type SearchEntry } from './researchCache';
import type { ResearchVideo } from './ResearchCard';

type SearchHistoryProps = {
  entries: SearchEntry[];
  /** Renders one result. `entry` carries the niche those results belong to. */
  renderCard: (video: ResearchVideo, entry: SearchEntry) => React.ReactNode;
  /** Hint shown above an expanded entry's grid. */
  hint?: string;
  /** Called when the user clears the whole history. */
  onClear?: () => void;
};

export function SearchHistory({ entries, renderCard, hint, onClear }: SearchHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <div className="mt-2 rounded-xl border border-line">
      <div className="flex items-center gap-1 pr-3">
        <button
          type="button"
          className="flex flex-1 items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setIsOpen((o) => !o)}
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Past searches ({entries.length})
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded px-2 py-1 text-[11px] text-muted transition-colors hover:bg-red-50 hover:text-red-600"
          >
            Clear all
          </button>
        )}
      </div>

      {isOpen && (
        <div className="border-t border-line px-4 pb-4 pt-3">
          <div className="flex flex-col gap-5">
            {groupByDay(entries).map(({ day, searches }) => (
              <div key={day} className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted/70">{day}</p>

                {searches.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;
                  return (
                    <div key={entry.id} className="overflow-hidden rounded-lg border border-line">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-alt"
                        onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      >
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-[13px] font-medium text-ink">&ldquo;{entry.industry}&rdquo;</span>
                          <span className="text-[12px] text-muted">
                            · {entry.videos.length} video{entry.videos.length !== 1 ? 's' : ''} · {ago(entry.at)}
                          </span>
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-line px-3 pb-3 pt-3">
                          {hint && <p className="mb-2 text-[11px] text-muted">{hint}</p>}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {entry.videos.map((v) => (
                              <div key={v.id || v.video_url}>{renderCard(v, entry)}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
