'use client';

import { Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { AppButton } from '../../ui/AppButton';
import { Sheet } from '../../ui/Sheet';

export type PlaybookPreview = {
  title: string;
  format: 'slideshow' | 'listing_video';
  videoUrl: string | null;
  slideUrls: string[];
  caption: string | null;
};

type Props = { post: PlaybookPreview; onClose: () => void };

/** Slides swipe sideways (snap), the video plays inline; the caption copies in one tap. */
export const PlaybookPostSheet = ({ post, onClose }: Props) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!post.caption) return;
    try {
      await navigator.clipboard.writeText(post.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={post.title}>
      <div className="flex flex-col gap-4 pb-2">
        {post.videoUrl ? (
          <video src={post.videoUrl} controls playsInline className="mx-auto aspect-[9/16] max-h-[60dvh] rounded-xl bg-black" />
        ) : (
          <ul className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {post.slideUrls.map((url, i) => (
              <li key={url} className="w-[62%] shrink-0 snap-center sm:w-56">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Slide ${i + 1}`} className="aspect-[9/16] w-full rounded-xl object-cover" />
              </li>
            ))}
          </ul>
        )}

        {post.caption && (
          <div className="flex flex-col gap-2 rounded-xl bg-app-sunken p-3">
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-app-ink">{post.caption}</p>
            <AppButton variant="secondary" size="sm" className="self-start" onClick={() => void copy()} iconLeft={copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}>
              {copied ? 'Copied' : 'Copy caption'}
            </AppButton>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(post.videoUrl ? [post.videoUrl] : post.slideUrls).map((url, i, all) => (
            <a key={url} href={url} download target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-app-line px-3 text-[12px] font-medium text-app-ink transition-colors duration-200 hover:bg-app-sunken">
              <Download aria-hidden className="h-3.5 w-3.5" /> {all.length === 1 ? 'Download' : `Slide ${i + 1}`}
            </a>
          ))}
        </div>
      </div>
    </Sheet>
  );
};
