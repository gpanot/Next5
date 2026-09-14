import type { ExamplePost } from '../../../content/business/offer';
import { ScoreCard } from '../../app/postKit/ScoreCard';
import { MarketingImage } from '../shared/MarketingImage';

const Block = ({ label, text }: { label: string; text: string }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8178]">{label}</p>
    <p className="whitespace-pre-line text-[15px] leading-snug text-[#1f1c19]">{text}</p>
  </div>
);

/** One example photo with its real product UI: Scroll-Stop Score and Post Kit. Marked as an example. */
export const WhatYouGet = ({ post, shop }: { post: ExamplePost; shop: boolean }) => (
  <div className="grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
    <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl bg-app-sunken shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <MarketingImage src={post.image} sizes="(min-width: 1024px) 30vw, 90vw" caption="Example photo" />
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <ScoreCard score={post.score} details={post.details} />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-[13px] font-medium text-[#6b635a]">Post Kit</p>
        <Block label="Hook" text={post.hook} />
        <Block label="Caption" text={post.caption} />
        <Block label="Hashtags" text={post.hashtags.join(' ')} />
        {shop && post.description && <Block label="Product description" text={post.description} />}
      </div>
    </div>
  </div>
);
