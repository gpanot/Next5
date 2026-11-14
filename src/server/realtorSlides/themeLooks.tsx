// server-only — never import from a 'use client' file.
// The text layer of each realtor slide theme (src/lib/slideThemes.ts), drawn by Satori over a full-bleed listing photo
// at 1080x1920. Every block stays inside TikTok's safe zone: below its top bar, above its caption, off its right rail.

import type { ReactNode } from 'react';
import type { SlideTheme } from '../../lib/slideThemes';

const SIDE = 147;
/** The lowest a text block may reach: TikTok's caption and buttons sit under it. */
const BOTTOM = 1560;

export type ThemeSlide = {
  role: 'hook' | 'item' | 'cta';
  title: string;
  body: string;
  /** Small caps tag over the title: "JUST LISTED", "ROOM 2", "BOOK A TOUR". */
  label: string;
  /** 1-based item number; null on the hook and CTA. */
  number: number | null;
  index: number;
  total: number;
};

const col = (style: object = {}) => ({ display: 'flex', flexDirection: 'column', ...style }) as const;
/** A size for the title, smaller when it runs long. */
const fit = (title: string, size: number) => Math.round(title.length > 44 ? size * 0.8 : title.length > 30 ? size * 0.9 : size);
const titleSize = (s: ThemeSlide, hook: number, rest: number) => fit(s.title, s.role === 'hook' ? hook : rest);
const SHADOW = '0 2px 8px rgba(0,0,0,0.85), 0 0 22px rgba(0,0,0,0.5)';

const Body = ({ text, style }: { text: string; style: object }) => (text ? <div style={{ display: 'flex', ...style }}>{text}</div> : null);

/** Serif title on a dark fade over the lower part, left aligned, an italic "No. 2" on items. */
const editorial = (s: ThemeSlide): ReactNode => (
  <div style={col({ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1150, justifyContent: 'flex-end', padding: `0 ${SIDE}px ${1920 - BOTTOM}px 90px`, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.8) 100%)' })}>
    <div style={{ display: 'flex', fontFamily: 'Playfair Display', fontStyle: 'italic', fontWeight: 700, fontSize: 52, color: '#F4D9A6', marginBottom: 8 }}>{s.number ? `No. ${s.number}` : s.label.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</div>
    <div style={{ display: 'flex', fontFamily: 'Playfair Display', fontWeight: 700, fontSize: titleSize(s, 88, 72), color: '#fff', lineHeight: 1.08 }}>{s.title}</div>
    <Body text={s.body} style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 40, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, marginTop: 26 }} />
  </div>
);

/** A cream band across the top with ink type, the photo below it. */
const colorBand = (s: ThemeSlide): ReactNode => (
  <div style={col({ position: 'absolute', top: 0, left: 0, right: 0, background: '#F2EBDD', padding: `330px ${SIDE}px 56px 80px`, borderBottom: '10px solid #1F3A2E' })}>
    <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 600, fontSize: 30, color: '#1F3A2E', letterSpacing: 3, marginBottom: 16 }}>{s.label}</div>
    <div style={{ display: 'flex', fontFamily: 'Playfair Display', fontWeight: 700, fontSize: titleSize(s, 76, 64), color: '#16241D', lineHeight: 1.08 }}>{s.title}</div>
    <Body text={s.body} style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 38, color: '#3B4A42', lineHeight: 1.35, marginTop: 18 }} />
  </div>
);

/** A white rounded note card with a soft shadow and a small counter. */
const paperCard = (s: ThemeSlide): ReactNode => (
  <div style={col({ position: 'absolute', top: 520, left: 110, right: 160, background: '#FFFDF8', borderRadius: 40, padding: '52px 56px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' })}>
    <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 600, fontSize: 30, color: '#B4532A', letterSpacing: 2, marginBottom: 18 }}>{s.label}</div>
    <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: titleSize(s, 70, 60), color: '#1A1A1A', lineHeight: 1.1, letterSpacing: -1 }}>{s.title}</div>
    <Body text={s.body} style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 38, color: '#4A4A4A', lineHeight: 1.35, marginTop: 22 }} />
  </div>
);

