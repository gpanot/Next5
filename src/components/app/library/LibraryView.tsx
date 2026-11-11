'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { LibraryPhotosView } from './LibraryPhotosView';
import { LibrarySeriesView } from './LibrarySeriesView';
import { LibraryVideosView } from './LibraryVideosView';

type View = 'videos' | 'series' | 'photos';
const VIEWS: readonly { value: View; label: string }[] = [
  { value: 'videos', label: 'Videos' },
  { value: 'series', label: 'Series' },
  { value: 'photos', label: 'All photos' },
];

/** Brand library: listing videos first (realtors), then photo series, every photo one tap away. ?view= picks the tab. */
export const LibraryView = () => {
  const asked = useSearchParams().get('view');
  const [view, setView] = useState<View>(VIEWS.some((v) => v.value === asked) ? (asked as View) : 'videos');
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl<View> options={VIEWS} value={view} onChange={setView} className="self-start" />
      {view === 'videos' && <LibraryVideosView />}
      {view === 'series' && <LibrarySeriesView />}
      {view === 'photos' && <LibraryPhotosView />}
    </div>
  );
};
