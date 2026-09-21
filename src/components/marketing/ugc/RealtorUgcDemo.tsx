import { CheckCircle2, Eye, Heart } from 'lucide-react';
import { TIKTOK_UGC, UGC_WALL } from '../../../content/business/tiktokUgc';
import { UGC } from '../../../content/business/ugc';
import { resolveTikToks, tiktokPlayerUrl } from '../../../lib/tiktok';
import { UgcVideoMock } from '../offer/UgcVideoMock';
import { CloneVideoPlayer } from './CloneVideoPlayer';
import { TikTokCard } from './TikTokCard';

/**
 * Realtor UGC demo — shows the transformation:
 *   Viral TikTok (with real stats) → arrow → cloned video with realtor photo inset.
 *
 * Mobile:  stacked vertically (arrow points down).
 * Desktop: side-by-side row (arrow points right).
 */
export const RealtorUgcDemo = async () => {
  const videos = await resolveTikToks(TIKTOK_UGC.realtor);
  const video = videos[0] ?? null;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Transformation row ── */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-6 lg:gap-10">

        {/* LEFT: Viral TikTok + stats badge above */}
        <div className="flex w-[62vw] max-w-[260px] flex-col gap-3 sm:w-[240px]">
          {/* Stats badge */}
          <div className="flex items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2 shadow-sm w-fit">
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-white">
              <Eye className="h-3 w-3 text-white/60" aria-hidden />
              3.9M views
            </span>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-white">
              <Heart className="h-3 w-3 fill-red-400 text-red-400" aria-hidden />
              650K likes
            </span>
          </div>

          {/* Viral TikTok card */}
          {video ? (
            <TikTokCard {...video} playerUrl={tiktokPlayerUrl(video.id)} />
          ) : (
            <UgcVideoMock video={UGC.brand.video} />
          )}
          <p className="text-[12px] text-app-muted">Viral TikTok in your niche</p>
        </div>

        {/* ── Arrow connector ──
            Mobile:  horizontal row (↓ arrow rotated 90°)
            Desktop: vertical column (→ arrow) centred at mid-card height  */}
        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-center sm:pt-28">
          <svg
            viewBox="0 0 32 32"
            className="h-6 w-6 rotate-90 text-app-muted sm:rotate-0"
            aria-hidden
            fill="none"
          >
            <path
              d="M6 16h16M16 10l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted sm:text-center sm:max-w-[56px]">
            We clone the format
          </p>
        </div>

        {/* RIGHT: Clone video with realtor photo inset */}
        <CloneVideoPlayer />
      </div>

      {/* ── Quality / B2B trust note ── */}
      <div className="flex items-start gap-3 rounded-xl border border-app-border bg-app-panel px-5 py-4 shadow-sm w-full sm:max-w-xl">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" aria-hidden />
        <p className="text-[14px] leading-relaxed text-app-ink">
          <span className="font-semibold">Carefully crafted. Not AI slop.</span>{' '}
          {UGC_WALL.craftNote}
        </p>
      </div>
    </div>
  );
};
