'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { LibraryPhotosView } from './LibraryPhotosView';
import { LibrarySlideshowsView } from './LibrarySlideshowsView';
import { LibraryVideosView } from './LibraryVideosView';

type View = 'videos' | 'slideshows' | 'photos';
const VIEWS: readonly { value: View; label: string }[] = [
  { value: 'videos', label: 'Videos' },
  { value: 'slideshows', label: 'Slideshows' },
  { value: 'photos', label: 'Photos' },
];

/** Brand library: listing videos, Autopilot slideshows, then every photo. ?view= picks the tab. */
export const LibraryView = () => {
  const asked = useSearchParams().get('view');
  const [view, setView] = useState<View>(VIEWS.some((v) => v.value === asked) ? (asked as View) : 'videos');
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl<View> options={VIEWS} value={view} onChange={setView} className="self-start" />
      {view === 'videos' && <LibraryVideosView />}
      {view === 'slideshows' && <LibrarySlideshowsView />}
      {view === 'photos' && <LibraryPhotosView />}
    </div>
  );
};
