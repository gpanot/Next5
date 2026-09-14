'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { SHOP } from '../../../content/business/marketing';
import { useRevealPointer } from '../../../hooks/useRevealPointer';
import { hasManifestImage } from '../../../lib/manifest';
import { Chip } from '../../ui/Chip';
import { MarketingImage } from '../shared/MarketingImage';

/** Compare the product photo with the on-model result: hover (desktop), horizontal slide (mobile — vertical still scrolls), or arrow keys. */
export const BeforeAfterSlider = () => {
  const samples = SHOP.slider.filter((s) => hasManifestImage(s.before) && hasManifestImage(s.after));
  const [activeId, setActiveId] = useState(samples[0]?.id ?? '');
  const frame = useRef<HTMLDivElement>(null);
  const { position, setPosition, holding, touched, onPointerMove } = useRevealPointer(frame);
  const sample = samples.find((s) => s.id === activeId) ?? samples[0];

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 5));
    if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 5));
  };

  if (!sample) return null;

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={frame}
        role="slider"
        tabIndex={0}
        aria-label="Compare product photo and on-model photo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onPointerMove={onPointerMove}
        onKeyDown={onKey}
        onContextMenu={(e) => e.preventDefault()}
        className="relative aspect-[4/5] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden [-webkit-touch-callout:none] [&_img]:pointer-events-none rounded-3xl bg-app-sunken shadow-sm ring-1 ring-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent dark:ring-white/10"
      >
        <MarketingImage key={`a-${sample.id}`} src={sample.after} sizes="(min-width: 1024px) 45vw, 100vw" priority />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <MarketingImage key={`b-${sample.id}`} src={sample.before} sizes="(min-width: 1024px) 45vw, 100vw" priority />
        </div>
        <span className="label-caps absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[9px] font-medium text-white">Your photo</span>
        <span className="label-caps absolute right-3 top-3 rounded-full bg-app-accent px-2.5 py-1 text-[9px] font-medium text-app-accent-ink">Next5</span>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${position}%` }}>
          <span className={`absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[13px] text-[#1f1c19] shadow-md transition-transform duration-200 ${holding ? 'scale-125' : ''}`}>↔</span>
        </div>
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-3 py-1.5 text-[12px] text-white transition-opacity duration-300 motion-reduce:transition-none ${touched ? 'opacity-0' : 'opacity-100'}`}
        >
          <span className="pointer-coarse:hidden">Move your mouse across the photo</span>
          <span className="hidden pointer-coarse:inline">Slide left or right to compare</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Choose a sample">
        {samples.map((s) => (
          <Chip key={s.id} selected={s.id === sample.id} onClick={() => setActiveId(s.id)}>{s.label}</Chip>
        ))}
        <span className="ml-auto text-[12px] text-app-muted">Sample made with Next5</span>
      </div>
    </div>
  );
};
