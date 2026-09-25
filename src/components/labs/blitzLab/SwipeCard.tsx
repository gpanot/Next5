'use client';

/**
 * SwipeCard — reusable swipeable 9:16 video card for the Blitz Slideshow deck.
 *
 * Closely mirrors the HTML prototype (next5-video-deck-v3.html).
 *
 * Features:
 *  - Cycles through 7 shots with an animated segmented progress bar.
 *  - Tap left 30%  → previous shot, right 30% → next shot, center → pause/resume.
 *  - Drag left/right → KEEP / SKIP stamps appear, release past threshold triggers action.
 *  - "Why this?" drawer slides up from inside the card.
 *  - Keyboard: ← skip, → keep, Space pause.
 *  - Back cards (position = back1 | back2) are static thumbnails – no player, no drag.
 *
 * Reusable: no direct import from server slideshow types.
 * The caller supplies shot data, tags and callbacks.
 */

import { ChevronDown, Info, Pause, Play, X } from 'lucide-react';
import type { ShotEditData } from './shotFormat';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// ── Fixed format constants (mirrors format.ts — client-safe copy) ─────────────

const SHOT_DURATIONS = [3, 4, 4, 4, 4, 4, 3] as const;
const SHOT_TOTAL = 26;
const SWIPE_THRESHOLD = 110;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShotView = {
  /** Shot copy line. */
  text: string;
  /** Text vertical position on the card. */
  textZone: 'top' | 'middle' | 'bottom';
  /** Text style. */
  textStyle?: 'bold' | 'box';
  /** Optional media URL (image or video). Falls back to gradient. */
  mediaUrl?: string;
  mediaKind?: 'image' | 'video';
  /** Human label: "Electricians clip", "Product screenshot", etc. */
  mediaLabel?: string;
  /**
   * Listing photo tag this shot maps to (e.g. "exterior", "kitchen").
   * Used by the editor import flow to match the correct R2 photo.
   */
  photoTag?: string;
  /** Editor-only data (library asset, trim, caption position, swaps). Ignored by the card. */
  edit?: ShotEditData;
};

export type SwipeCardTag = {
  label: string;
  /** 'audience' = white pill, 'style' = soft gray pill. Matches prototype .tag / .tag.style */
  variant?: 'audience' | 'style' | 'edited';
};

export type SwipeCardWhyPanel = {
  audience: string;
  hookStyle: string;
  hookStyleReason?: string;
  /** 5 meat story lines (pain, old way, mechanism, proof, inaction). */
  storyLines: Array<{ label: string; text: string }>;
  proofNote?: string;
  musicLabel?: string;
};

export type SwipeCardPosition = 'top' | 'back1' | 'back2';

export type SwipeCardProps = {
  shots: ShotView[];
  tags?: SwipeCardTag[];
  whyPanel?: SwipeCardWhyPanel;
  /** Card's visual position in the stack. */
  position?: SwipeCardPosition;
  /** Fallback tint hue (0–360) when no mediaUrl on a shot. */
  hue?: number;
  /** Called by the deck when a "top" card is flying out, to give exit direction. */
  exitDirection?: 'keep' | 'discard' | null;
  onKeep: () => void;
  onDiscard: () => void;
  /** Tap the card center (not a button) → open editor. */
  onOpen: () => void;
  /** Pause the shot player externally (e.g. while the editor sheet is open). */
  externalPause?: boolean;
  /** Play the clips' own sound (top card only). Controlled by the deck's sound toggle. */
  soundOn?: boolean;
  ariaLabel?: string;
};

// ── Gradient tint (fallback when no media URL) ────────────────────────────────

function tint(hue: number, shotIdx: number): string {
  const l1 = 34 + shotIdx * 4;
  const l2 = 18 + shotIdx * 3;
  return `linear-gradient(160deg,hsl(${hue} 32% ${l1}%),hsl(${(hue + 24) % 360} 38% ${l2}%))`;
}

// ── Caption style ─────────────────────────────────────────────────────────────

function captionClass(shotIdx: number): string {
  if (shotIdx === 0) return 'text-[27px]';       // hook
  if (shotIdx === 6) return 'text-[24px]';       // cta
  return 'text-[22px]';                          // meat
}

