'use client';

import { CalendarCheck, Home, Images, LayoutList, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { formatRelative } from '../../../lib/dates';
import type { LibrarySeriesDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { AppLink, useAppRouter } from '../shell/AppLink';
import { SeriesCard } from './SeriesCard';

type Filter = 'all' | 'property' | 'theme';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'property', label: 'Properties' },
  { value: 'theme', label: 'Themes' },
];

type DisplayMode = 'cards' | 'list';
const CATEGORY_ICON = { property: Home, theme: Sparkles, trial: Sparkles } as const;

type Page = { series: LibrarySeriesDto[]; nextCursor: string | null };
type State = { filter: Filter; series: LibrarySeriesDto[]; nextCursor: string | null; error: string | null };

/** Her photos grouped by series (one per generation), filterable by what they were made for. Tap a series to see it. */
export const LibrarySeriesView = () => {
  const router = useAppRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
  const [state, setState] = useState<State | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Only the latest filter's answer may land: a slow "All" must not overwrite "Properties".
  const latest = useRef(filter);
  useEffect(() => {
    latest.current = filter;
  }, [filter]);

  const load = useCallback(async (cursor: string | null) => {
    const q = new URLSearchParams({ filter, ...(cursor ? { cursor } : {}) });
    try {
      const page = await apiFetch<Page>(`/api/app/library/series?${q.toString()}`);
      if (latest.current !== filter) return;
      setState((prev) => ({ filter, series: cursor && prev?.filter === filter ? [...prev.series, ...page.series] : page.series, nextCursor: page.nextCursor, error: null }));
    } catch (err) {
      if (latest.current !== filter) return;
      setState((prev) => ({ filter, series: prev?.filter === filter ? prev.series : [], nextCursor: null, error: err instanceof ApiError ? err.message : 'Could not load your library.' }));
    }
  }, [filter]);

  useEffect(() => {
    void load(null);
  }, [load]);

  const current = state?.filter === filter ? state : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`h-9 rounded-xl px-3 text-[13px] font-medium transition-colors duration-200 ${filter === f.value ? 'bg-app-cta text-app-cta-ink' : 'border border-app-line text-app-muted hover:bg-app-sunken'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Cards / list toggle */}
        <div className="flex rounded-xl border border-app-line bg-app-sunken p-0.5" role="group" aria-label="View mode">
          {(['cards', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={displayMode === mode}
              onClick={() => setDisplayMode(mode)}
              title={mode === 'cards' ? 'Card view' : 'List view'}
              className={`flex h-7 w-8 items-center justify-center rounded-lg transition-colors duration-150 ${displayMode === mode ? 'bg-app-panel shadow-sm text-app-ink' : 'text-app-muted hover:text-app-ink'}`}
            >
              {mode === 'cards' ? (
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                  <rect x="1" y="1" width="6" height="6" rx="1.5" /><rect x="9" y="1" width="6" height="6" rx="1.5" /><rect x="1" y="9" width="6" height="6" rx="1.5" /><rect x="9" y="9" width="6" height="6" rx="1.5" />
                </svg>
              ) : (
                <LayoutList className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          ))}
        </div>
      </div>

      {!current ? (
        <SkeletonGrid count={6} cols={3} />
      ) : current.error && current.series.length === 0 ? (
        <ErrorState message={current.error} onRetry={() => void load(null)} />
      ) : current.series.length === 0 ? (
        <EmptyState
          illustration={<Images className="h-10 w-10" />}
          title={filter === 'property' ? 'No property photos yet' : 'No photos yet'}
          body={filter === 'property' ? 'Add a property from a Zillow link and make photos of you inside it.' : 'Create your first batch — it takes about 5 minutes.'}
          action={{ label: 'Create photos', onClick: () => router.push('/app/create') }}
        />
      ) : displayMode === 'cards' ? (
        <SeriesGrid series={current.series} />
      ) : (
        <SeriesList series={current.series} />
      )}

      {current?.nextCursor && (
        <div className="flex justify-center">
          <AppButton variant="secondary" loading={loadingMore} onClick={() => { setLoadingMore(true); void load(current.nextCursor).finally(() => setLoadingMore(false)); }}>
            Load more
          </AppButton>
        </div>
      )}
    </div>
  );
};

const SeriesGrid = ({ series }: { series: LibrarySeriesDto[] }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {series.map((s) => <SeriesCard key={s.id} series={s} />)}
  </div>
);

const SeriesList = ({ series }: { series: LibrarySeriesDto[] }) => (
  <ul className="flex flex-col divide-y divide-app-line rounded-2xl border border-app-line bg-app-panel overflow-hidden">
    {series.map((s) => {
      const Icon = CATEGORY_ICON[s.category];
      return (
        <li key={s.id}>
          <AppLink
            href={`/app/batches/${s.id}`}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-app-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent"
          >
            {/* Tiny cover */}
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-app-sunken">
              {s.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                <img src={s.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </div>
            {/* Text */}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-[13px] font-semibold text-app-ink">{s.name}</p>
              <span className="flex items-center gap-1 text-[12px] text-app-accent">
                <Icon aria-hidden className="h-3 w-3 shrink-0" />
                <span className="truncate">{s.categoryLabel}</span>
              </span>
            </div>
            {/* Meta */}
            <div className="flex shrink-0 flex-col items-end gap-1 text-[12px] text-app-muted">
              <span>{s.photoCount} photo{s.photoCount === 1 ? '' : 's'}</span>
              {s.onCalendar > 0 && (
                <span className="flex items-center gap-1">
                  <CalendarCheck aria-hidden className="h-3 w-3" /> {s.onCalendar}
                </span>
              )}
              <span className="text-[11px]">{formatRelative(s.createdAt)}</span>
            </div>
          </AppLink>
        </li>
      );
    })}
  </ul>
);
