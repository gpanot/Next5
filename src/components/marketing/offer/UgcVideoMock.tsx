import { Heart, MessageCircle, Play, Share2 } from 'lucide-react';
import type { UgcVideoExample } from '../../../content/business/ugc';
import { MarketingImage } from '../shared/MarketingImage';
import { PhoneFrame } from '../shared/PhoneFrame';

/** A tall video post inside a phone: poster, play button, on-screen captions. No real platform UI. */
export const UgcVideoMock = ({ video, className = '' }: { video: UgcVideoExample; className?: string }) => (
  <div className={`relative mx-auto w-full max-w-[220px] sm:max-w-[260px] ${className}`}>
    <PhoneFrame>
      <div className="relative aspect-[9/16] w-full bg-app-sunken">
        <MarketingImage src={video.poster} sizes="260px" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" aria-hidden />
        <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 shadow-md" aria-hidden>
          <Play className="ml-1 h-6 w-6 fill-ink text-ink" />
        </span>
        <div className="absolute inset-x-3 top-[64%] flex flex-col items-center gap-1" aria-label={`On-screen captions: ${video.captions.join(' ')}`}>
          {video.captions.map((line) => (
            <span key={line} className="rounded-md bg-white px-2 py-0.5 text-center text-[13px] font-extrabold leading-tight text-black shadow-sm">{line}</span>
          ))}
        </div>
        <div className="absolute bottom-3 right-2 flex flex-col items-center gap-3 text-white" aria-hidden>
          <Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Share2 className="h-5 w-5" />
        </div>
        <div className="absolute bottom-3 left-3 flex flex-col gap-0.5 text-white">
          <span className="text-[12px] font-semibold">@{video.handle}</span>
          <span className="text-[11px] text-white/80">{video.duration}</span>
        </div>
      </div>
    </PhoneFrame>
    <p className="label-caps absolute -left-5 top-[18%] -rotate-[5deg] rounded-full bg-app-accent px-2.5 py-1 text-[9px] font-semibold text-app-accent-ink shadow-md sm:-left-8">Made by our team</p>
  </div>
);
