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

import { ChevronDown, Info, Pause } from 'lucide-react';
import { slideTextConfig } from '../../../remotion/slideTextConfig';
import type { SlideCamera, TextConfig } from '../../../remotion/types';
import { moveShotCamera, ShotLayers } from './ShotLayers';
import { SlideCaption } from './SlideCaption';
import { SpokenDeckCaption } from './SpokenDeckCaption';
import type { ShotEditData } from './shotFormat';
import { useNarrationAudio, type CardNarration } from './useNarrationAudio';
import { WhyDrawer } from './WhyDrawer';
import { DraggableCaption } from './DraggableCaption';
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
  /**
   * 'contain': show the whole picture (a finished slide, not 9:16), with a blurred copy of it filling the bands above
   * and below. Default 'cover' fills the card.
   */
  fit?: 'cover' | 'contain';
  /** Human label: "Electricians clip", "Product screenshot", etc. */
  mediaLabel?: string;
  /**
   * Listing photo tag this shot maps to (e.g. "exterior", "kitchen").
   * Used by the editor import flow to match the correct R2 photo.
   */
  photoTag?: string;
  /** Editor data (library asset, trim, caption position, swaps). The card reads only positionY, with captionConfig. */
  edit?: ShotEditData;
  /** Photo shots: the zoom/pan the card plays, same as its render (src/remotion/slideCamera.ts). */
  camera?: SlideCamera;
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
  /**
   * The editor's caption style (template + Text panel edits). When set, captions are drawn exactly like the render,
   * at each shot's own position. Absent = the card's own readable style (calendar, marketing).
   */
  captionConfig?: TextConfig;
  /** The top card's first shot can show: the deck may start loading the next card. */
  onReady?: () => void;
  /** The card's recorded voiceover: it plays instead of the clips' sound and sets each shot's length. */
  narration?: CardNarration | null;
  /** Paused by the deck (its play / pause button). Set: the deck owns the pause, a center tap asks it through onPausedChange. */
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /** The shot on screen changed (top card). */
  onShotChange?: (index: number) => void;
  /** Set (with captionConfig): while paused, the shot's caption drags up or down; called on release. */
  onCaptionMove?: (shot: number, positionY: number) => void;
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
  captionConfig,
  onReady,
  narration,
  paused: pausedProp,
  onPausedChange,
  onShotChange,
  onCaptionMove,
}: SwipeCardProps) {
  const isTop = position === 'top';
  const voiced = narration && narration.durations.length === shots.length ? narration : null;
  const durations: readonly number[] = voiced?.durations ?? SHOT_DURATIONS;
  const durationsRef = useRef(durations);
  useEffect(() => { durationsRef.current = durations; }, [durations]);
  // A finishing card gets its camera moves after it is on screen: the ticker reads the latest shots.
  const shotsRef = useRef(shots);
  useEffect(() => { shotsRef.current = shots; }, [shots]);

  // ── Shot player state ──────────────────────────────────────────────────────
  const [shotIdx, setShotIdx] = useState(0);
  const [pausedOwn, setPausedOwn] = useState(false);
  const paused = pausedProp ?? pausedOwn;
  // The tap handler is memoized: it reads the latest pause through this ref.
  const togglePauseRef = useRef(() => {});
  useEffect(() => {
    togglePauseRef.current = () => {
      if (pausedProp === undefined) setPausedOwn(!paused);
      onPausedChange?.(!paused);
    };
  });
  // The player waits for the first shot's picture or clip, so a card never runs on a blank frame.
  const [ready, setReady] = useState(false);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const markReady = useCallback(() => {
    setReady(true);
    onReadyRef.current?.();
  }, []);
  const rafRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef(0);
  const shotIdxRef = useRef(0);

  // Keep ref in sync with state (RAF closure reads ref, not state)
  useEffect(() => { shotIdxRef.current = shotIdx; }, [shotIdx]);
  const onShotChangeRef = useRef(onShotChange);
  useEffect(() => { onShotChangeRef.current = onShotChange; }, [onShotChange]);
  useEffect(() => { if (isTop) onShotChangeRef.current?.(shotIdx); }, [isTop, shotIdx]);

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
        const dur = durationsRef.current[i] ?? 4;
        b.style.width = Math.min(100, (elapsedRef.current / dur) * 100) + '%';
      }
    });
  }

  // RAF ticker — only runs when this card is top
  useEffect(() => {
    if (!isTop) return;

    const tick = (now: number) => {
      if (lastTsRef.current === 0) lastTsRef.current = now;
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;

      const isDrawerOpen = whyOpenRef.current;
      if (ready && !paused && !externalPause && !isDrawerOpen) {
        elapsedRef.current += dt;
        const dur = durationsRef.current[shotIdxRef.current] ?? 4;
        if (elapsedRef.current >= dur) {
          elapsedRef.current = 0;
          const next = (shotIdxRef.current + 1) % shots.length;
          shotIdxRef.current = next;
          setShotIdx(next);
        }
      }
      setBarsFromRef();
      // Photo shots move like the render: same zoom/pan at the same point of the shot.
      moveShotCamera(cardRef.current, shotsRef.current, shotIdxRef.current, elapsedRef.current / (durationsRef.current[shotIdxRef.current] ?? 4));
      rafRef.current = requestAnimationFrame(tick);
    };

    lastTsRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTop, paused, externalPause, ready]);

  function jumpShot(delta: number) {
    const next = Math.max(0, Math.min(shots.length - 1, shotIdxRef.current + delta));
    elapsedRef.current = 0;
    shotIdxRef.current = next;
    setShotIdx(next);
  }

  // ── "Why this?" drawer ────────────────────────────────────────────────────
  const [whyOpen, setWhyOpen] = useState(false);
  const whyOpenRef = useRef(false);

  // ── Voiceover: a new one starts the card over, so the hook line plays on the hook ──
  const voiceUrl = voiced?.url;
  const [startedFor, setStartedFor] = useState(voiceUrl);
  if (startedFor !== voiceUrl) {
    setStartedFor(voiceUrl);
    setShotIdx(0);
  }
  useEffect(() => {
    elapsedRef.current = 0;
    shotIdxRef.current = 0;
  }, [voiceUrl]);
  useNarrationAudio({ narration: voiced, shotIdx, elapsedRef, playing: isTop && ready && !paused && !externalPause && !whyOpen, muted: !soundOn });

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
      togglePauseRef.current();
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
  const spokenWords = isTop ? voiced?.words?.[displayedShotIdx] : undefined;
  const captionMove = isTop && paused && onCaptionMove ? (y: number) => onCaptionMove(displayedShotIdx, y) : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
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
          // cqw units for SlideCaption: caption sizes scale with the card width like the render.
          ...(captionConfig ? { containerType: 'inline-size' } : {}),
        } as React.CSSProperties}
      >
        {/* ── Shot backgrounds: every shot stacked and loaded ahead, one shown ── */}
        <ShotLayers
          shots={shots}
          index={displayedShotIdx}
          // The top card loads its first shot alone, so it is not slowed by the other clips.
          loadAll={position === 'back1' || (isTop && ready)}
          playing={isTop}
          muted={!soundOn || !isTop || paused || externalPause || Boolean(voiced)}
          fallback={(i) => tint(hue, i)}
          onFirstReady={markReady}
        />

        {/* ── Loading: the first shot is not on screen yet ─────────────────── */}
        {isTop && !ready && (
          <div role="status" aria-label="Loading video" className="pointer-events-none absolute inset-0 z-[3] grid place-items-center bg-black/25">
            <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
          </div>
        )}

        {/* ── Progress bars ───────────────────────────────────────────────── */}
        {isTop && (
          <div
            ref={barsRef}
            className="absolute left-3 right-3 top-3 z-[3] flex gap-1"
            aria-hidden
          >
            {durations.map((dur, i) => (
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
        {/* A voiced card shows what the voice says, as it says it. Keyed by shot so each line starts fresh. */}
        {/* Paused, the caption moves up or down: a voiced card's spoken line on screen shows whole, else the shot's line. */}
        {displayedShot && captionConfig && (spokenWords ? (
          <SpokenDeckCaption key={`${voiceUrl}-${displayedShotIdx}`} words={spokenWords} config={slideTextConfig(captionConfig, displayedShotIdx, shots.length)} positionY={displayedShot.edit?.positionY} elapsedRef={elapsedRef} onMove={captionMove} />
        ) : captionMove ? (
          <DraggableCaption key={displayedShotIdx} text={displayedShot.text} config={slideTextConfig(captionConfig, displayedShotIdx, shots.length)} positionY={displayedShot.edit?.positionY} onMove={captionMove} />
        ) : (
          <SlideCaption text={displayedShot.text} config={slideTextConfig(captionConfig, displayedShotIdx, shots.length)} positionY={displayedShot.edit?.positionY} />
        ))}
        {displayedShot && !captionConfig && (
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

        {/* ── Why toggle button (only on top card, small, in the bottom-right corner off the captions) ── */}
        {isTop && whyPanel && (
          <button
            type="button"
            data-no-swipe
            aria-expanded={whyOpen}
            aria-controls="why-drawer"
            onClick={(e) => { e.stopPropagation(); toggleWhy(); }}
            className={[
              'absolute bottom-3 right-3 z-[5] inline-flex h-7 items-center gap-1 rounded-full border px-2.5',
              'text-[11px] font-semibold transition-colors',
              whyOpen
                ? 'border-[var(--ink,#000)] bg-[var(--ink,#000)] text-white'
                : 'border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)]',
            ].join(' ')}
          >
            <Info aria-hidden className="h-3 w-3 shrink-0" />
            Why this?
            <ChevronDown
              aria-hidden
              className={['h-2.5 w-2.5 shrink-0 transition-transform', whyOpen ? 'rotate-180' : ''].join(' ')}
            />
          </button>
        )}
      </div>
      {/* ── "Why this?" drawer: slides up over the card, outside it so it can be wider ── */}
      {isTop && whyPanel && <WhyDrawer data={whyPanel} open={whyOpen} onClose={toggleWhy} />}
    </>
  );
}
