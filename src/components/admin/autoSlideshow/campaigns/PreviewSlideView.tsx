'use client';

import type { PreviewSlide } from './previewSlides';

/** The TikTok caption look: white text with a thin black outline. */
const OUTLINE = '[text-shadow:2px_2px_0_#000,-2px_-2px_0_#000,2px_-2px_0_#000,-2px_2px_0_#000,0_3px_12px_rgba(0,0,0,0.55)]';
const SOFT = '[text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_0_10px_rgba(0,0,0,0.6)]';

/** The slide's text in its look, sized to the frame (cqw: share of the frame's width, as the 1080 px render). */
function DraftText({ slide }: { slide: Extract<PreviewSlide, { kind: 'draft' }> }) {
  const placeholder = slide.role === 'hook' ? 'Your hook line' : 'Your headline';
  const title = slide.title || placeholder;
  const dim = slide.title ? '' : 'opacity-50';
  const look = slide.role === 'item' ? 'default' : slide.look;
  if (slide.role === 'hook' && look === 'default') {
    return <p className={`text-center text-[length:7.5cqw] leading-[1.15] font-extrabold text-white ${OUTLINE} ${dim}`}>{title}</p>;
  }
  const body = slide.body && <p className={`mt-[2cqw] text-center text-[length:4.4cqw] leading-snug font-semibold text-white ${SOFT}`}>{slide.body}</p>;
  if (look === 'tiktok-red') {
    return (
      <div className="flex flex-col items-center">
        <p className={`text-center text-[length:6.5cqw] leading-[1.45] font-extrabold ${dim}`}>
          <span className="rounded-[1cqw] bg-[#fe2c55] box-decoration-clone px-[2cqw] py-[0.4cqw] text-white">{title}</span>
        </p>
        {body}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <p className={`rounded-[1.7cqw] bg-white px-[3cqw] py-[1.5cqw] text-center text-[length:6cqw] leading-tight font-extrabold text-zinc-900 ${dim}`}>{title}</p>
      {body}
    </div>
  );
}

/** One 9:16 slide filling its frame: the rendered image, or the photo with the draft text on it. */
export function PreviewSlideView({ slide }: { slide: PreviewSlide }) {
  if (slide.kind === 'rendered') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />;
  }
  return (
    <div className="relative h-full w-full bg-zinc-800 [container-type:inline-size]">
      {slide.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : (
        <span className="absolute inset-x-0 bottom-[8%] text-center text-[length:3.5cqw] text-white/40">No photo yet</span>
      )}
      <div className="absolute inset-0 bg-black/[0.08]" />
      <div className="absolute inset-x-[7%] top-[34%]">
        <DraftText slide={slide} />
      </div>
    </div>
  );
}
