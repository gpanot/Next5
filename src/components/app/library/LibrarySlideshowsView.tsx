'use client';

import { Images } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { PostMedia } from '../autopilot/PostMedia';
import { PlaybookPostSheet, type PlaybookPreview } from '../autopilot/PlaybookPostSheet';
import { useAppRouter } from '../shell/AppLink';

type Slideshow = { id: string; title: string; caption: string | null; date: string; slideUrls: string[] };

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';

/** Every slideshow Autopilot made, newest first. Tap one to read the slides and copy the caption. */
export const LibrarySlideshowsView = () => {
  const { data, loading, error, refresh } = useApi<{ slideshows: Slideshow[] }>('/api/app/library/slideshows');
  const router = useAppRouter();
  const [preview, setPreview] = useState<PlaybookPreview | null>(null);
  const shows = data?.slideshows ?? [];

  if (loading && !data) {
    return <div className={GRID}>{Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />)}</div>;
  }
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (shows.length === 0) {
    return (
      <EmptyState
        illustration={<Images className="h-10 w-10" />}
        title="No slideshows yet"
        body="Autopilot makes slideshows for your posts. Plan a week to get some."
        action={{ label: 'Open Autopilot', onClick: () => router.push('/app/automation') }}
      />
    );
  }
  return (
    <>
      <div className={GRID}>
        {shows.map((s) => (
          <article key={s.id} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setPreview({ title: s.title, format: 'slideshow', videoUrl: null, slideUrls: s.slideUrls, caption: s.caption })}
              className="block w-full transition-opacity duration-200 hover:opacity-90"
            >
              <PostMedia format="slideshow" status="ready" coverUrl={s.slideUrls[0] ?? null} videoUrl={null} slideCount={s.slideUrls.length} slideUrls={s.slideUrls} autoplay={false} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-app-ink">{s.title}</p>
              <p className="text-[12px] text-app-muted">{dayLabel(s.date)}</p>
            </div>
          </article>
        ))}
      </div>
      {preview && <PlaybookPostSheet post={preview} onClose={() => setPreview(null)} />}
    </>
  );
};
