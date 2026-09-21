'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageLightbox } from '../../ui/ImageLightbox';

const AVATARS = [
  {
    src: '/images/business/us/ai-avatars/avatar-1-ashley.jpg',
    alt: 'AI-generated professional headshot of a blonde female realtor in a navy blazer',
    label: 'Ashley',
    role: 'Realtor · Austin, TX',
  },
  {
    src: '/images/business/us/ai-avatars/avatar-2-maria.jpg',
    alt: 'AI-generated professional headshot of a Latina female realtor in a burgundy blazer',
    label: 'Maria',
    role: 'Realtor · Miami, FL',
  },
  {
    src: '/images/business/us/ai-avatars/avatar-3-jennifer.jpg',
    alt: 'AI-generated professional headshot of a Black female realtor with natural curls',
    label: 'Jennifer',
    role: 'Realtor · Atlanta, GA',
  },
  {
    src: '/images/business/us/ai-avatars/avatar-4-sarah.jpg',
    alt: 'AI-generated professional headshot of an East Asian female realtor in a cream blazer',
    label: 'Sarah',
    role: 'Realtor · Seattle, WA',
  },
  {
    src: '/images/business/us/ai-avatars/avatar-5-diana.jpg',
    alt: 'AI-generated professional headshot of a mixed-heritage female realtor with auburn hair',
    label: 'Diana',
    role: 'Realtor · Denver, CO',
  },
];

type AvatarCardProps = (typeof AVATARS)[number] & { onClick: () => void };

const AvatarCard = ({ src, alt, label, role, onClick }: AvatarCardProps) => (
  <li className="flex w-[44vw] max-w-[200px] shrink-0 snap-start flex-col gap-2.5 sm:w-auto sm:max-w-none">
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-app-sunken ring-1 ring-black/5 transition-shadow hover:shadow-md hover:ring-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent dark:ring-white/10"
      aria-label={`View ${label}'s AI headshot full size`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 640px) 20vw, 44vw"
        className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
      />
      {/* Hover hint */}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/10" aria-hidden />
    </button>
    <div className="flex flex-col gap-0.5 px-0.5">
      <p className="text-[14px] font-semibold leading-tight text-app-ink">{label}</p>
      <p className="text-[12px] leading-snug text-app-muted">{role}</p>
    </div>
  </li>
);

/**
 * "Don't want to show your face?" section on the business home.
 * Clicking any avatar opens a full-screen lightbox with prev/next navigation.
 */
export const AiAvatarSection = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = () => setOpenIdx(null);
  const prev = () => setOpenIdx((i) => (i === null ? null : (i - 1 + AVATARS.length) % AVATARS.length));
  const next = () => setOpenIdx((i) => (i === null ? null : (i + 1) % AVATARS.length));

  return (
    <>
      {/* Avatar gallery — horizontal scroll on mobile, 5-col grid on desktop */}
      <ul
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0"
        aria-label="5 sample AI-generated realtor headshots — click to enlarge"
      >
        {AVATARS.map((avatar, idx) => (
          <AvatarCard key={avatar.label} {...avatar} onClick={() => setOpenIdx(idx)} />
        ))}
      </ul>

      {/* Note below gallery */}
      <p className="mt-6 max-w-md text-[14px] leading-relaxed text-app-muted">
        <span className="font-semibold text-app-ink">100% AI. Looks real.</span>{' '}
        Upload one selfie and get a professional headshot in any style — no camera, no studio, no photographer.
      </p>

      {/* Lightbox */}
      {openIdx !== null && (
        <ImageLightbox
          src={AVATARS[openIdx]!.src}
          alt={AVATARS[openIdx]!.alt}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </>
  );
};
