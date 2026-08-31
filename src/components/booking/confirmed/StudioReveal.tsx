'use client';

import { useEffect, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import { downloadAllAsZip, downloadFile } from '../../../lib/download';
import type { CreativeDirector } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { DownloadIcon, RefreshCwIcon } from '../../ui/Icons';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { ClosingNote } from './ClosingNote';
import { ShotTile } from './ShotTile';

const REGEN_LIMIT = 2;
const REGEN_WINDOW_MS = 24 * 60 * 60 * 1000;

type StudioRevealProps = {
  route: PhotoRoute;
  bookingId: string;
  /** Index 0 = shot 1 (the preview) … index 4 = shot 5. `null` = still generating. */
  shotUrls: readonly (string | null)[];
  director: CreativeDirector;
  /** The AI-generated director note from the preview step — shown in ClosingNote. */
  directorNote?: string | null;
  /** How many times the player has already regenerated this shoot. */
  regenerateCount?: number;
  /** ISO timestamp of when the booking was created — used to enforce the 24h window. */
  bookingCreatedAt?: string;
  /** Called when the player requests a regeneration. */
  onRegenerate?: () => Promise<void>;
};

const shotFilename = (route: PhotoRoute, index: number) =>
  `next5-${route.id}-shot-${String(index + 1).padStart(2, '0')}.jpg`;

export const StudioReveal = ({
  route,
  bookingId,
  shotUrls,
  director,
  directorNote,
  regenerateCount = 0,
  bookingCreatedAt,
  onRegenerate,
}: StudioRevealProps) => {
  const [zoomed, setZoomed] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!bookingCreatedAt) return;
    const msUntilExpiry = new Date(bookingCreatedAt).getTime() + REGEN_WINDOW_MS - now;
    if (msUntilExpiry <= 0) return;
    const timeout = setTimeout(() => setNow(Date.now()), Math.min(msUntilExpiry + 1000, 60_000));
    return () => clearTimeout(timeout);
  }, [bookingCreatedAt, now]);

  const regenRemaining = Math.max(0, REGEN_LIMIT - regenerateCount);
  const withinWindow = bookingCreatedAt
    ? now - new Date(bookingCreatedAt).getTime() < REGEN_WINDOW_MS
    : false;
  const canRegenerate = regenRemaining > 0 && withinWindow && !!onRegenerate;

  const handleRegenerate = async () => {
    if (!onRegenerate || isRegenerating) return;
    setRegenError(null);
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const readyCount = shotUrls.filter((url) => url !== null).length;
  const allReady = readyCount === route.shots.length;
  const zoomedUrl = zoomed !== null ? shotUrls[zoomed] : null;

  const handleDownloadAll = async () => {
    setIsZipping(true);
    const files = route.shots.map((_, index) => ({
      url: shotUrls[index] as string,
      filename: shotFilename(route, index),
    }));
    await downloadAllAsZip(files, `next5-${route.id}-${bookingId}.zip`);
    setIsZipping(false);
  };

  // Navigate in lightbox — skip null urls (still generating)
  const goPrev = () => {
    if (zoomed === null) return;
    for (let i = zoomed - 1; i >= 0; i--) {
      if (shotUrls[i] !== null) { setZoomed(i); return; }
    }
  };
  const goNext = () => {
    if (zoomed === null) return;
    for (let i = zoomed + 1; i < shotUrls.length; i++) {
      if (shotUrls[i] !== null) { setZoomed(i); return; }
    }
  };
  const hasPrev = zoomed !== null && shotUrls.slice(0, zoomed).some((u) => u !== null);
  const hasNext = zoomed !== null && shotUrls.slice(zoomed + 1).some((u) => u !== null);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label-caps text-[9px] font-medium text-muted">Your studio</p>
        <p className="text-[11.5px] text-muted" aria-live="polite">
          {readyCount} of {route.shots.length} ready
        </p>
      </div>

      {/* ── Gallery ───────────────────────────────────────────────────── */}
      {/* Mobile: single-card horizontal scroll  |  Desktop: 2-up top row + 3-up scroll strip */}

      {/* Mobile (hidden on sm+): all 5 in one horizontal scroll row */}
      <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:hidden
                      [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {route.shots.map((shot, index) => (
          <div key={shot.src} className="w-[78vw] shrink-0">
            <ShotTile
              sceneLabel={route.scenes[index]}
              index={index}
              url={shotUrls[index]}
              layoutClassName="aspect-[3/4] w-full"
              onOpen={() => setZoomed(index)}
              onDownload={() => downloadFile(shotUrls[index] as string, shotFilename(route, index))}
            />
          </div>
        ))}
      </div>

      {/* Desktop (sm+): top row of 2, then horizontal scroll strip of 3 */}
      <div className="mt-3 hidden sm:block">
        {/* Top row — 2 equal columns */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {route.shots.slice(0, 2).map((shot, index) => (
            <ShotTile
              key={shot.src}
              sceneLabel={route.scenes[index]}
              index={index}
              url={shotUrls[index]}
              layoutClassName="aspect-[3/4] w-full"
              onOpen={() => setZoomed(index)}
              onDownload={() => downloadFile(shotUrls[index] as string, shotFilename(route, index))}
            />
          ))}
        </div>

        {/* Bottom strip — 3 cards, horizontally scrollable */}
        <div className="mt-2 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:gap-2.5 sm:pb-1.5
                        [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {route.shots.slice(2).map((shot, i) => {
            const index = i + 2;
            return (
              <div key={shot.src} className="w-[calc(33.333%-6px)] shrink-0 min-w-[160px]">
                <ShotTile
                  sceneLabel={route.scenes[index]}
                  index={index}
                  url={shotUrls[index]}
                  layoutClassName="aspect-[3/4] w-full"
                  onOpen={() => setZoomed(index)}
                  onDownload={() => downloadFile(shotUrls[index] as string, shotFilename(route, index))}
                />
              </div>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleDownloadAll}
        disabled={!allReady || isZipping}
        variant="dark"
        size="md"
        fullWidth
        className="mt-4"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        {isZipping ? 'Preparing your download…' : 'Download all 5 photos'}
      </Button>

      {/* Regenerate section */}
      {!!bookingCreatedAt && (
        <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-ink">Not happy with a result?</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                {regenRemaining <= 0
                  ? "You've used both regenerations for this shoot."
                  : withinWindow
                    ? `You can regenerate your full set — ${regenRemaining} of ${REGEN_LIMIT} regeneration${regenRemaining === 1 ? '' : 's'} remaining.`
                    : 'Your 24-hour regeneration window has closed.'}
              </p>
              {regenError && (
                <p className="mt-1.5 text-[11px] text-red-600">{regenError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleRegenerate}
              disabled={!canRegenerate || isRegenerating}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-4 py-1.5 text-[11.5px] font-medium text-ink shadow-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCwIcon className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>

          <p className="mt-3 text-[10.5px] text-muted/75">
            Up to {REGEN_LIMIT} regenerations per shoot · Available within 24 hours of your session
          </p>
        </div>
      )}

      <div className="mt-6">
        <ClosingNote director={director} note={directorNote ?? null} />
      </div>

      {zoomedUrl && (
        <ImageLightbox
          src={zoomedUrl}
          alt={route.scenes[zoomed as number]}
          onClose={() => setZoomed(null)}
          onPrev={hasPrev ? goPrev : undefined}
          onNext={hasNext ? goNext : undefined}
        />
      )}
    </div>
  );
};