const DarkBox = ({ s, align }: { s: ThemeSlide; align: 'left' | 'center' }) => (
  <div style={col({ background: 'rgba(17,17,17,0.82)', borderRadius: 28, padding: '30px 38px', alignItems: align === 'center' ? 'center' : 'flex-start' })}>
    <div style={{ display: 'flex', fontFamily: 'Archivo Black', fontSize: titleSize(s, 74, 60), color: '#fff', lineHeight: 1.08, textAlign: align }}>{s.title}</div>
    <Body text={s.body} style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 38, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3, marginTop: 16, textAlign: align }} />
  </div>
);

/** A big yellow 01, 02… over a dark box on items; the hook and CTA in the dark box alone. */
const bigNumber = (s: ThemeSlide): ReactNode => (
  <div style={col({ position: 'absolute', top: s.number ? 470 : 560, left: s.number ? SIDE - 30 : SIDE, right: SIDE, alignItems: s.number ? 'flex-start' : 'center' })}>
    {s.number && <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 260, lineHeight: 0.95, color: '#FFD23F', textShadow: '0 4px 0 rgba(0,0,0,0.35), 0 8px 40px rgba(0,0,0,0.5)' }}>{String(s.number).padStart(2, '0')}</div>}
    <DarkBox s={s} align={s.number ? 'left' : 'center'} />
  </div>
);

/** Tall condensed capitals, the longest word in yellow. */
const poster = (s: ThemeSlide): ReactNode => {
  const words = s.title.toUpperCase().split(/\s+/).filter(Boolean);
  const accent = words.reduce((best, w, i) => (w.length > words[best]!.length ? i : best), 0);
  return (
    <div style={col({ position: 'absolute', top: 480, left: SIDE, right: SIDE, alignItems: 'center' })}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', fontFamily: 'Anton', fontSize: titleSize(s, 128, 108), lineHeight: 1.0, textShadow: '0 4px 24px rgba(0,0,0,0.55)' }}>
        {words.map((w, i) => <span key={i} style={{ color: i === accent ? '#FFD23F' : '#fff', marginRight: 22 }}>{w}</span>)}
      </div>
      <Body text={s.body} style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 40, color: '#fff', lineHeight: 1.3, marginTop: 30, textAlign: 'center', textShadow: SHADOW }} />
    </div>
  );
};

/** A dark see-through panel in the lower middle with a progress bar. */
const glass = (s: ThemeSlide): ReactNode => (
  <div style={col({ position: 'absolute', top: 980, left: 70, right: 170, background: 'rgba(12,12,14,0.66)', border: '2px solid rgba(255,255,255,0.18)', borderRadius: 36, padding: '42px 48px' })}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 26 }}>
      {Array.from({ length: s.total }, (_, i) => <div key={i} style={{ display: 'flex', width: Math.min(46, Math.floor(700 / s.total) - 8), height: 8, borderRadius: 4, background: i <= s.index ? '#fff' : 'rgba(255,255,255,0.28)' }} />)}
    </div>
    <div style={{ display: 'flex', fontFamily: 'DM Sans', fontWeight: 700, fontSize: titleSize(s, 66, 56), color: '#fff', lineHeight: 1.12 }}>{s.title}</div>
    <Body text={s.body} style={{ fontFamily: 'DM Sans', fontWeight: 500, fontSize: 36, color: 'rgba(255,255,255,0.82)', lineHeight: 1.35, marginTop: 18 }} />
  </div>
);

/** Themes whose white type needs a soft dark wash behind it on bright rooms. */
const WASHED: SlideTheme[] = ['poster', 'big-number'];

const Wash = () => <div style={{ position: 'absolute', top: 250, left: 0, right: 0, height: 1050, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 30%, rgba(0,0,0,0.42) 65%, rgba(0,0,0,0) 100%)' }} />;

const LOOKS: Record<Exclude<SlideTheme, 'classic'>, (s: ThemeSlide) => ReactNode> = {
  editorial,
  'color-band': colorBand,
  'paper-card': paperCard,
  'big-number': bigNumber,
  poster,
  glass,
};

/**
 * The text layer of a theme as direct children of the slide's root (wash first). Kept out of a component and fragment:
 * Satori collapses absolutely placed blocks to their narrowest width when they sit inside one.
 */
export const themeLayers = (theme: Exclude<SlideTheme, 'classic'>, slide: ThemeSlide): ReactNode[] => [
  WASHED.includes(theme) ? <Wash key="wash" /> : null,
  <div key="text" style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: 1080, height: 1920 }}>{LOOKS[theme](slide)}</div>,
];
