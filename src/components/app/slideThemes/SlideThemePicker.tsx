'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_SLIDE_THEME, SLIDE_THEME_INFO, SLIDE_THEMES, type SlideTheme } from '../../../lib/slideThemes';
import { SlideLoopControls, SlideStack, useSlideLoop } from './SlideLoop';

type Props = {
  value: SlideTheme;
  onChange: (theme: SlideTheme) => void;
  disabled?: boolean;
};

/** Example slides per theme (public/images/slide-themes, made by scripts/tmp/theme-examples.ts): hook, 2 rooms, CTA. */
const EXAMPLE_SLIDES = 4;
const EXAMPLE_URLS = Object.fromEntries(
  SLIDE_THEMES.map((t) => [t, Array.from({ length: EXAMPLE_SLIDES }, (_, i) => `/images/slide-themes/${t}-${i + 1}.jpg`)]),
) as Record<SlideTheme, string[]>;

type CardProps = { theme: SlideTheme; active: boolean; playing: boolean; disabled?: boolean; onPick: () => void; onPlay: (play: boolean) => void };

/** One theme: its example slideshow (crossfading slides, dots, play/stop) and its name. Tapping the slide picks it. */
const ThemeCard = ({ theme, active, playing, disabled, onPick, onPlay }: CardProps) => {
  const [index, setIndex] = useSlideLoop(EXAMPLE_SLIDES, playing);
  const info = SLIDE_THEME_INFO[theme];
  return (
    <div className="flex w-[120px] shrink-0 snap-start flex-col gap-1.5 sm:w-[136px]">
      <div className={`relative aspect-[9/16] overflow-hidden rounded-xl bg-app-sunken ring-2 transition-shadow duration-200 ${active ? 'ring-app-accent' : 'ring-transparent'}`}>
        <button type="button" onClick={onPick} disabled={disabled} aria-pressed={active} aria-label={`Use the ${info.name} theme`} className="absolute inset-0 disabled:opacity-60">
          <SlideStack urls={EXAMPLE_URLS[theme]} index={index} alt={`${info.name} example`} />
        </button>
        {active && (
          <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent text-white shadow-sm">
            <Check aria-hidden className="h-3.5 w-3.5" />
          </span>
        )}
        <SlideLoopControls count={EXAMPLE_SLIDES} index={index} playing={playing} label={info.name} onIndex={setIndex} onPlay={onPlay} />
      </div>
      <button type="button" onClick={onPick} disabled={disabled} className="flex flex-col gap-0.5 text-left disabled:opacity-60">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-app-ink">
          {info.name}
          {theme === DEFAULT_SLIDE_THEME && <span className="rounded-md bg-app-accent-soft px-1.5 py-px text-[10px] font-medium text-app-accent">Default</span>}
        </span>
        <span className="text-[11px] leading-snug text-app-muted">{info.line}</span>
      </button>
    </div>
  );
};

/** The slideshow look, picked from example slideshows (one plays at a time). Scrolls sideways on phones. */
export const SlideThemePicker = ({ value, onChange, disabled }: Props) => {
  const [playing, setPlaying] = useState<SlideTheme | null>(null);
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 lg:flex-wrap lg:overflow-visible" role="group" aria-label="Slideshow theme">
      {SLIDE_THEMES.map((t) => (
        <ThemeCard key={t} theme={t} active={t === value} playing={playing === t} disabled={disabled} onPick={() => onChange(t)} onPlay={(play) => setPlaying(play ? t : null)} />
      ))}
    </div>
  );
};
