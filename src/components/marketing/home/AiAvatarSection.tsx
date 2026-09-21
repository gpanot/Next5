import { ArrowRight, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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

const AvatarCard = ({ src, alt, label, role }: (typeof AVATARS)[number]) => (
  <li className="flex w-[44vw] max-w-[200px] shrink-0 snap-start flex-col gap-2.5 sm:w-auto sm:max-w-none">
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 640px) 20vw, 44vw"
        className="object-cover object-top"
      />
      {/* AI badge */}
      <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
        <Sparkles aria-hidden className="h-2.5 w-2.5" />
        AI avatar
      </span>
    </div>
    <div className="flex flex-col gap-0.5 px-0.5">
      <p className="text-[14px] font-semibold leading-tight text-app-ink">{label}</p>
      <p className="text-[12px] leading-snug text-app-muted">{role}</p>
    </div>
  </li>
);

/**
 * "Don't want to show your face?" section on the business home.
 * Shows 5 AI-generated realtor headshots as proof of what the AI avatar feature produces.
 */
export const AiAvatarSection = () => (
  <div className="flex flex-col gap-8">
    {/* Avatar gallery — horizontal scroll on mobile, 5-col grid on desktop */}
    <ul
      className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0"
      aria-label="5 sample AI-generated realtor headshots"
    >
      {AVATARS.map((avatar) => (
        <AvatarCard key={avatar.label} {...avatar} />
      ))}
    </ul>

    {/* Bottom row: note + CTA */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-md text-[14px] leading-relaxed text-app-muted">
        <span className="font-semibold text-app-ink">100% AI. Looks real.</span>{' '}
        Upload one selfie and get a professional headshot in any style — no camera, no studio, no photographer.
      </p>
      <Link
        href="/start/brand"
        className="flex w-fit items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Create my avatar
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>
  </div>
);
