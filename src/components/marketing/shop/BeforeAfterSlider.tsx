'use client';

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { SHOP } from '../../../content/business/marketing';
import { hasManifestImage } from '../../../lib/manifest';
import { Chip } from '../../ui/Chip';
import { MarketingImage } from '../shared/MarketingImage';

/** Drag or use arrow keys to compare the product photo with the on-model result. */
export const BeforeAfterSlider = () => {
  const samples = SHOP.slider.filter((s) => hasManifestImage(s.before) && hasManifestImage(s.after));
  const [activeId, setActiveId] = useState(samples[0]?.id ?? '');
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const sample = samples.find((s) => s.id === activeId) ?? samples[0];

  const moveTo = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerdown') e.currentTarget.setPointerCapture(e.pointerId);
    if (e.buttons === 1 || e.type === 'pointerdown') moveTo(e.clientX);
  };

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
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onKeyDown={onKey}
        className="relative aspect-[4/5] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-3xl bg-app-sunken shadow-sm ring-1 ring-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent dark:ring-white/10"
      >
        <MarketingImage key={`a-${sample.id}`} src={sample.after} sizes="(min-width: 1024px) 45vw, 100vw" priority />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <MarketingImage key={`b-${sample.id}`} src={sample.before} sizes="(min-width: 1024px) 45vw, 100vw" priority />
        </div>
        <span className="label-caps absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[9px] font-medium text-white">Your photo</span>
        <span className="label-caps absolute right-3 top-3 rounded-full bg-app-accent px-2.5 py-1 text-[9px] font-medium text-app-accent-ink">Next5</span>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${position}%` }}>
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[13px] text-[#1f1c19] shadow-md">↔</span>
        </div>
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
