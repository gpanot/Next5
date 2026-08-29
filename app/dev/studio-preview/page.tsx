'use client';

import { useState } from 'react';
import { photoRoutes } from '../../../src/data/routes';
import { getCreativeDirectors } from '../../../src/data/photographers';
import { ClosingNote } from '../../../src/components/booking/confirmed/ClosingNote';
import { StudioReveal } from '../../../src/components/booking/confirmed/StudioReveal';
import { Button } from '../../../src/components/ui/Button';

/**
 * Dev-only visual check for the studio reveal screen. Stands in for real
 * generation with each route's existing placeholder shots — same component,
 * same layout, zero WaveSpeed calls — so the design can be reviewed without
 * running (and paying for) a real shoot.
 */
export default function StudioPreviewPage() {
  const [routeIndex, setRouteIndex] = useState(0);
  const [readyCount, setReadyCount] = useState(5);

  if (process.env.NODE_ENV === 'production') {
    return <p className="p-10 text-center text-muted">Not available.</p>;
  }

  const route = photoRoutes[routeIndex];
  const [director] = getCreativeDirectors(route.directorIds, route.id);
  const shotUrls = route.shots.map((shot, index) => (index < readyCount ? shot.src : null));

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-[720px] px-5 py-10 sm:px-8">
        <p className="label-caps text-[10px] font-medium text-accent-strong">Dev preview</p>
        <h1 className="mt-1 font-serif text-[24px] text-ink">Studio reveal — no generation required</h1>
        <p className="mt-2 text-[13px] text-muted">
          Uses each studio&apos;s existing placeholder shots as stand-ins. Not linked from the
          site; only reachable if you know the URL, and disabled in production.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {photoRoutes.map((r, index) => (
            <Button
              key={r.id}
              variant={index === routeIndex ? 'dark' : 'outline'}
              size="sm"
              onClick={() => setRouteIndex(index)}
              className={index === routeIndex ? '' : 'border-line text-ink hover:bg-surface-alt'}
            >
              {r.title}
            </Button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setReadyCount((c) => Math.min(5, c + 1))}
            disabled={readyCount >= 5}
          >
            Reveal next shot
          </Button>
          <Button size="sm" onClick={() => setReadyCount(5)} disabled={readyCount >= 5}>
            Reveal all
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-line text-ink hover:bg-surface-alt"
            onClick={() => setReadyCount(1)}
          >
            Reset to shot 1
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-surface px-5 py-5 sm:px-6 sm:py-6">
          <StudioReveal route={route} bookingId="TEST-0001" shotUrls={shotUrls} />
          {readyCount === 5 && <ClosingNote director={director} />}
        </div>
      </div>
    </div>
  );
}
