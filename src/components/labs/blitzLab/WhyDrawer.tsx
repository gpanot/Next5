'use client';

import { X } from 'lucide-react';
import type { SwipeCardWhyPanel } from './SwipeCard';

/** "Why this?" drawer: slides up over the deck card, beside it (not clipped by it). */
export function WhyDrawer({ data, open, onClose }: { data: SwipeCardWhyPanel; open: boolean; onClose: () => void }) {
  return (
    <div
      role="region"
      aria-label="Why this video"
      aria-hidden={!open}
      className={[
        // Sits beside the card (not clipped by it), 15% wider than the card; phones keep it inside the screen gutter.
        'absolute -inset-x-3 bottom-0 z-[3] overflow-auto rounded-3xl sm:-inset-x-[7.5%]',
        'bg-[var(--paper,#fff)] px-[18px] pb-4 pt-[14px] shadow-[0_-12px_30px_-16px_rgba(0,0,0,.35)]',
        'transition-[transform,opacity] duration-[260ms] cubic-[.2,.8,.2,1]',
        open ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-[105%] opacity-0 pointer-events-none',
      ].join(' ')}
      style={{ maxHeight: '82%' }}
    >
      {/* Close row */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--ink,#000)]">Why this video</span>
        <button
          type="button"
          data-no-swipe
          aria-label="Close"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-alt,#f2f0ed)] text-[var(--ink,#000)] transition-opacity hover:opacity-70"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <dl className="m-0 grid gap-x-3 gap-y-2 text-[12.5px] leading-snug" style={{ gridTemplateColumns: 'auto 1fr' }}>
        {/* Audience */}
        <dt className="text-[var(--mute,#7c7d82)]">Made for</dt>
        <dd className="m-0 text-[var(--ink,#000)]">
          {data.audience}
        </dd>

        {/* Hook style */}
        <dt className="text-[var(--mute,#7c7d82)]">Hook</dt>
        <dd className="m-0 text-[var(--ink,#000)]">
          {data.hookStyle}
          {data.hookStyleReason && (
            <span className="mt-0.5 block text-[12px] text-[var(--body,#4a4b50)]">
              {data.hookStyleReason}
            </span>
          )}
        </dd>

        {/* Story lines */}
        {data.storyLines.length > 0 && (
          <>
            <dt className="text-[var(--mute,#7c7d82)]">Story</dt>
            <dd className="m-0">
              <ol className="m-0 flex list-none flex-col gap-[3px] p-0">
                {data.storyLines.map((line) => (
                  <li key={line.label} className="text-[12px] text-[var(--body,#4a4b50)]">
                    <b className="font-semibold text-[var(--ink,#000)]">{line.label}</b>: {line.text}
                  </li>
                ))}
              </ol>
            </dd>
          </>
        )}

        {/* Proof */}
        {data.proofNote && (
          <>
            <dt className="text-[var(--mute,#7c7d82)]">Proof</dt>
            <dd className="m-0 text-[var(--ink,#000)]">{data.proofNote}</dd>
          </>
        )}


        {/* Length */}
        <dt className="text-[var(--mute,#7c7d82)]">Length</dt>
        <dd className="m-0 text-[var(--ink,#000)]">26 seconds, 7 shots</dd>
      </dl>
    </div>
  );
}
