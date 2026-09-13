import { THEMES } from '../../../content/business/catalog/themes';
import { MarketingImage } from '../shared/MarketingImage';

const monthLabel = (month: string | null): string | null =>
  month ? new Date(`${month}-15T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;

/** Featured themes in calendar order first, then the always-available library. */
export const ThemesScroller = () => {
  const ordered = [...THEMES].sort((a, b) => (a.featuredMonth ?? '9999').localeCompare(b.featuredMonth ?? '9999'));
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 [scrollbar-width:thin]">
      <ul className="flex w-max snap-x snap-mandatory gap-4">
        {ordered.map((theme) => (
          <li key={theme.id} className="flex w-56 snap-start flex-col gap-3 sm:w-64">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10">
              <MarketingImage src={theme.coverImage} sizes="256px" caption={`${theme.scenes.length} scenes`} />
            </div>
            <div>
              <p className="label-caps text-[10px] font-medium text-app-accent">{monthLabel(theme.featuredMonth) ?? 'Any time'}</p>
              <h3 className="mt-1 text-[16px] font-semibold text-app-ink">{theme.title}</h3>
              <p className="mt-0.5 text-[14px] text-app-muted">{theme.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
