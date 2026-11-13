'use client';

import { Check, ImagePlus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { dayLabel } from '../../../lib/calendarDates';
import type { CalendarDto } from '../../../types/business/calendar';
import { AppButton } from '../../ui/AppButton';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Sheet } from '../../ui/Sheet';
import { AppLink as Link } from '../shell/AppLink';
import { VideoPickGrid } from './VideoPickGrid';

type Photo = { id: string; url: string | null; batchName: string };
type Page = { photos: Photo[]; nextCursor: string | null };
type Kind = 'videos' | 'photos';
const KINDS: readonly { value: Kind; label: string }[] = [
  { value: 'videos', label: 'Videos' },
  { value: 'photos', label: 'Photos' },
];

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Add 2 videos and 1 photo" — what the button will put on the day. */
const addLabel = (videos: number, photos: number): string => {
  const parts = [videos > 0 ? plural(videos, 'video') : null, photos > 0 ? plural(photos, 'photo') : null].filter(Boolean);
  return parts.length === 0 ? 'Pick videos or photos' : `Add ${parts.join(' and ')}`;
};

type Props = {
  /** The day she is adding to; null when closed. */
  date: string | null;
  onClose: () => void;
  onAdded: (calendar: CalendarDto, count: number) => void;
};

/** Pick any number of her videos and photos not already on the calendar, and put them all on one day. */
export const PhotoPickerSheet = ({ date, onClose, onAdded }: Props) => {
  const [page, setPage] = useState<{ date: string; photos: Photo[]; nextCursor: string | null; loading: boolean; error: string | null } | null>(null);
  const [kind, setKind] = useState<Kind>('videos');
  const [picked, setPicked] = useState<string[]>([]);
  const [pickedVideos, setPickedVideos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (forDate: string, cursor: string | null) => {
    // "Show more" shows its spinner at once; the first page starts from the skeleton instead.
    if (cursor) setPage((prev) => prev && { ...prev, loading: true, error: null });
    try {
      const res = await apiFetch<Page>(`/api/app/calendar/photos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
      setPage((prev) => ({ date: forDate, photos: [...(cursor && prev ? prev.photos : []), ...res.photos], nextCursor: res.nextCursor, loading: false, error: null }));
    } catch (err) {
      setPage((prev) => ({ date: forDate, photos: prev?.photos ?? [], nextCursor: null, loading: false, error: err instanceof ApiError ? err.message : 'Could not load your photos.' }));
    }
  };

  // The parent remounts this sheet per day, so picks start empty and the list is fresh:
  // photos she just added to another day are gone from it.
  useEffect(() => {
    if (date) void load(date, null);
  }, [date]);

  const retry = () => {
    if (!date) return;
    setPage(null); // back to the skeleton while it loads again
    void load(date, null);
  };

  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const toggleVideo = (id: string) => setPickedVideos((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const total = picked.length + pickedVideos.length;

  const save = async () => {
    if (!date || total === 0) return;
    setSaving(true);
    setError(null);
    try {
      const calendar = await apiFetch<CalendarDto>(`/api/app/calendar/days/${date}`, { method: 'POST', json: { itemIds: picked, videoIds: pickedVideos } });
      onAdded(calendar, total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add those posts.');
    } finally {
      setSaving(false);
    }
  };

  const current = page && page.date === date ? page : null;

  return (
    <Sheet
      open={date !== null}
      onClose={onClose}
      title={date ? `Add to ${dayLabel(date)}` : 'Add posts'}
      actions={
        <Link href="/app/create" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-app-cta px-3.5 text-[13px] font-medium text-app-cta-ink transition-opacity duration-200 hover:opacity-90">
          <Plus aria-hidden className="h-4 w-4" /> Create
        </Link>
      }
      side="bottom"
      className="sm:mx-auto sm:max-w-lg"
    >
      <div className="flex flex-col">
        <SegmentedControl<Kind> options={KINDS} value={kind} onChange={setKind} className="mb-4 self-start" />
        <div className="pb-4">
          {kind === 'videos' ? (
            <VideoPickGrid picked={pickedVideos} onToggle={toggleVideo} />
          ) : !current || (current.loading && current.photos.length === 0) ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-app-sunken" />)}
            </div>
          ) : current.error && current.photos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-[14px] text-app-danger">{current.error}</p>
              <AppButton size="sm" variant="secondary" onClick={retry}>Try again</AppButton>
            </div>
          ) : current.photos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ImagePlus aria-hidden className="h-9 w-9 text-app-muted" />
              <p className="text-[15px] font-medium text-app-ink">Every photo is already on your calendar</p>
              <p className="text-[13px] text-app-muted">Make new photos to plan more posts.</p>
              <Link href="/app/create" className="inline-flex h-10 items-center rounded-xl bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink hover:opacity-90">Create photos</Link>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-3 gap-2">
                {current.photos.map((photo) => {
                  const on = picked.includes(photo.id);
                  return (
                    <li key={photo.id}>
                      <button
                        type="button"
                        onClick={() => toggle(photo.id)}
                        aria-pressed={on}
                        aria-label={`${on ? 'Picked' : 'Pick'}: ${photo.batchName}`}
                        className={`relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-app-sunken ring-offset-2 ring-offset-app-panel transition-shadow duration-200 ${on ? 'ring-2 ring-app-accent' : ''}`}
                      >
                        {photo.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" loading="lazy" className={`h-full w-full object-cover transition-opacity duration-200 ${on ? 'opacity-80' : ''}`} />
                        )}
                        <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-200 ${on ? 'border-white bg-app-cta text-app-cta-ink' : 'border-white/90 bg-black/25'}`}>
                          {on && <Check aria-hidden className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {current.nextCursor && (
                <div className="mt-3 flex justify-center">
                  <AppButton size="sm" variant="secondary" loading={current.loading} onClick={() => date && void load(date, current.nextCursor)}>Show more</AppButton>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pinned to the bottom of the sheet's scroll area, so the button never scrolls away. */}
        <div className="sticky -bottom-6 -mx-6 -mb-6 flex flex-col gap-2 border-t border-app-line bg-app-panel px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-3">
          {error && <p className="text-[13px] text-app-danger">{error}</p>}
          <AppButton size="lg" fullWidth loading={saving} disabled={total === 0} onClick={() => void save()}>
            {addLabel(pickedVideos.length, picked.length)}
          </AppButton>
        </div>
      </div>
    </Sheet>
  );
};
