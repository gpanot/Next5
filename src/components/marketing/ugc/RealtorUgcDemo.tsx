import { CheckCircle2, Eye, Heart } from 'lucide-react';
import { TIKTOK_UGC, UGC_WALL } from '../../../content/business/tiktokUgc';
import { UGC } from '../../../content/business/ugc';
import { resolveTikToks, tiktokPlayerUrl } from '../../../lib/tiktok';
import { TIKTOK_MARK } from '../shared/BrandLogos';
import { UgcVideoMock } from '../offer/UgcVideoMock';
import { TikTokCard } from './TikTokCard';

const TikTokNote = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <path d={TIKTOK_MARK} fill="currentColor" />
  </svg>
);

/**
 * Realtor UGC demo: shows the transformation from a real viral TikTok
 * (with view/like stats) → the cloned version made for a specific realtor.
 * Tells the B2B story: we find what's viral, then make it for your business.
 */
export const RealtorUgcDemo = async () => {
  const videos = await resolveTikToks(TIKTOK_UGC.realtor);
  const video = videos[0] ?? null;

  return (
    <div className="flex flex-col gap-8">
      {/* Main transformation row */}
      <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-start sm:gap-6 lg:gap-10">

        {/* ── LEFT: Viral TikTok with stats badge ── */}
        <div className="flex flex-col gap-3">
          {/* Stats badge above the video */}
          <div className="flex items-center gap-4 rounded-xl bg-zinc-900 px-4 py-2.5 w-fit shadow-sm">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
              <Eye className="h-3.5 w-3.5 text-white/60" aria-hidden />
              3.9M views
            </span>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
              <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" aria-hidden />
              650K likes
            </span>
          </div>

          {/* The viral TikTok */}
          {video ? (
            <TikTokCard {...video} playerUrl={tiktokPlayerUrl(video.id)} />
          ) : (
            <UgcVideoMock video={UGC.brand.video} />
          )}
          <p className="text-[12px] text-app-muted">A real viral TikTok in your niche</p>
        </div>

        {/* ── Arrow connector ── */}
        <div className="flex items-center gap-2 sm:flex-col sm:items-center sm:pt-32">
          <svg
            viewBox="0 0 40 40"
            className="h-8 w-8 shrink-0 rotate-90 text-app-muted sm:rotate-0"
            aria-hidden
          >
            <path
              d="M8 20h20M22 14l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-app-muted sm:text-center sm:max-w-[72px]">
            We clone<br className="hidden sm:block" /> the format
          </p>
        </div>

        {/* ── RIGHT: Your business version ── */}
        <div className="flex flex-col gap-4">
          {/* Realtor identity card */}
          <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-panel px-4 py-3 shadow-sm w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/realtor-headshot.jpeg"
              alt="Realtor — your headshot goes here"
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-[14px] font-semibold leading-tight text-app-ink">Made for your business</p>
              <p className="text-[12px] leading-snug text-app-muted">Same format. Your face. Your listings.</p>
            </div>
          </div>

          {/* Generated clone video — 9:16 TikTok style */}
          <div className="relative w-[62vw] max-w-[260px] overflow-hidden rounded-2xl bg-zinc-900 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <div className="relative aspect-[9/16]">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src="/realtor-ugc-clone.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Gradient overlay */}
              <span className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" aria-hidden />
              {/* TikTok badge */}
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                <TikTokNote className="h-3 w-3" /> TikTok
              </span>
              {/* "Made by our team" label */}
              <span className="absolute inset-x-3 bottom-3 text-[12px] font-semibold leading-tight text-white">
                Your version · 20 seconds
              </span>
            </div>
          </div>
          <p className="text-[12px] text-app-muted">Cloned &amp; ready to post</p>
        </div>
      </div>

      {/* ── Quality / B2B trust note ── */}
      <div className="flex items-start gap-3 rounded-xl border border-app-border bg-app-panel px-5 py-4 shadow-sm max-w-2xl">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" aria-hidden />
        <p className="text-[14px] leading-relaxed text-app-ink">
          <span className="font-semibold">Carefully crafted. Not AI slop.</span>{' '}
          {UGC_WALL.craftNote}
        </p>
      </div>
    </div>
  );
};
