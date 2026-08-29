'use client';

import { useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import { downloadAllAsZip, downloadFile } from '../../../lib/download';
import type { CreativeDirector } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { DownloadIcon } from '../../ui/Icons';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { ClosingNote } from './ClosingNote';
import { ShotTile } from './ShotTile';

type StudioRevealProps = {
  route: PhotoRoute;
  bookingId: string;
  /** Index 0 = shot 1 (the preview) … index 4 = shot 5. `null` = still generating. */
  shotUrls: readonly (string | null)[];
  director: CreativeDirector;
};

/** Same wide-lead mosaic used by `StudioGallery` — one visual language for
 *  "a set of studio photos" everywhere on the site. Purely about the
 *  photos — the collection upsell lives on the "create another shooting"
 *  screen now, not here (see `CollectionOffers`), so this never repeats it. */
const frameLayout = [
  'col-span-2 aspect-[16/10] sm:aspect-[2/1] lg:col-span-2 lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
];

const shotFilename = (route: PhotoRoute, index: number) => `next5-${route.id}-shot-${String(index + 1).padStart(2, '0')}.jpg`;

export const StudioReveal = ({ route, bookingId, shotUrls, director }: StudioRevealProps) => {
  const [zoomed, setZoomed] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);

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

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label-caps text-[9px] font-medium text-muted">Your studio</p>
        <p className="text-[11.5px] text-muted" aria-live="polite">
          {readyCount} of {route.shots.length} ready
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5 lg:auto-rows-[104px] lg:grid-cols-3">
        {route.shots.map((shot, index) => (
          <ShotTile
            key={shot.src}
            sceneLabel={route.scenes[index]}
            index={index}
            url={shotUrls[index]}
            layoutClassName={frameLayout[index]}
            onOpen={() => setZoomed(index)}
            onDownload={() => downloadFile(shotUrls[index] as string, shotFilename(route, index))}
          />
        ))}
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

      <div className="mt-6">
        <ClosingNote director={director} />
      </div>

      {zoomedUrl && (
        <ImageLightbox
          src={zoomedUrl}
          alt={route.scenes[zoomed as number]}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
};
