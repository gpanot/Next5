import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import type { ExamplePost } from '../../../content/business/offer';
import { ScoreBadge } from '../../app/postKit/ScoreBadge';
import { MarketingImage } from '../shared/MarketingImage';
import { PhoneFrame } from '../shared/PhoneFrame';

/** A generic social post inside a phone: the photo, its score, and the written hook + hashtags. No real platform UI. */
export const PostPhoneMock = ({ post, handle, priority = false }: { post: ExamplePost; handle: string; priority?: boolean }) => (
  <div className="relative mx-auto w-full max-w-[230px] sm:max-w-[300px]">
    <PhoneFrame>
      <div className="flex flex-col pt-8">
        <div className="flex items-center gap-2 px-3 pb-2">
          <span className="h-6 w-6 rounded-full bg-app-accent-soft ring-1 ring-app-line" aria-hidden />
          <span className="text-[12px] font-semibold text-app-ink">{handle}</span>
        </div>
        <div className="relative aspect-[4/5] w-full bg-app-sunken">
          <MarketingImage src={post.image} sizes="300px" priority={priority} />
          <ScoreBadge score={post.score} className="absolute left-2 top-2" />
        </div>
        <div className="flex gap-3 px-3 pt-2 text-app-ink" aria-hidden>
          <Heart className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><Bookmark className="ml-auto h-4 w-4" />
        </div>
        <div className="flex flex-col gap-1 px-3 pb-4 pt-1.5">
          <p className="text-[12px] font-semibold leading-snug text-app-ink">{post.hook}</p>
          <p className="line-clamp-2 text-[11px] leading-snug text-app-muted">{post.caption}</p>
          <p className="line-clamp-1 text-[11px] text-app-accent">{post.hashtags.join(' ')}</p>
        </div>
      </div>
    </PhoneFrame>
    {post.before && (
      <figure className="absolute -left-8 top-[42%] w-[36%] rotate-[-5deg] rounded-xl bg-white p-1.5 shadow-md ring-1 ring-black/5 sm:-left-10">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-app-sunken">
          <MarketingImage src={post.before} sizes="110px" alt="The product photo the seller took" />
        </div>
        <figcaption className="label-caps pt-1 text-center text-[8px] font-medium text-muted">Your photo</figcaption>
      </figure>
    )}
    <p className="label-caps absolute -right-6 top-[58%] rotate-[4deg] rounded-full bg-app-cta px-2.5 py-1 text-[9px] font-semibold text-app-cta-ink shadow-md sm:-right-8">Written for you</p>
  </div>
);
