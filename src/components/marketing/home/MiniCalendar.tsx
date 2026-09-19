import { CalendarDays, Play } from 'lucide-react';
import { HOME_CALENDAR } from '../../../content/business/home';
import { MarketingImage } from '../shared/MarketingImage';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Cell = { day: number; image: string | null; video: boolean } | null;

/** Lays the example month out Monday-first: photos on post days, a video on each video day. */
const buildCells = (): Cell[] => {
  const { firstWeekday, days, postWeekdays, videoWeekday, photos, videos } = HOME_CALENDAR;
  let photo = 0;
  let video = 0;
  const cells: Cell[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= days; day += 1) {
    const weekday = (firstWeekday + day - 1) % 7;
    const isVideo = weekday === videoWeekday;
    const isPost = postWeekdays.includes(weekday);
    const image = !isPost ? null : isVideo ? videos[video++ % videos.length]! : photos[photo++ % photos.length]!;
    cells.push({ day, image, video: isPost && isVideo });
  }
  return cells;
};

const DayCell = ({ cell }: { cell: Cell }) => {
  if (!cell) return <li aria-hidden />;
  return (
    <li className="relative aspect-square overflow-hidden rounded-md bg-app-sunken sm:rounded-lg">
      {cell.image && <MarketingImage src={cell.image} sizes="80px" className="object-[center_20%]" />}
      {cell.video && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/85 sm:h-7 sm:w-7"><Play className="ml-px h-2.5 w-2.5 fill-ink text-ink sm:h-3.5 sm:w-3.5" /></span>
        </span>
      )}
      <span className={`absolute left-1 top-0.5 text-[9px] font-semibold tabular-nums sm:text-[11px] ${cell.image ? 'text-white drop-shadow' : 'text-app-muted'}`}>{cell.day}</span>
    </li>
  );
};

/** A month of posts at a glance: the output of "set it up once", not a description of it. */
export const MiniCalendar = () => {
  const cells = buildCells();
  const posts = cells.filter((c) => c?.image).length;
  const videos = cells.filter((c) => c?.video).length;
  return (
    <figure className="rounded-2xl bg-app-panel p-3 shadow-sm ring-1 ring-black/5 sm:rounded-3xl sm:p-5 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-app-ink"><CalendarDays aria-hidden className="h-4 w-4 text-app-accent" />{HOME_CALENDAR.month}</span>
        <span className="text-[13px] text-app-muted">{posts - videos} photos · {videos} videos</span>
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:gap-1.5" aria-label={`${posts} posts planned this month`}>
        {WEEKDAYS.map((d, i) => <li key={i} aria-hidden className="pb-1 text-center text-[10px] font-medium text-app-muted sm:text-[11px]">{d}</li>)}
        {cells.map((cell, i) => <DayCell key={i} cell={cell} />)}
      </ol>
      <figcaption className="mt-3 text-[13px] text-app-muted">{HOME_CALENDAR.caption}</figcaption>
    </figure>
  );
};