function textZoneStyle(zone: ShotView['textZone']): React.CSSProperties {
  if (zone === 'top') return { top: '17%' };
  if (zone === 'middle') return { top: '50%', transform: 'translateY(-50%)' };
  return { bottom: '17%' };
}

// ── "Why this?" drawer ────────────────────────────────────────────────────────

function WhyDrawer({ data, open, onClose }: { data: SwipeCardWhyPanel; open: boolean; onClose: () => void }) {
  return (
    <div
      role="region"
      aria-label="Why this video"
      aria-hidden={!open}
      className={[
        'absolute inset-x-0 bottom-0 z-10 overflow-auto rounded-b-[26px] rounded-t-3xl',
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
      <dl className="m-0 grid gap-x-3 gap-y-2.5 text-[14px]" style={{ gridTemplateColumns: 'auto 1fr' }}>
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
            <span className="mt-0.5 block text-[13px] text-[var(--body,#4a4b50)]">
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
                  <li key={line.label} className="text-[13px] text-[var(--body,#4a4b50)]">
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

        {/* Music */}
        {data.musicLabel && (
          <>
            <dt className="text-[var(--mute,#7c7d82)]">Music</dt>
            <dd className="m-0 text-[var(--ink,#000)]">{data.musicLabel}</dd>
          </>
        )}

        {/* Length */}
        <dt className="text-[var(--mute,#7c7d82)]">Length</dt>
        <dd className="m-0 text-[var(--ink,#000)]">26 seconds, 7 shots</dd>
      </dl>
    </div>
  );
}

// ── Main SwipeCard component ─────────────────────────────────────────────────

export function SwipeCard({
  shots,
  tags = [],
  whyPanel,
  position = 'top',
  hue = 220,
  exitDirection = null,
  onKeep,
  onDiscard,
  onOpen,
  externalPause = false,
  soundOn = false,
  ariaLabel = 'Video card',
}: SwipeCardProps) {
  const isTop = position === 'top';

  // ── Shot player state ──────────────────────────────────────────────────────
  const [shotIdx, setShotIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef(0);
  const shotIdxRef = useRef(0);

  // Keep ref in sync with state (RAF closure reads ref, not state)
  useEffect(() => { shotIdxRef.current = shotIdx; }, [shotIdx]);

  // RAF ticker — only runs when this card is top
  useEffect(() => {
    if (!isTop) return;

    const tick = (now: number) => {
      if (lastTsRef.current === 0) lastTsRef.current = now;
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;

      const isDrawerOpen = whyOpenRef.current;
      if (!paused && !externalPause && !isDrawerOpen) {
        elapsedRef.current += dt;
        const dur = SHOT_DURATIONS[shotIdxRef.current] ?? 4;
        if (elapsedRef.current >= dur) {
          elapsedRef.current = 0;
          const next = (shotIdxRef.current + 1) % shots.length;
          shotIdxRef.current = next;
          setShotIdx(next);
        }
      }
      setBarsFromRef();
      rafRef.current = requestAnimationFrame(tick);
    };

    lastTsRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTop, paused, externalPause]);

  // ── Segmented progress bar via DOM refs (avoid re-render on every frame) ───
  const barsRef = useRef<HTMLDivElement>(null);

  function setBarsFromRef() {
    const container = barsRef.current;
    if (!container) return;
    const bars = container.querySelectorAll<HTMLElement>('b');
    bars.forEach((b, i) => {
      if (i < shotIdxRef.current) {
        b.style.width = '100%';
      } else if (i > shotIdxRef.current) {
        b.style.width = '0%';
      } else {
        const dur = SHOT_DURATIONS[i] ?? 4;
        b.style.width = Math.min(100, (elapsedRef.current / dur) * 100) + '%';
      }
    });
  }

  function jumpShot(delta: number) {
    const next = Math.max(0, Math.min(shots.length - 1, shotIdxRef.current + delta));
    elapsedRef.current = 0;
    shotIdxRef.current = next;
    setShotIdx(next);
  }

  // ── "Why this?" drawer ────────────────────────────────────────────────────
  const [whyOpen, setWhyOpen] = useState(false);
  const whyOpenRef = useRef(false);

  function toggleWhy() {
    setWhyOpen((o) => {
      whyOpenRef.current = !o;
      // Resume timer when closing
      if (!o === false) lastTsRef.current = 0;
      return !o;
    });
  }

  // ── Drag state ─────────────────────────────────────────────────────────────
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const movedRef = useRef(false);

  const clampDx = Math.max(-SWIPE_THRESHOLD * 1.5, Math.min(SWIPE_THRESHOLD * 1.5, dragX));
  const keepStampOpacity = Math.max(0, Math.min(1, clampDx / SWIPE_THRESHOLD));
  const skipStampOpacity = Math.max(0, Math.min(1, -clampDx / SWIPE_THRESHOLD));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isTop) return;
    if ((e.target as HTMLElement).closest('[data-no-swipe]')) return;
    dragStartX.current = e.clientX;
    movedRef.current = false;
    setIsDragging(false);
    cardRef.current?.setPointerCapture(e.pointerId);
  }, [isTop]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 6) {
      movedRef.current = true;
      setIsDragging(true);
    }
    setDragX(dx);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const rect = cardRef.current?.getBoundingClientRect();
    dragStartX.current = null;
    setDragX(0);
    setIsDragging(false);

    if (!movedRef.current && rect) {
      // Tap zones: left 30% = prev shot, right 30% = next shot, center = pause
      const xRatio = (e.clientX - rect.left) / rect.width;
      if (xRatio < 0.3) { jumpShot(-1); return; }
      if (xRatio > 0.7) { jumpShot(1); return; }
      // Center tap: toggle pause (or open editor if dragging was not involved)
      setPaused((p) => !p);
      return;
    }

    if (dx > SWIPE_THRESHOLD) onKeep();
    else if (dx < -SWIPE_THRESHOLD) onDiscard();
  }, [onKeep, onDiscard]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exit animation ─────────────────────────────────────────────────────────
  const exitTranslate = exitDirection === 'keep' ? 140 : exitDirection === 'discard' ? -140 : 0;
  const exitRotate = exitDirection === 'keep' ? 18 : exitDirection === 'discard' ? -18 : 0;

  // ── Card transform ─────────────────────────────────────────────────────────
  const stackTransform =
    position === 'back1' ? 'translateY(12px) scale(0.955)' :
    position === 'back2' ? 'translateY(24px) scale(0.91)' :
    exitDirection
      ? `translateX(${exitTranslate}%) rotate(${exitRotate}deg)`
      : isDragging
        ? `translateX(${clampDx}px) rotate(${clampDx / 22}deg)`
        : 'translateX(0) rotate(0deg)';

  const stackFilter =
    position === 'back1' ? 'brightness(0.8)' :
    position === 'back2' ? 'brightness(0.65)' :
    'none';

  const transition = exitDirection
    ? 'transform 0.32s cubic-bezier(.2,.8,.2,1), opacity 0.32s'
    : isDragging
      ? 'none'
      : 'transform 0.22s cubic-bezier(.2,.8,.2,1)';

  const currentShot = shots[shotIdx] ?? shots[0];
  const displayedShotIdx = isTop ? shotIdx : 0;
  const displayedShot = shots[displayedShotIdx] ?? shots[0];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      role={isTop ? 'article' : 'presentation'}
      tabIndex={isTop ? 0 : -1}
      aria-label={isTop ? ariaLabel : undefined}
      aria-roledescription={isTop ? 'Swipeable video card. Swipe right to keep, left to skip.' : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { dragStartX.current = null; setDragX(0); setIsDragging(false); }}
      className="absolute inset-0 overflow-hidden rounded-[26px] bg-[#222] shadow-[0_22px_50px_-26px_rgba(0,0,0,.5)]"
      style={{
        cursor: isTop ? (isDragging ? 'grabbing' : 'grab') : 'default',
        transform: stackTransform,
        filter: stackFilter,
        transition,
        opacity: exitDirection ? 0 : 1,
        transformOrigin: '50% 90%',
        willChange: 'transform',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: position === 'top' ? 2 : position === 'back1' ? 1 : 0,
      }}
    >
      {/* ── Shot background ─────────────────────────────────────────────── */}
      {displayedShot?.mediaUrl ? (
        displayedShot.mediaKind === 'video' ? (
          <video
            key={displayedShot.mediaUrl}
            src={displayedShot.mediaUrl}
            autoPlay muted={!soundOn || !isTop || paused || externalPause} loop playsInline
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={displayedShot.mediaUrl}
            src={displayedShot.mediaUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        )
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: tint(hue, displayedShotIdx) }}
          aria-hidden
        />
      )}

      {/* Video scanline shimmer for video shots */}
      {displayedShot?.mediaKind === 'video' && isTop && (
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage: 'repeating-linear-gradient(115deg,transparent 0 22px,rgba(255,255,255,.07) 22px 23px)',
            animation: 'drift 6s linear infinite',
          }}
        />
      )}

      {/* ── Progress bars ───────────────────────────────────────────────── */}
      {isTop && (
        <div
          ref={barsRef}
          className="absolute left-3 right-3 top-3 z-[3] flex gap-1"
          aria-hidden
        >
          {SHOT_DURATIONS.map((dur, i) => (
            <i
              key={i}
              className="relative h-[3px] flex-none overflow-hidden rounded-full bg-white/35"
              style={{ flex: dur }}
            >
              <b className="absolute inset-0 w-0 rounded-full bg-white transition-none" />
            </i>
          ))}
        </div>
      )}

      {/* ── Caption ─────────────────────────────────────────────────────── */}
      {displayedShot && (
        <div
          className={[
            'absolute left-5 right-5 z-[1] text-center font-extrabold leading-[1.15] tracking-[-0.01em] text-white',
            captionClass(displayedShotIdx),
            // bold text shadow
            'drop-shadow-[0_0_2px_#000] drop-shadow-[0_2px_10px_rgba(0,0,0,.55)]',
          ].join(' ')}
          style={textZoneStyle(displayedShot.textZone)}
        >
          {displayedShot.textStyle === 'box' ? (
            <span className="rounded-md bg-white px-2 py-0.5 text-black [box-decoration-break:clone] [line-height:1.55]">
              {displayedShot.text}
            </span>
          ) : (
            <span>{displayedShot.text}</span>
          )}
        </div>
      )}

      {/* ── Pause overlay ───────────────────────────────────────────────── */}
      {isTop && paused && (
        <div className="pointer-events-none absolute inset-0 z-[3] grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/50 text-white">
            <Pause aria-hidden className="h-6 w-6" />
          </span>
        </div>
      )}

      {/* ── KEEP stamp ──────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[18px] top-[70px] z-[4] -rotate-[10deg] rounded-xl border-[3px] border-[var(--ready,#1e8049)] bg-white/[0.94] px-[14px] py-[6px] text-[26px] font-black text-[var(--ready,#1e8049)] opacity-0 transition-none"
        style={{ opacity: keepStampOpacity }}
      >
        KEEP
      </div>

      {/* ── SKIP stamp ──────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[18px] top-[70px] z-[4] rotate-[10deg] rounded-xl border-[3px] border-[#555] bg-white/[0.94] px-[14px] py-[6px] text-[26px] font-black text-[#555] opacity-0 transition-none"
        style={{ opacity: skipStampOpacity }}
      >
        SKIP
      </div>

      {/* ── "Why this?" drawer (slides up from inside the card) ─────────── */}
      {isTop && whyPanel && (
        <WhyDrawer data={whyPanel} open={whyOpen} onClose={toggleWhy} />
      )}

      {/* ── Why toggle button (only on top card, inside card near bottom) ── */}
      {isTop && whyPanel && (
        <button
          type="button"
          data-no-swipe
          aria-expanded={whyOpen}
          aria-controls="why-drawer"
          onClick={(e) => { e.stopPropagation(); toggleWhy(); }}
          className={[
            'absolute bottom-[68px] right-3 z-[5] inline-flex h-8 items-center gap-1.5 rounded-full border px-3',
            'text-[13px] font-semibold transition-colors',
            whyOpen
              ? 'border-[var(--ink,#000)] bg-[var(--ink,#000)] text-white'
              : 'border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)]',
          ].join(' ')}
        >
          <Info aria-hidden className="h-3.5 w-3.5 shrink-0" />
          Why this?
          <ChevronDown
            aria-hidden
            className={['h-3 w-3 shrink-0 transition-transform', whyOpen ? 'rotate-180' : ''].join(' ')}
          />
        </button>
      )}
    </div>
  );
}
