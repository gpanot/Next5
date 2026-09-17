import type { ImportSourceId } from '../../../content/business/offer';
import { TikTokLogo, ZillowLogo } from '../shared/BrandLogos';

const SOURCES: Record<ImportSourceId, { who: string; logo: React.ReactNode; what: string }> = {
  zillow: { who: 'Realtors', logo: <ZillowLogo />, what: 'Paste your listing link. We use its real photos.' },
  tiktok_shop: { who: 'Sellers', logo: <TikTokLogo shop />, what: 'Paste your shop link. We bring in your products.' },
};

type Props = { sources: readonly ImportSourceId[]; className?: string };

/** One line for the first phone screen: "Paste your link from [Zillow] [TikTok Shop]". */
export const ImportSourcesRow = ({ sources, className = '' }: Props) => (
  <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
    <span className="text-[13px] text-app-muted">Paste your link from</span>
    <ul className="flex flex-wrap items-center gap-2">
      {sources.map((id) => (
        <li key={id} className="rounded-full border border-app-line bg-app-panel px-3 py-1.5 text-[14px] leading-none shadow-sm">{SOURCES[id].logo}</li>
      ))}
    </ul>
  </div>
);

/** "Paste your link" sources, shown with their real logos so people see at a glance that it works with their tools. */
export const ImportSources = ({ sources, className = '' }: Props) => (
  <ul className={`flex w-full flex-col gap-2 sm:w-auto ${className}`}>
    {sources.map((id) => (
      <li key={id} className="flex items-center gap-3 rounded-2xl border border-app-line bg-app-panel px-4 py-3 shadow-sm">
        <span className="shrink-0 text-[17px] leading-none">{SOURCES[id].logo}</span>
        <span className="text-[13px] leading-snug text-app-muted">
          <span className="font-medium text-app-ink">{SOURCES[id].who}:</span> {SOURCES[id].what}
        </span>
      </li>
    ))}
  </ul>
);
