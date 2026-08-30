'use client';

import { type ReactElement } from 'react';
import { CrownIcon } from '../ui/Icons';
import { PlaceholderImage } from '../ui/PlaceholderImage';

export type Platform = 'instagram' | 'tiktok' | 'facebook';

type PhotoData = { src: string; score: number; label: string };

const scoreLabel = (score: number): string => {
  if (score >= 95) return 'Excellent Choice';
  if (score >= 90) return 'Very Strong';
  if (score >= 88) return 'Strong';
  return 'Good';
};

/* ── Per-platform photo sets ─────────────────────────────────────────────── */
const platformPhotos: Record<Platform, readonly PhotoData[]> = {
  instagram: [
    { src: '/images/results-gallery/lily1.jpeg',   score: 87, label: scoreLabel(87) },
    { src: '/images/results-gallery/lily2.jpeg',   score: 91, label: scoreLabel(91) },
    { src: '/images/results-gallery/lily3.jpeg',   score: 95, label: scoreLabel(95) },
    { src: '/images/results-gallery/lily5.jpeg',   score: 89, label: scoreLabel(89) },
    { src: '/images/results-gallery/lily7.jpeg',   score: 84, label: scoreLabel(84) },
  ],
  tiktok: [
    { src: '/images/results-gallery/lily4.jpeg',   score: 82, label: scoreLabel(82) },
    { src: '/images/results-gallery/lily7.jpeg',   score: 88, label: scoreLabel(88) },
    { src: '/images/results-gallery/lily2.jpeg',   score: 94, label: scoreLabel(94) },
    { src: '/images/results-gallery/lily6.jpeg',   score: 86, label: scoreLabel(86) },
    { src: '/images/results-gallery/lily1.jpeg',   score: 79, label: scoreLabel(79) },
  ],
  facebook: [
    { src: '/images/results-gallery/sandra1.jpeg', score: 84, label: scoreLabel(84) },
    { src: '/images/results-gallery/sandra3.jpeg', score: 90, label: scoreLabel(90) },
    { src: '/images/results-gallery/sandra2.jpeg', score: 96, label: scoreLabel(96) },
    { src: '/images/results-gallery/sandra4.jpeg', score: 87, label: scoreLabel(87) },
    { src: '/images/results-gallery/lily6.jpeg',   score: 81, label: scoreLabel(81) },
  ],
};

/* ── Platform icons ──────────────────────────────────────────────────────── */
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

/* ── Single photo card — fades in when its src changes (via key) ─────────── */
type CardProps = {
  photo: PhotoData;
  isWinner: boolean;
  excellentChoice: string;
  pickLabel: string;
  variant: 'desktop-winner' | 'desktop-side' | 'mobile-winner' | 'mobile-side';
};

