import { FREE_GRANT_CREDITS } from '../../types/admin/slideshowCredits';
import { SiteForm } from '../admin/autoSlideshow/workspace/SiteForm';

/** The in-article call to action: same website box as the home hero, so a reader can start right here. */
export function ArticleCta({ title, text }: { title: string; text: string }) {
  return (
    <aside className="my-10 rounded-2xl border border-blue-600/15 bg-blue-50/70 p-5 shadow-sm md:p-7 dark:border-blue-400/20 dark:bg-blue-950/30">
      <p className="text-xs font-bold tracking-wide text-blue-700 uppercase dark:text-blue-300">Next5</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight text-ink md:text-2xl dark:text-zinc-100">{title}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted dark:text-zinc-400">{text}</p>
      <SiteForm className="mt-5" />
      <p className="mt-3 text-xs text-muted dark:text-zinc-500">Your first {FREE_GRANT_CREDITS} posts are free. No subscription.</p>
    </aside>
  );
}
