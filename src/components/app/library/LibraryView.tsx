'use client';

import { useState } from 'react';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { LibraryPhotosView } from './LibraryPhotosView';
import { LibrarySeriesView } from './LibrarySeriesView';

type View = 'series' | 'photos';

/** Brand library: series first (one per generation, labelled by what it was made for), every photo one tap away. */
export const LibraryView = () => {
  const [view, setView] = useState<View>('series');
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl<View> options={[{ value: 'series', label: 'Series' }, { value: 'photos', label: 'All photos' }]} value={view} onChange={setView} className="self-start" />
      {view === 'series' ? <LibrarySeriesView /> : <LibraryPhotosView />}
    </div>
  );
};
