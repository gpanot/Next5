import { CalendarCheck, Home, Sparkles } from 'lucide-react';
import { formatRelative } from '../../../lib/dates';
import type { LibrarySeriesDto } from '../../../types/business/batches';
import { AppLink as Link } from '../shell/AppLink';

const CATEGORY_ICON = { property: Home, theme: Sparkles, trial: Sparkles } as const;

/** One series in the library: cover, what it was made for, how many photos, how many on the calendar. */
export const SeriesCard = ({ series }: { series: LibrarySeriesDto }) => {
  const Icon = CATEGORY_ICON[series.category];
  return (
    <Link
      href={`/app/batches/${series.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-app-sunken">
        {series.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img src={series.coverUrl} alt={`Cover of ${series.name}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-medium tabular-nums text-white">
          {series.photoCount} photo{series.photoCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3 sm:p-4">
        <span className="flex min-w-0 items-center gap-1 text-[12px] font-medium text-app-accent">
          <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{series.categoryLabel}</span>
        </span>
        <p className="truncate text-[14px] font-semibold text-app-ink">{series.name}</p>
        <div className="flex items-center justify-between gap-2 text-[12px] text-app-muted">
          <span>{formatRelative(series.createdAt)}</span>
          {series.onCalendar > 0 && (
            <span className="flex items-center gap-1">
              <CalendarCheck aria-hidden className="h-3.5 w-3.5" /> {series.onCalendar}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
