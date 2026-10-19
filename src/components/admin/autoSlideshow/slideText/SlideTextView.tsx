'use client';

import { Montserrat } from 'next/font/google';
import { TEXT_SIDE } from '../../../../config/tiktokSafeZone';
import { bodyKind, titleKind, type TextLook } from '../../../../types/slideText';

/** The All caps look's font, as the render's (Montserrat ExtraBold Italic). */
const caps = Montserrat({ subsets: ['latin'], weight: '800', style: 'italic', display: 'swap' });

/**
 * A slide's text drawn in the browser as the server render draws it (server/autoSlideshow/render.tsx), in cqw: share of
 * the frame's width, where 1cqw is 10.8 px of the 1080 px slide. The parent sets `container-type: inline-size`.
 */
export type SlideTextProps = {
  role: 'hook' | 'item' | 'cta';
  title: string;
  body: string;
  look: TextLook;
  /** The line under the headline's own look; TikTok's plain white text when unset. */
  bodyLook?: TextLook;
  /** The brand's headline box colors; white box, dark text when unset. */
  box?: { boxColor: string; boxTextColor: string };
  /** Shown dimmed while the title is empty. */
  placeholder?: string;
};

const WHITE_BOX = { boxColor: '#ffffff', boxTextColor: '#111111' };
const BLACK_BOX = { boxColor: '#111111', boxTextColor: '#ffffff' };

/** The TikTok caption look: white text with a thin black outline. */
const OUTLINE = '[text-shadow:0.28cqw_0.28cqw_0_#000,-0.28cqw_-0.28cqw_0_#000,0.28cqw_-0.28cqw_0_#000,-0.28cqw_0.28cqw_0_#000,0_0.37cqw_1.67cqw_rgba(0,0,0,0.55)]';
const SOFT = '[text-shadow:0_0.19cqw_0.37cqw_rgba(0,0,0,0.9),0_0_1.48cqw_rgba(0,0,0,0.6)]';

/** Side margin of the text block, as % of the slide width, for every look (TEXT_SIDE: TikTok's right rail covers at
 *  most 15% of the text's reach). */
export const TEXT_SIDE_PCT = TEXT_SIDE * 100;
/** Gap between the headline and the line under it (36 px), as a share of the slide's width. */
export const BODY_GAP = 36 / 1080;

/** Outlined headline size: 90 / 76 px on hooks (long ones smaller), 68 px on the CTA, 60 px on content slides. */
const outlineSize = (role: SlideTextProps['role'], text: string) => {
  if (role === 'hook') return text.length > 40 ? 'text-[length:7.037cqw]' : 'text-[length:8.333cqw]';
  return role === 'cta' ? 'text-[length:6.296cqw]' : 'text-[length:5.556cqw]';
};

/** All caps headline size: 72 / 60 px on hooks (long ones smaller), 58 px on the CTA, 52 px on content slides. */
const capsSize = (role: SlideTextProps['role'], text: string) => {
  if (role === 'hook') return text.length > 40 ? 'text-[length:5.556cqw]' : 'text-[length:6.667cqw]';
  return role === 'cta' ? 'text-[length:5.37cqw]' : 'text-[length:4.815cqw]';
};

/** The line under the headline in its own look: TikTok's plain white text, a black or white box, red behind each line,
 *  or All caps. */
export function SlideBodyView({ text, look }: { text: string; look?: TextLook }) {
  const kind = bodyKind(look);
  if (kind === 'all-caps') {
    return <p className={`${caps.className} text-center text-[length:3.519cqw] leading-[1.25] text-white ${SOFT}`}>{text.toUpperCase()}</p>;
  }
  if (kind === 'black-box' || kind === 'white-box') {
    const colors = kind === 'black-box' ? BLACK_BOX : WHITE_BOX;
    return (
      <p className="rounded-[1.296cqw] px-[2.037cqw] py-[1.111cqw] text-center text-[length:4.074cqw] leading-[1.2] font-semibold" style={{ background: colors.boxColor, color: colors.boxTextColor }}>
        {text}
      </p>
    );
  }
  if (kind === 'tiktok-red') {
    return (
      <p className="text-center text-[length:4.074cqw] leading-[1.3] font-semibold">
        <span className="rounded-[0.741cqw] bg-[#E8453C] box-decoration-clone px-[1.296cqw] text-white">{text}</span>
      </p>
    );
  }
  return <p className={`text-center text-[length:4.074cqw] leading-[1.2] font-semibold text-white ${SOFT}`}>{text}</p>;
}

/** The headline in its look: outlined TikTok text, red highlight, or a box (brand, black, white). */
export function SlideTitleView({ role, title, look, box, placeholder }: Omit<SlideTextProps, 'body' | 'bodyLook'>) {
  const shown = title || placeholder || '';
  const dim = title ? '' : 'opacity-50';
  const kind = titleKind(role, look);
  if (kind === 'tiktok-red') {
    return (
      <p className={`text-center text-[length:5.556cqw] leading-[1.3] font-extrabold ${dim}`}>
        <span className="rounded-[0.926cqw] bg-[#E8453C] box-decoration-clone px-[1.667cqw] text-white">{shown}</span>
      </p>
    );
  }
  if (kind === 'all-caps') {
    return <p className={`${caps.className} text-center ${capsSize(role, shown)} leading-[1.15] text-white ${SOFT} ${dim}`}>{shown.toUpperCase()}</p>;
  }
  if (kind === 'outline') {
    return <p className={`text-center ${outlineSize(role, shown)} leading-[1.08] font-extrabold text-white ${OUTLINE} ${dim}`}>{shown}</p>;
  }
  const colors = kind === 'white-box' ? WHITE_BOX : kind === 'black-box' ? BLACK_BOX : (box ?? WHITE_BOX);
  const size = role === 'item' ? 'text-[length:5cqw]' : 'text-[length:5.741cqw]';
  return (
    <p className={`rounded-[1.667cqw] px-[2.778cqw] py-[1.481cqw] text-center ${size} leading-[1.12] font-extrabold ${dim}`} style={{ background: colors.boxColor, color: colors.boxTextColor }}>
      {shown}
    </p>
  );
}
