// server-only — never import from a 'use client' file.
// Tip carousel slides, 1080x1920 (Evergreen, "Thinking of selling?", spotlight): designed cards, no listing photos.
// Face mode puts her Brand Cast photo on the hook and CTA cards only (§5.2); faceless mode is all type, by design.
// Content stays inside TikTok's safe area (top tabs, right rail, bottom caption).

import { ImageResponse } from 'next/og';
import { compressJpeg } from '../autoSlideshow/jpeg';
import { loadFonts } from '../autoSlideshow/render';
import { SLIDE_SIZE } from '../autoSlideshow/textPlacement';

const INK = '#111111';
const PAPER = '#F6F3EE';
const ACCENT = '#D9381E';
const MUTED = '#6B6B6B';
const PAD = { top: 300, side: 96, bottom: 460 };

export type TipHook = { kind: 'hook'; kicker: string; title: string; body: string; face: string | null };
export type TipItem = { kind: 'item'; index: number; total: number; title: string; body: string; note?: string };
export type TipCta = { kind: 'cta'; title: string; body: string; pill: string; face: string | null; signature: string | null };
export type TipCard = TipHook | TipItem | TipCta;

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

/** Face mode: her photo fills the top, the words sit on the dark lower half. */
const FaceHook = ({ c, face }: { c: TipHook; face: string }) => (
  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Inter', background: INK, color: '#FFFFFF' }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={face} alt="" width={1080} height={980} style={{ width: 1080, height: 980, objectFit: 'cover', objectPosition: 'center 25%' }} />
    <div style={{ display: 'flex', flexDirection: 'column', padding: `56px ${PAD.side}px 0 ${PAD.side}px` }}>
      <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, color: ACCENT, letterSpacing: 4 }}>{c.kicker.toUpperCase()}</div>
      <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 20 }}>{c.title}</div>
      {c.body && <div style={{ display: 'flex', fontSize: 42, fontWeight: 600, lineHeight: 1.25, marginTop: 24, color: '#CFCFCF' }}>{c.body}</div>}
    </div>
  </div>
);

const Hook = ({ c }: { c: TipHook }) =>
  c.face ? (
    <FaceHook c={c} face={c.face} />
  ) : (
    <Frame dark>
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: ACCENT, letterSpacing: 4 }}>{c.kicker.toUpperCase()}</div>
      <div style={{ display: 'flex', fontSize: 108, fontWeight: 800, lineHeight: 1.02, marginTop: 28 }}>{c.title}</div>
      {c.body && <div style={{ display: 'flex', fontSize: 48, fontWeight: 600, lineHeight: 1.25, marginTop: 40, color: '#CFCFCF' }}>{c.body}</div>}
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 600, marginTop: 80, color: '#FFFFFF' }}>Swipe →</div>
    </Frame>
  );

const Item = ({ c }: { c: TipItem }) => (
  <Frame dark={false}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 132, height: 132, borderRadius: 999, background: ACCENT, color: '#FFFFFF', fontSize: 72, fontWeight: 800 }}>
      {String(c.index)}
    </div>
    <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.06, marginTop: 48 }}>{c.title}</div>
    <div style={{ display: 'flex', fontSize: 52, fontWeight: 600, lineHeight: 1.28, marginTop: 40, color: '#2A2A2A' }}>{c.body}</div>
    <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, marginTop: 64, color: MUTED }}>{c.note ?? `${c.index} / ${c.total}`}</div>
  </Frame>
);

const Cta = ({ c }: { c: TipCta }) => (
  <Frame dark>
    {c.face && (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={c.face} alt="" width={220} height={220} style={{ width: 220, height: 220, borderRadius: 999, objectFit: 'cover', objectPosition: 'center 25%', marginBottom: 48, border: `6px solid ${ACCENT}` }} />
    )}
    <div style={{ display: 'flex', fontSize: 88, fontWeight: 800, lineHeight: 1.05 }}>{c.title}</div>
    <div style={{ display: 'flex', fontSize: 48, fontWeight: 600, lineHeight: 1.25, marginTop: 40, color: '#E6E6E6' }}>{c.body}</div>
    <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 60, padding: '20px 40px', borderRadius: 999, background: ACCENT, fontSize: 48, fontWeight: 800 }}>{c.pill}</div>
    {c.signature && <div style={{ display: 'flex', fontSize: 32, fontWeight: 600, marginTop: 56, color: '#9A9A9A' }}>{c.signature}</div>}
  </Frame>
);

const nodeOf = (card: TipCard) => (card.kind === 'hook' ? <Hook c={card} /> : card.kind === 'item' ? <Item c={card} /> : <Cta c={card} />);

/** One card as a compressed 1080x1920 JPEG. */
export const renderTipCard = async (card: TipCard): Promise<Buffer> => {
  const fonts = await loadFonts();
  const response = new ImageResponse(nodeOf(card), { ...SLIDE_SIZE, fonts: fonts.length ? fonts : undefined });
  return compressJpeg(Buffer.from(await response.arrayBuffer()));
};
