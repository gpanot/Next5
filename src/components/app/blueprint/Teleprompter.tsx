'use client';

import { Minus, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { teleprompterItems } from '../../../lib/blueprint/text';
import type { BlueprintFormat, Script } from '../../../lib/scriptGenerator/types';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll';
import { RECORD } from './planCopy';
import { useAutoScroll } from './useAutoScroll';
import { useWakeLock } from './useWakeLock';

const SIZE_MIN = 20;
const SIZE_MAX = 72;
const SIZE_STEP = 4;

const IconButton = ({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="flex h-11 w-11 items-center justify-center rounded-xl border border-app-line text-app-ink transition-colors duration-200 hover:bg-app-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:opacity-40"
  >
    {children}
  </button>
);

type Props = { script: Script; format: BlueprintFormat; onClose: () => void };

/** Record mode: full screen, large text, auto scroll. Closes with the button or Escape. */
export const Teleprompter = ({ script, format, onClose }: Props) => {
  const root = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(36);
  const [speed, setSpeed] = useState(4);
  const items = useMemo(() => teleprompterItems(script, format), [script, format]);
  const { playing, toggle, toTop } = useAutoScroll(body, speed);
  useLockBodyScroll(true);
  useFocusTrap(root, true);
  useWakeLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label={script.title} className="fixed inset-0 z-50 flex flex-col bg-app-bg pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] text-app-ink">
      <div className="flex flex-wrap items-center gap-2 border-b border-app-line px-4 py-2">
        <IconButton label={RECORD.smaller} onClick={() => setSize((s) => Math.max(SIZE_MIN, s - SIZE_STEP))} disabled={size <= SIZE_MIN}><Minus className="h-4 w-4" /></IconButton>
        <IconButton label={RECORD.larger} onClick={() => setSize((s) => Math.min(SIZE_MAX, s + SIZE_STEP))} disabled={size >= SIZE_MAX}><Plus className="h-4 w-4" /></IconButton>
        <label className="flex min-h-11 items-center gap-2 text-[13px] text-app-muted">
          {RECORD.speed}
          <input type="range" min={1} max={10} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-24 accent-current" />
          <span className="w-4 tabular-nums">{speed}</span>
        </label>
        <button type="button" onClick={toggle} className="flex min-h-11 items-center gap-2 rounded-xl bg-app-cta px-4 text-[14px] font-medium text-app-cta-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent">
          {playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
          {playing ? RECORD.pause : RECORD.start}
        </button>
        <IconButton label={RECORD.restart} onClick={toTop}><RotateCcw className="h-4 w-4" /></IconButton>
        <span className="flex-1" />
        <IconButton label={RECORD.close} onClick={onClose}><X className="h-5 w-5" /></IconButton>
      </div>
      <div ref={body} className="flex-1 overflow-y-auto px-5 sm:px-8">
        <div className="mx-auto max-w-[900px] py-[30vh]" style={{ fontSize: `${size}px` }}>
          {items.map((item, i) => (
            <div key={i} className="mb-[1.1em]">
              <span className="mb-1 block text-[12px] font-bold uppercase tracking-widest text-app-accent">{item.tag}</span>
              <p className="break-words font-semibold leading-snug">{item.text}</p>
              {item.note && <p className="mt-1 text-[0.5em] font-medium text-app-muted">{item.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
