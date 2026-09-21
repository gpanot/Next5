'use client';

import { Images } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { LibrarySeriesDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { useAppRouter } from '../shell/AppLink';
import { SeriesCard } from './SeriesCard';

type Filter = 'all' | 'property' | 'theme';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'property', label: 'Properties' },
  { value: 'theme', label: 'Themes' },
];

type Page = { series: LibrarySeriesDto[]; nextCursor: string | null };
type State = { filter: Filter; series: LibrarySeriesDto[]; nextCursor: string | null; error: string | null };

/** Her photos grouped by series (one per generation), filterable by what they were made for. Tap a series to see it. */
export const LibrarySeriesView = () => {
  const router = useAppRouter();
  const [filter, setFilter] = useState<Filter>('all');
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
      ) : (
        <SeriesGrid series={current.series} />
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
