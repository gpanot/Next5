/** Timeline of the 32s showreel, in seconds. */
export const T = { words: 0.2, sub: 1.7, cards: 3, scrollEnd: 10, spots: [10, 16.2, 22.4], dim: 28.2, cta: 28.8, end: 32 } as const;

/** A spotlight: scales in (0.4s), shows its post for 5s, scales out (0.4s). */
export const SPOT = { inS: 0.4, holdS: 5, outS: 0.4 } as const;

/** 9:16 stage geometry in vh (the stage is 56.25vh wide). */
export const TALL = { headH: 24, pad: 3, gap: 2, cardW: 24.125, cardH: 42.89, labelH: 6.5, rowGap: 2.5 } as const;
export const TALL_ROW = TALL.cardH + TALL.labelH + TALL.rowGap;

/** Seconds before card `i` shows on a wide stage: one every 0.45s. */
export const wideDelay = (i: number): number => T.cards + i * 0.45;

/** Seconds before card `i` shows on the tall stage: when the scroll brings its row into view. */
export const tallDelay = (i: number, rows: number): number => {
  const y = Math.floor(i / 2) * TALL_ROW;
  const dist = tallScroll(rows);
  const t = dist > 0 ? ((T.scrollEnd - T.cards) * Math.max(0, y - 55)) / dist : 0;
  return T.cards + t + (i % 2) * 0.25;
};

/** How far (vh) the tall grid scrolls so its last row ends in view. */
export const tallScroll = (rows: number): number => Math.max(0, rows * TALL_ROW + TALL.pad - (100 - TALL.headH));

export const SHOWREEL_CSS = `
@keyframes sr-word{from{opacity:0;transform:translateY(.4em);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes sr-pop{from{opacity:0;transform:scale(.86) translateY(3vh)}to{opacity:1;transform:none}}
@keyframes sr-fade{from{opacity:0}to{opacity:1}}
@keyframes sr-scroll{from{transform:translateY(0)}to{transform:translateY(var(--sr-scroll))}}
@keyframes sr-dim{to{opacity:.16;filter:blur(4px)}}
@keyframes sr-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes sr-spot-in{from{opacity:0;transform:scale(.82)}to{opacity:1;transform:none}}
@keyframes sr-spot-out{to{opacity:0;transform:scale(.82)}}
@keyframes sr-check{from{transform:scale(0)}to{transform:scale(1)}}
`;
