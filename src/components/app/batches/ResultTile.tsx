'use client';

import { AlertTriangle, CalendarCheck, CalendarPlus, Check, Download, Heart, Loader2, Maximize2, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { FORMATS, isFormatId } from '../../../config/formats';
import { failedPhotoText } from '../../../lib/generationErrors';
import type { BatchItemDto } from '../../../types/business/batches';
import { ScoreBadge } from '../postKit/ScoreBadge';
import { GenerationTimer } from './GenerationTimer';

type ResultTileProps = {
  item: BatchItemDto;
  alt: string;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onFavorite: () => void;
  onDownload: () => void;
  onRedo: () => void;
  /** Opens the Post Kit for this photo without leaving the page. */
  onPostKit?: () => void;
  /** Trash icon: archives the photo. */
  onArchive?: () => void;
  /** "Add to calendar" / take it off again. Shown on photos she picks by hand (made from a property). */
  onCalendar?: () => void;
  calendarBusy?: boolean;
};

const dayLabel = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Full-width calendar toggle under a photo: the one decision she makes per photo. */
const CalendarButton = ({ item, busy, onClick }: { item: BatchItemDto; busy: boolean; onClick: () => void }) => {
  const on = item.calendar && item.calendar.status !== 'skipped';
  const posted = item.calendar?.status === 'posted';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || posted}
      aria-pressed={Boolean(on)}
      aria-label={posted ? 'Posted' : on && item.calendar ? `On calendar, ${dayLabel(item.calendar.date)}. Tap to take it off.` : 'Add to calendar'}
      title={on && !posted ? 'Tap to take it off the calendar' : undefined}
      className={`mx-1 flex h-9 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:cursor-default ${on ? 'bg-app-accent-soft text-app-accent' : 'bg-app-accent text-app-accent-ink hover:opacity-90'}`}
    >
      {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : on ? <CalendarCheck aria-hidden className="h-4 w-4" /> : <CalendarPlus aria-hidden className="h-4 w-4" />}
      <span className="truncate">{posted ? 'Posted' : on && item.calendar ? dayLabel(item.calendar.date) : 'Add to calendar'}</span>
    </button>
  );
};

const IconButton = ({ label, onClick, children, active = false, tone = 'danger' }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean; tone?: 'danger' | 'accent' }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${active ? (tone === 'accent' ? 'text-app-accent hover:bg-app-sunken' : 'text-app-danger') : 'text-app-muted hover:bg-app-sunken hover:text-app-ink'}`}>
    {children}
  </button>
);

/** A generated photo with always-visible actions (works without hover on phones). */
export const ResultTile = ({ item, alt, selecting, selected, onToggleSelect, onOpen, onFavorite, onDownload, onRedo, onPostKit, onArchive, onCalendar, calendarBusy = false }: ResultTileProps) => {
  const aspect = isFormatId(item.format) ? FORMATS[item.format].cssAspect : '3 / 4';
  const busy = item.status === 'queued' || item.status === 'submitting' || item.status === 'generating';
  const ready = item.status === 'ready' && item.url;

  return (
    <figure className={`flex flex-col overflow-hidden rounded-2xl border bg-app-panel transition-colors duration-200 ${selected ? 'border-app-accent ring-1 ring-app-accent' : 'border-app-line'}`}>
      <button type="button" onClick={selecting ? onToggleSelect : onOpen} disabled={!ready && !selecting} aria-label={selecting ? `Select ${alt}` : `Open ${alt}`} className="relative w-full overflow-hidden bg-app-sunken" style={{ aspectRatio: aspect }}>
        {item.url && (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img src={item.url} alt={alt} loading="lazy" className={`h-full w-full object-cover ${busy ? 'opacity-40' : ''}`} />
        )}
        {busy && <GenerationTimer startedAt={item.startedAt} queued={item.status === 'queued'} />}
        {item.status === 'failed' && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-[12px] text-app-muted">
            <AlertTriangle aria-hidden className="h-6 w-6 text-app-warning" />
            <span role="alert">{failedPhotoText(item.errorMessage, item.canRetry)}</span>
            <span className="text-[11px]">No credit used.</span>
          </span>
        )}
        {selecting && (
          <span className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${selected ? 'border-app-accent bg-app-accent text-app-accent-ink' : 'border-white bg-black/30'}`}>
            {selected && <Check aria-hidden className="h-4 w-4" />}
          </span>
        )}
        {ready && !selecting && item.score !== null && <ScoreBadge score={item.score} className="absolute left-2 top-2" />}
        {ready && !selecting && <Maximize2 aria-hidden className="absolute right-2 top-2 h-4 w-4 text-white opacity-80 drop-shadow" />}
      </button>
      {!selecting && ready && onCalendar && <div className="flex flex-col pt-1"><CalendarButton item={item} busy={calendarBusy} onClick={onCalendar} /></div>}
      {!selecting && (
        <figcaption className="flex items-center justify-between px-1 py-1">
          <IconButton label={item.favorite ? 'Remove from favourites' : 'Add to favourites'} onClick={onFavorite} active={item.favorite}>
            <Heart aria-hidden className={`h-4 w-4 ${item.favorite ? 'fill-current' : ''}`} />
          </IconButton>
          <div className="flex">
            {ready && onPostKit && <IconButton label={item.postKit ? 'See Post Kit' : 'Write Post Kit'} onClick={onPostKit} active={Boolean(item.postKit)} tone="accent"><Sparkles aria-hidden className={`h-4 w-4 ${item.postKit ? 'fill-current' : ''}`} /></IconButton>}
            {(ready || item.canRetry) && <IconButton label="Redo" onClick={onRedo}><RefreshCw aria-hidden className="h-4 w-4" /></IconButton>}
            {ready && <IconButton label="Download" onClick={onDownload}><Download aria-hidden className="h-4 w-4" /></IconButton>}
            {(ready || item.status === 'failed') && onArchive && <IconButton label="Archive" onClick={onArchive}><Trash2 aria-hidden className="h-4 w-4" /></IconButton>}
          </div>
        </figcaption>
      )}
    </figure>
  );
};
