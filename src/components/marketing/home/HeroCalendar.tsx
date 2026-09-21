import { CalendarDays, Play } from 'lucide-react';
import { CALENDAR_HERO, type HeroCalendarContent } from '../../../content/business/home';
import { PlatformIcon } from '../offer/PlatformMarks';
import { MarketingImage } from '../shared/MarketingImage';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Post = { image: string; video: boolean; platform: HeroCalendarContent['platforms'][number] };
type Cell = { day: number; post: Post | null } | null;

/** This month, Monday-first, with a post on each post weekday and a UGC video on the video weekday. */
const buildMonth = (content: HeroCalendarContent, now: Date): { name: string; cells: Cell[] } => {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const counters = { photo: 0, video: 0, post: 0 };
  const cells: Cell[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= days; day += 1) {
    const weekday = (firstWeekday + day - 1) % 7;
    if (!content.postWeekdays.includes(weekday)) { cells.push({ day, post: null }); continue; }
    const video = weekday === content.videoWeekday;
    const image = video ? content.videos[counters.video++ % content.videos.length]! : content.photos[counters.photo++ % content.photos.length]!;
    const platform = video ? 'tiktok' : content.platforms[counters.post % content.platforms.length]!;
    counters.post += 1;
    cells.push({ day, post: { image, video, platform } });
  }
  return { name: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }), cells };
};

const DayCell = ({ cell }: { cell: Cell }) => {
  if (!cell) return <li aria-hidden className="aspect-square" />;
  const { post } = cell;
  return (
    <li className={`relative aspect-square overflow-hidden rounded-lg sm:rounded-xl ${post ? 'bg-app-sunken' : 'border border-dashed border-app-line'} ${post?.video ? 'ring-2 ring-app-accent ring-offset-1 ring-offset-app-panel' : ''}`}>
      {post && <MarketingImage src={post.image} sizes="96px" className="object-[center_20%]" />}
      {post?.video && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/10" aria-hidden>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow sm:h-8 sm:w-8"><Play className="ml-px h-3 w-3 fill-ink text-ink sm:h-3.5 sm:w-3.5" /></span>
        </span>
      )}
      {!post && <span className="absolute left-1 top-0.5 text-[9px] font-semibold tabular-nums text-app-muted sm:left-1.5 sm:top-1 sm:text-[11px]">{cell.day}</span>}
      {post && (
        <span className="absolute bottom-1 right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm sm:flex sm:h-5 sm:w-5">
          <PlatformIcon id={post.platform} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </span>
      )}
    </li>
  );
};

/** "Up next" card that floats over the calendar: the post and the words we wrote for it. */
const NextPost = ({ next }: { next: HeroCalendarContent['next'] }) => (
  <div className="flex w-full max-w-[300px] items-center gap-3 rounded-2xl bg-app-panel p-2.5 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-app-sunken">
      <MarketingImage src={next.image} sizes="56px" className="object-[center_20%]" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-app-accent">Up next · {next.when} · {next.platform}</p>
      <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-app-ink">“{next.hook}”</p>
      <p className="mt-0.5 text-[11px] text-app-muted">Hook, caption and hashtags written</p>
    </div>
  </div>
);

/** The hero visual: a real-looking month filled with photos and UGC videos. */
export const HeroCalendar = ({ content, now }: { content: HeroCalendarContent; now: Date }) => {
  const { name, cells } = buildMonth(content, now);
  const posts = cells.filter((c) => c?.post).length;
  const videos = cells.filter((c) => c?.post?.video).length;
  return (
    <div className="relative">
      <figure className="rounded-3xl bg-app-panel p-3 shadow-xl ring-1 ring-black/5 sm:p-5 sm:pb-20 dark:ring-white/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-app-ink sm:text-[17px]"><CalendarDays aria-hidden className="h-4 w-4 text-app-accent sm:h-5 sm:w-5" />{name}</span>
          <span className="flex items-center gap-3 text-[12px] text-app-muted sm:text-[13px]">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-app-muted/40" aria-hidden />{posts - videos} {CALENDAR_HERO.legend.photo.toLowerCase()}s</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm ring-2 ring-app-accent" aria-hidden />{videos} {CALENDAR_HERO.legend.video}s</span>
          </span>
        </div>
        <ol className="grid grid-cols-7 gap-1 sm:gap-1.5" aria-label={`${posts} posts planned in ${name}: ${posts - videos} photos and ${videos} UGC videos`}>
          {WEEKDAYS.map((d) => <li key={d} aria-hidden className="pb-1 text-center text-[10px] font-medium text-app-muted sm:text-[11px]"><span className="sm:hidden">{d[0]}</span><span className="hidden sm:inline">{d}</span></li>)}
          {cells.map((cell, i) => <DayCell key={i} cell={cell} />)}
        </ol>
      </figure>
      <div className="mt-3 flex justify-center sm:absolute sm:-bottom-8 sm:-left-8 sm:mt-0 sm:block">
        <NextPost next={content.next} />
      </div>
    </div>
  );
};