const Card = ({ photo, isWinner, excellentChoice, pickLabel, variant }: CardProps) => {
  const aspectClass =
    variant === 'desktop-winner' ? 'aspect-[3/5]' :
    variant === 'desktop-side'   ? 'aspect-[3/4]' : 'aspect-[4/5]';

  return (
    /* key={photo.src} on the outer wrapper triggers a re-mount → CSS animation */
    <div
      className={`relative w-full ${aspectClass}`}
      style={{ animation: 'galleryFadeIn 350ms ease-out both' }}
    >
      <style>{`@keyframes galleryFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <PlaceholderImage
        src={photo.src}
        alt={`Score ${photo.score}`}
        className="h-full w-full"
        loading="eager"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pt-12 pb-3 text-center text-on-dark">
        {isWinner ? (
          <>
            <p className={`font-serif leading-none text-gold ${variant === 'desktop-winner' ? 'text-[42px]' : 'text-[38px]'}`}>
              {photo.score}
            </p>
            <p className="label-caps mt-1 text-[9px] font-semibold uppercase tracking-widest text-white">
              {excellentChoice}
            </p>
            <p className="mt-1 text-[9px] text-gold">{pickLabel}</p>
          </>
        ) : (
          <>
            <p className={`font-serif leading-none text-white ${variant === 'desktop-side' ? 'text-[24px]' : 'text-[16px]'}`}>
              {photo.score}
            </p>
            <p className={`mt-0.5 text-white/70 ${variant === 'desktop-side' ? 'text-[8.5px]' : 'text-[7px]'}`}>
              {photo.label}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Platform selector ───────────────────────────────────────────────────── */
type PlatformSelectorProps = {
  platform: Platform;
  onChange: (p: Platform) => void;
  platforms: Record<Platform, string>;
};
const PlatformSelector = ({ platform, onChange, platforms }: PlatformSelectorProps) => (
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

/* ── Main gallery ────────────────────────────────────────────────────────── */
export type PostConfidenceGalleryProps = {
  platform: Platform;
  onPlatformChange: (p: Platform) => void;
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
}: PostConfidenceGalleryProps) => {
  const photos = platformPhotos[platform];
  const winnerScore = Math.max(...photos.map((p) => p.score));

  return (
    <div>
      {/* ── Desktop ──────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="flex items-end justify-center gap-1">
          {photos.map((photo, i) => {
            const isWinner = photo.score === winnerScore;
            if (isWinner) {
              return (
                <div key={i} className="relative z-20 w-[168px] shrink-0">
                  <span className="absolute -top-4 left-1/2 z-30 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-gold text-white shadow-lg">
                    <CrownIcon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="rounded-2xl border-2 border-gold p-1.5 shadow-[0_28px_70px_-10px_rgba(34,31,28,0.55)]">
                    <div className="overflow-hidden rounded-[14px]">
                      <Card
                        key={photo.src}
                        photo={photo}
                        isWinner
                        excellentChoice={excellentChoice}
                        pickLabel={pickLabel}
                        variant="desktop-winner"
                      />
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="relative z-10 w-[127px] shrink-0 overflow-hidden rounded-2xl shadow-[0_12px_32px_-8px_rgba(34,31,28,0.28)] ring-2 ring-white">
                <Card
                  key={photo.src}
                  photo={photo}
                  isWinner={false}
                  excellentChoice={excellentChoice}
                  pickLabel={pickLabel}
                  variant="desktop-side"
                />
              </div>
            );
          })}
        </div>
        <PlatformSelector platform={platform} onChange={onPlatformChange} platforms={platforms} />
      </div>

      {/* ── Mobile ───────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        {photos
          .filter((p) => p.score === winnerScore)
          .map((photo, i) => (
            <div key={i} className="relative mx-auto max-w-[300px]">
              <span className="absolute -top-3 left-1/2 z-30 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-gold text-white shadow-md">
                <CrownIcon className="h-4 w-4" />
              </span>
              <div className="rounded-2xl border-2 border-gold p-1.5 shadow-[0_20px_50px_-15px_rgba(34,31,28,0.4)]">
                <div className="overflow-hidden rounded-[14px]">
                  <Card
                    key={photo.src}
                    photo={photo}
                    isWinner
                    excellentChoice={excellentChoice}
                    pickLabel={pickLabel}
                    variant="mobile-winner"
                  />
                </div>
              </div>
            </div>
          ))}

        <div className="mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
          {photos
            .filter((p) => p.score !== winnerScore)
            .map((photo, i) => (
              <div key={i} className="relative w-20 shrink-0 overflow-hidden rounded-xl shadow-[0_8px_20px_-8px_rgba(34,31,28,0.25)] ring-2 ring-white">
                <Card
                  key={photo.src}
                  photo={photo}
                  isWinner={false}
                  excellentChoice={excellentChoice}
                  pickLabel={pickLabel}
                  variant="mobile-side"
                />
              </div>
            ))}
        </div>
        <PlatformSelector platform={platform} onChange={onPlatformChange} platforms={platforms} />
      </div>
    </div>
  );
};
