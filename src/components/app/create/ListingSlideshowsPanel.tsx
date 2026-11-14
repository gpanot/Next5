'use client';

import { Images, Layers, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { DEFAULT_SLIDE_THEME, SLIDE_THEME_INFO, type SlideTheme } from '../../../lib/slideThemes';
import { HOME_SLIDESHOW_INFO, HOME_SLIDESHOW_KINDS, type HomeSlideshowKind, type ListingSlideshowDto, type ListingSlideshowsResponse } from '../../../types/business/listingSlideshows';
import { AppButton } from '../../ui/AppButton';
import { PlaybookPostSheet, type PlaybookPreview } from '../autopilot/PlaybookPostSheet';
import { SlideLoopControls, SlideStack, useSlideLoop } from '../slideThemes/SlideLoop';
import { SlideThemePicker } from '../slideThemes/SlideThemePicker';

const POLL_MS = 4_000;

type CardProps = { kind: HomeSlideshowKind; show: ListingSlideshowDto | undefined; starting: boolean; onMake: () => void; onOpen: () => void; playing: boolean; onPlay: (play: boolean) => void };

type PlayProps = { playing: boolean; onPlay: (play: boolean) => void };

/** A made slideshow: its slides crossfading (play/stop, dots), tap to open it full size. */
const ReadyCover = ({ show, onOpen, playing, onPlay }: { show: ListingSlideshowDto; onOpen: () => void } & PlayProps) => {
  const count = show.slideUrls.length;
  const [index, setIndex] = useSlideLoop(count, playing);
  const name = HOME_SLIDESHOW_INFO[show.kind].name;
  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-app-sunken">
      <button type="button" onClick={onOpen} aria-label={`Open the ${name} slideshow`} className="absolute inset-0 transition-transform duration-200 hover:scale-[1.01]">
        <SlideStack urls={show.slideUrls} index={index} alt={name} />
      </button>
      <span className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
        <Layers aria-hidden className="h-3 w-3" /> {index + 1}/{count}
      </span>
      {count > 1 && <SlideLoopControls count={count} index={index} playing={playing} label={name} onIndex={setIndex} onPlay={onPlay} />}
    </div>
  );
};

/** The cover of a slideshow: its slides when made, a pulse while making, an empty 9:16 frame before. */
const Cover = ({ show, onOpen, playing, onPlay }: { show: ListingSlideshowDto | undefined; onOpen: () => void } & PlayProps) => {
  if (show?.status === 'making') return <div className="flex aspect-[9/16] animate-pulse items-end rounded-xl bg-app-sunken p-2 text-[11px] text-app-muted">Making…</div>;
  if (show?.status === 'ready' && show.slideUrls[0]) return <ReadyCover show={show} onOpen={onOpen} playing={playing} onPlay={onPlay} />;
  return (
    <div className="flex aspect-[9/16] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-app-line bg-app-sunken p-2 text-center text-[11px] text-app-muted">
      {show?.status === 'failed' ? (show.error ?? 'Something went wrong.') : <><Images aria-hidden className="h-5 w-5" /> 9:16 slides</>}
    </div>
  );
};

const SlideshowCard = ({ kind, show, starting, onMake, onOpen, playing, onPlay }: CardProps) => {
  const info = HOME_SLIDESHOW_INFO[kind];
  const failed = show?.status === 'failed';
  return (
    <div className="flex flex-col gap-2">
      <Cover show={show} onOpen={onOpen} playing={playing} onPlay={onPlay} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-app-ink">
          {info.name}
          {show?.status === 'ready' && <span className="ml-1.5 font-normal text-app-muted">· {SLIDE_THEME_INFO[show.theme].name}</span>}
        </p>
        <p className="text-[12px] leading-snug text-app-muted">{info.line}</p>
      </div>
      {show?.status !== 'making' && (
        <AppButton variant={show && !failed ? 'secondary' : 'primary'} loading={starting} onClick={onMake} iconLeft={show ? <RotateCcw className="h-4 w-4" /> : <Images className="h-4 w-4" />}>
          {!show ? 'Make slideshow' : failed ? 'Try again' : 'New version'}
        </AppButton>
      )}
    </div>
  );
};

const previewOf = (show: ListingSlideshowDto): PlaybookPreview => ({ title: HOME_SLIDESHOW_INFO[show.kind].name, format: 'slideshow', videoUrl: null, slideUrls: show.slideUrls, caption: show.caption });

/** Brand create, property mode: photo slideshows of the home in a picked theme, one card per kind. */
export const ListingSlideshowsPanel = ({ listingId }: { listingId: string }) => {
  const url = `/api/app/listings/${listingId}/slideshows`;
  const api = useApi<ListingSlideshowsResponse>(url);
  const [theme, setTheme] = useState<SlideTheme>(DEFAULT_SLIDE_THEME);
  const [starting, setStarting] = useState<HomeSlideshowKind[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ListingSlideshowDto | null>(null);
  const [playing, setPlaying] = useState<HomeSlideshowKind | null>(null);
  const shows = api.data?.slideshows ?? [];
  const busy = shows.some((s) => s.status === 'making');
  const { refresh } = api;

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [busy, refresh]);

  const start = async (kinds: HomeSlideshowKind[]) => {
    setStarting(kinds);
    setError(null);
    try {
      await apiFetch(url, { method: 'POST', json: { kinds, theme } });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the slideshow.');
    } finally {
      setStarting([]);
    }
  };

  const idle = HOME_SLIDESHOW_KINDS.filter((k) => shows.find((s) => s.kind === k)?.status !== 'making');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-app-ink">Theme</p>
        <SlideThemePicker value={theme} onChange={setTheme} />
      </div>
      {api.loading && !api.data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-3xl">{[0, 1, 2].map((i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-3xl">
          {HOME_SLIDESHOW_KINDS.map((k) => (
            <SlideshowCard
              key={k}
              kind={k}
              show={shows.find((s) => s.kind === k)}
              starting={starting.includes(k)}
              onMake={() => void start([k])}
              onOpen={() => setOpen(shows.find((s) => s.kind === k) ?? null)}
              playing={playing === k}
              onPlay={(play) => setPlaying(play ? k : null)}
            />
          ))}
        </div>
      )}
      {idle.length > 1 && (
        <AppButton variant="secondary" className="self-start" loading={starting.length > 1} onClick={() => void start(idle)} iconLeft={<Layers className="h-4 w-4" />}>
          Make all {idle.length} in {SLIDE_THEME_INFO[theme].name}
        </AppButton>
      )}
      {(api.error || error) && <p className="text-[13px] text-app-danger" role="alert">{error ?? api.error}</p>}
      {busy && <p className="text-[13px] text-app-muted">About a minute each. You can leave this page; it keeps going.</p>}
      {open && <PlaybookPostSheet post={previewOf(open)} onClose={() => setOpen(null)} />}
    </div>
  );
};
