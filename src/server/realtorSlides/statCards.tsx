// server-only — never import from a 'use client' file.
// Market update carousel slides, 1080x1920: designed cards (no photos), one stat per slide, source on every slide.
// Content stays inside TikTok's safe area (top tabs, right rail, bottom caption).

import { ImageResponse } from 'next/og';
import { compressJpeg } from '../autoSlideshow/jpeg';
import { loadFonts } from '../autoSlideshow/render';
import { SLIDE_SIZE } from '../autoSlideshow/textPlacement';
import { shortSource, type MarketStat } from '../realtor/marketStats';

const INK = '#111111';
const PAPER = '#F6F3EE';
const ACCENT = '#D9381E';
const MUTED = '#6B6B6B';
const PAD = { top: 300, side: 96, bottom: 460 };

export type HookCard = { kind: 'hook'; city: string; weekLabel: string; count: number };
export type StatCard = { kind: 'stat'; stat: MarketStat; index: number; total: number };
export type CtaCard = { kind: 'cta'; title: string; body: string; sources: string };
export type Card = HookCard | StatCard | CtaCard;

const Frame = ({ dark, children }: { dark: boolean; children: React.ReactNode }) => (
  <div
    style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: 'Inter',
      background: dark ? INK : PAPER, color: dark ? '#FFFFFF' : INK,
      padding: `${PAD.top}px ${PAD.side}px ${PAD.bottom}px ${PAD.side}px`,
    }}
  >
    {children}
  </div>
);

const Hook = ({ c }: { c: HookCard }) => (
  <Frame dark>
    <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: ACCENT, letterSpacing: 4 }}>MARKET UPDATE</div>
    <div style={{ display: 'flex', fontSize: 112, fontWeight: 800, lineHeight: 1.02, marginTop: 28 }}>{c.city} housing market</div>
    <div style={{ display: 'flex', fontSize: 48, fontWeight: 600, marginTop: 40, color: '#CFCFCF' }}>{c.weekLabel}</div>
    <div style={{ display: 'flex', fontSize: 44, fontWeight: 600, marginTop: 80, color: '#FFFFFF' }}>{`${c.count} numbers to know this week →`}</div>
  </Frame>
);

const arrow = (change: string) => (/^[-−]|down|fell|lower|decreas/i.test(change) ? '↓' : /^\+|up|rose|higher|increas/i.test(change) ? '↑' : '');

const Stat = ({ c }: { c: StatCard }) => {
  const s = c.stat;
  const dir = arrow(s.change);
  return (
    <Frame dark={false}>
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, color: MUTED, letterSpacing: 3 }}>{`${c.index} / ${c.total}`}</div>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginTop: 24 }}>{s.name}</div>
      <div style={{ display: 'flex', fontSize: s.value.length > 9 ? 150 : 190, fontWeight: 800, lineHeight: 1, marginTop: 36, color: ACCENT }}>{s.value}</div>
      {s.change && (
        <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 32, padding: '12px 26px', borderRadius: 999, background: INK, color: '#FFFFFF', fontSize: 38, fontWeight: 600 }}>
          {`${dir ? `${dir} ` : ''}${s.change}`}
        </div>
      )}
      <div style={{ display: 'flex', fontSize: 50, fontWeight: 600, lineHeight: 1.25, marginTop: 56 }}>{s.meaning}</div>
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, marginTop: 56, color: MUTED }}>{`Source: ${shortSource(s.sourceName)} · ${s.period}`}</div>
    </Frame>
  );
};

const Cta = ({ c }: { c: CtaCard }) => (
  <Frame dark>
    <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>{c.title}</div>
    <div style={{ display: 'flex', fontSize: 50, fontWeight: 600, lineHeight: 1.25, marginTop: 44, color: '#E6E6E6' }}>{c.body}</div>
    <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 64, padding: '20px 40px', borderRadius: 999, background: ACCENT, fontSize: 48, fontWeight: 800 }}>DM “VALUE”</div>
    <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, marginTop: 72, color: '#9A9A9A' }}>{c.sources}</div>
  </Frame>
);

const nodeOf = (card: Card) => (card.kind === 'hook' ? <Hook c={card} /> : card.kind === 'stat' ? <Stat c={card} /> : <Cta c={card} />);

/** One card as a compressed 1080x1920 JPEG. */
export const renderCard = async (card: Card): Promise<Buffer> => {
  const fonts = await loadFonts();
  const response = new ImageResponse(nodeOf(card), { ...SLIDE_SIZE, fonts: fonts.length ? fonts : undefined });
  return compressJpeg(Buffer.from(await response.arrayBuffer()));
};
