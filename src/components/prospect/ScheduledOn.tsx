import { useId } from 'react';
import { TikTokMark } from '../marketing/shared/BrandLogos';

/** The platforms' own app icons, in their brand colors (nominative use, no endorsement implied). */
const TikTokTile = () => (
  <span className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white">
    <TikTokMark className="h-6 w-6" />
  </span>
);

const InstagramTile = () => {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.3" cy="1.07" r="1.3">
          <stop offset="0" stopColor="#FFDD55" />
          <stop offset="0.1" stopColor="#FFDD55" />
          <stop offset="0.5" stopColor="#FF543E" />
          <stop offset="1" stopColor="#C837AB" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <rect x="9" y="9" width="22" height="22" rx="6.5" fill="none" stroke="#fff" strokeWidth="2.6" />
      <circle cx="20" cy="20" r="5.2" fill="none" stroke="#fff" strokeWidth="2.6" />
      <circle cx="26.4" cy="13.6" r="1.6" fill="#fff" />
    </svg>
  );
};

const YouTubeTile = () => (
  <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
    <rect width="40" height="40" rx="11" fill="#FF0000" />
    <path d="M17 14.5v11l9.5-5.5Z" fill="#fff" />
  </svg>
);

const MusicMark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const TIKTOK = { name: 'TikTok', Tile: TikTokTile };
const INSTAGRAM = { name: 'Instagram', Tile: InstagramTile };
const YOUTUBE = { name: 'YouTube', Tile: YouTubeTile };

/** The music a slideshow posts with: picked for them. */
const MusicBox = () => (
  <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-app-line px-3 py-2.5 text-app-ink">
    <MusicMark />
    <span className="text-[14px]">Auto selected</span>
  </div>
);

/** Where the post goes out: a video on TikTok, Instagram and YouTube; a slideshow on TikTok and Instagram (YouTube
 *  Shorts takes no photo carousel), with its music. */
export function ScheduledOn({ slideshow }: { slideshow: boolean }) {
  const platforms = slideshow ? [TIKTOK, INSTAGRAM] : [TIKTOK, INSTAGRAM, YOUTUBE];
  return (
    <div className="mt-4">
      <p className="m-0 mb-2 text-[13px] text-app-muted">Scheduled on</p>
      <ul className="m-0 flex list-none gap-2 p-0">
        {platforms.map(({ name, Tile }) => (
          <li key={name} title={name} className="rounded-xl shadow-sm">
            <Tile />
            <span className="sr-only">{name}</span>
          </li>
        ))}
      </ul>
      {slideshow && <MusicBox />}
    </div>
  );
}
