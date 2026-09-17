import type { PlatformId } from '../../../content/business/offer';
import { TIKTOK_MARK } from '../shared/BrandLogos';

/** The official TikTok note, drawn in the chip's text color like the other marks. */
const TikTokPaths = () => <path d={TIKTOK_MARK} fill="currentColor" transform="translate(2.4 2.4) scale(0.8)" />;

/** Simple hand-drawn platform marks (nominative use: "made for" — no endorsement implied). */
const MARKS: Record<PlatformId, { label: string; svg: React.ReactNode }> = {
  tiktok: {
    label: 'TikTok',
    svg: <TikTokPaths />,
  },
  instagram: {
    label: 'Instagram',
    svg: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.9" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
      </>
    ),
  },
  facebook: {
    label: 'Facebook',
    svg: <path d="M13.4 21v-7.6H16l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3A21 21 0 0 0 14.3 4c-2.4 0-4 1.5-4 4.1v2.3H7.7v3h2.6V21h3.1Z" fill="currentColor" />,
  },
  shopee: {
    label: 'Shopee',
    svg: (
      <>
        <path d="M5 8h14l-1 12.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8L5 8Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M13.8 12.2c-.5-.5-1.1-.7-1.8-.7-1 0-1.7.5-1.7 1.2 0 1.7 3.6 1 3.6 2.8 0 .8-.8 1.4-1.9 1.4-.8 0-1.5-.3-2-.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    svg: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 10.5V16M8 7.8v.1M11.5 16v-3.2c0-1.4.8-2.3 2-2.3s1.8.8 1.8 2.3V16M11.5 10.5V16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
};

export const PlatformMarks = ({ platforms, label = 'Made for', className = '' }: { platforms: readonly PlatformId[]; label?: string; className?: string }) => (
  <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
    <span className="text-[13px] text-app-muted">{label}</span>
    <ul className="flex flex-wrap items-center gap-2">
      {platforms.map((id) => (
        <li key={id} className="flex items-center gap-1.5 rounded-full border border-app-line bg-app-panel px-2.5 py-1 text-[13px] font-medium text-app-ink">
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">{MARKS[id].svg}</svg>
          {MARKS[id].label}
        </li>
      ))}
    </ul>
  </div>
);
