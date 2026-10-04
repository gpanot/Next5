'use client';

import { useState } from 'react';
import type { AutoPhotoDto, AutoRunDto, AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { useAdminApi } from '../business/useAdminApi';
import { SlideshowEditor } from './SlideshowEditor';

type Props = { token: string; run: AutoRunDto; openId: string | null; onOpen: (id: string | null) => void; onChanged: () => void };

/** The editor over one run's ready slideshows, with prev/next between them. Renders nothing while none is open. */
export function RunSlideshowEditor({ token, run, openId, onOpen, onChanged }: Props) {
  const ready = run.slideshows.filter((s) => s.status === 'ready');
  const at = ready.findIndex((s) => s.id === openId);
  const open = at >= 0 ? ready[at] : null;
  // The photo and music pickers load once, on the first slideshow opened, and stay for the next ones.
  const [used, setUsed] = useState(false);
  if (open && !used) setUsed(true);
  const photos = useAdminApi<{ photos: AutoPhotoDto[] }>(token, used ? `/api/admin/auto-slideshow/runs/${run.id}/photos` : null);
  const music = useAdminApi<{ tracks: AutoTrackDto[] }>(token, used ? '/api/admin/auto-slideshow/music' : null);
  if (!open) return null;
  return (
    <SlideshowEditor
      key={open.id}
      token={token}
      runId={run.id}
      initial={open}
      photos={photos.data?.photos ?? null}
      tracks={music.data?.tracks ?? null}
      onPhotosChanged={photos.refresh}
      onChanged={onChanged}
      onClose={() => onOpen(null)}
      onPrev={at > 0 ? () => onOpen(ready[at - 1]!.id) : undefined}
      onNext={at < ready.length - 1 ? () => onOpen(ready[at + 1]!.id) : undefined}
    />
  );
}
