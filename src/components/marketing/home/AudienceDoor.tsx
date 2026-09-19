import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import type { HomeDoor } from '../../../content/business/home';
import { MarketingImage } from '../shared/MarketingImage';

/** A big photo that is also the button: pick "realtor" or "TikTok Shop" by tapping what you want to get. */
export const AudienceDoor = ({ door, priority = false }: { door: HomeDoor; priority?: boolean }) => (
  <Link
    href={door.href}
    className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-app-sunken shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent sm:rounded-3xl dark:ring-white/10"
  >
    <MarketingImage src={door.image} sizes="(min-width: 1024px) 380px, 50vw" priority={priority} className="object-[center_20%] transition-transform duration-500 group-hover:scale-[1.03]" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden />
    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-ink shadow-sm sm:left-4 sm:top-4 sm:text-[12px]">
      <Play aria-hidden className="h-3 w-3 fill-ink" /> Videos too
    </span>
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-3 text-left text-white sm:gap-2 sm:p-6">
      <span className="font-display text-[19px] font-semibold leading-tight text-balance sm:text-[28px]">{door.label}</span>
      <span className="text-[13px] leading-snug text-white/85 sm:text-[16px]">{door.line}</span>
      <span className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-xl bg-app-accent px-3 py-2 text-[13px] font-medium text-app-accent-ink shadow-sm transition-opacity duration-200 group-hover:opacity-90 sm:mt-3 sm:px-4 sm:py-2.5 sm:text-[15px]">
        Start here <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </div>
  </Link>
);
