import type { ReactElement } from 'react';
import { CrownIcon } from '../ui/Icons';
import { PlaceholderImage } from '../ui/PlaceholderImage';

export type Platform = 'instagram' | 'tiktok' | 'facebook';

type PhotoData = { src: string; score: number; label: string };

/* Score → qualitative label */
const scoreLabel = (score: number): string => {
  if (score >= 95) return 'Excellent Choice';
  if (score >= 90) return 'Very Strong';
  if (score >= 88) return 'Strong';
  return 'Good';
};

const photos: readonly PhotoData[] = [
  { src: '/images/results-gallery/lily1.jpeg', score: 87, label: scoreLabel(87) },
  { src: '/images/results-gallery/lily2.jpeg', score: 91, label: scoreLabel(91) },
  { src: '/images/results-gallery/lily3.jpeg', score: 95, label: scoreLabel(95) },
  { src: '/images/results-gallery/lily5.jpeg', score: 89, label: scoreLabel(89) },
  { src: '/images/results-gallery/lily7.jpeg', score: 84, label: scoreLabel(84) },
];

/* The highest-scoring photo is the winner */
const winnerScore = Math.max(...photos.map((p) => p.score));

type PlatformSelectorProps = {
  platform: Platform;
  onChange: (platform: Platform) => void;
  platforms: Record<Platform, string>;
};

/* Platform icons — minimal inline SVGs matching the reference */
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.15 8.15 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const platformIcons: Record<Platform, () => ReactElement> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  facebook: FacebookIcon,
};

const PlatformSelector = ({
  platform,
  onChange,
  platforms,
}: PlatformSelectorProps) => (
  <div className="relative z-30 mt-5 flex justify-center">
    <div className="shadow-card inline-flex rounded-full border border-line bg-surface p-1">
      {(Object.keys(platforms) as Platform[]).map((key) => {
        const Icon = platformIcons[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={platform === key}
            className={`label-caps flex items-center gap-1.5 rounded-full px-4 py-2 text-[9.5px] font-medium transition-colors duration-200 ${
              platform === key ? 'bg-ink-block text-on-dark' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon />
            {platforms[key]}
          </button>
        );
      })}
    </div>
  </div>
);

type PostConfidenceGalleryProps = {
  platform: Platform;
  onPlatformChange: (platform: Platform) => void;
  pickLabel: string;
  platforms: Record<Platform, string>;
  excellentChoice: string;
};

export const PostConfidenceGallery = ({
  platform,
  onPlatformChange,
  pickLabel,
  platforms,
  excellentChoice,
}: PostConfidenceGalleryProps) => (
  <div>
    {/* ── Desktop: horizontal row, winner taller & centred ── */}
    <div className="hidden lg:block">
      <div className="flex items-end justify-center gap-1">
        {photos.map((photo) => {
          const isWinner = photo.score === winnerScore;
          const overlay = (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pt-12 pb-3 text-center text-on-dark">
              {isWinner ? (
                <>
                  <p className="font-serif text-[42px] font-normal leading-none text-gold">{photo.score}</p>
                  <p className="label-caps mt-1 text-[9px] font-semibold uppercase tracking-widest text-white">
                    {excellentChoice}
                  </p>
                  <p className="mt-1 text-[9px] text-gold">{pickLabel}</p>
                </>
              ) : (
                <>
                  <p className="font-serif text-[24px] leading-none text-white">{photo.score}</p>
                  <p className="mt-0.5 text-[8.5px] text-white/70">{photo.label}</p>
                </>
              )}
            </div>
          );
          const alt = isWinner ? `Winner photo, score ${photo.score}` : `Alternate photo, score ${photo.score}`;

          /* The winner needs its crown badge to float above the card, so it
             can't live inside the same overflow-hidden box as the photo. */
          if (isWinner) {
            return (
              <div key={photo.src} className="relative z-20 w-[168px] shrink-0">
                <span className="absolute -top-4 left-1/2 z-30 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-gold text-white shadow-lg">
                  <CrownIcon className="h-[18px] w-[18px]" />
                </span>
                <div className="rounded-2xl border-2 border-gold p-1.5 shadow-[0_28px_70px_-10px_rgba(34,31,28,0.55)]">
                  <div className="relative overflow-hidden rounded-[14px]">
                    <PlaceholderImage src={photo.src} alt={alt} className="aspect-[3/5] w-full" loading="eager" />
                    {overlay}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={photo.src}
              className="relative z-10 w-[127px] shrink-0 overflow-hidden rounded-2xl shadow-[0_12px_32px_-8px_rgba(34,31,28,0.28)] ring-2 ring-white"
            >
              <PlaceholderImage src={photo.src} alt={alt} className="aspect-[3/4] w-full" loading="eager" />
              {overlay}
            </div>
          );
        })}
      </div>
      <PlatformSelector platform={platform} onChange={onPlatformChange} platforms={platforms} />
    </div>

    {/* ── Mobile: large winner + horizontal carousel of others ── */}
    <div className="lg:hidden">
      {/* Winner card */}
      {photos
        .filter((p) => p.score === winnerScore)
        .map((photo) => (
          <div key={photo.src} className="relative mx-auto max-w-[300px]">
            <span className="absolute -top-3 left-1/2 z-30 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-gold text-white shadow-md">
              <CrownIcon className="h-4 w-4" />
            </span>
            <div className="rounded-2xl border-2 border-gold p-1.5 shadow-[0_20px_50px_-15px_rgba(34,31,28,0.4)]">
              <div className="relative overflow-hidden rounded-[14px]">
                <PlaceholderImage
                  src={photo.src}
                  alt="Winner photo"
                  className="aspect-[4/5] w-full"
                  loading="eager"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-block/90 via-ink-block/50 to-transparent px-4 pt-14 pb-4 text-center text-on-dark">
                  <p className="font-serif text-[38px] leading-none text-gold">{photo.score}</p>
                  <p className="label-caps mt-1.5 text-[9.5px] font-medium">{excellentChoice}</p>
                  <p className="mt-0.5 text-[10px] text-gold">{pickLabel}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      {/* Others */}
      <div className="mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
        {photos
          .filter((p) => p.score !== winnerScore)
          .map((photo) => (
            <div
              key={photo.src}
              className="relative w-20 shrink-0 overflow-hidden rounded-xl shadow-[0_8px_20px_-8px_rgba(34,31,28,0.25)] ring-2 ring-white"
            >
              <PlaceholderImage src={photo.src} alt="Alternate photo" className="aspect-[4/5] w-full" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-block/80 to-transparent px-1 pt-6 pb-1.5 text-center text-on-dark">
                <p className="font-serif text-[16px] leading-none text-white">{photo.score}</p>
                <p className="mt-0.5 text-[7px] text-on-dark-muted">{photo.label}</p>
              </div>
            </div>
          ))}
      </div>
      <PlatformSelector platform={platform} onChange={onPlatformChange} platforms={platforms} />
    </div>
  </div>
);
