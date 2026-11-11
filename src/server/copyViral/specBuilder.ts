// The engine's source/spec.js for Guillaume's joined take, built from the reference shot by shot: at each shot's start
// the same layout (full camera, split, text card), the same framing jump (punch-in from the face size), the shot's
// on-screen text, and the captions placed where the reference has them. Times are seconds of the joined take
// (SOURCE time for the engine, which maps them onto the cut). Pure, so it is unit tested.

import type { CopyViralShot, CopyViralStyle } from '../../types/admin/copyViral';
import type { ShotSpan } from './assemble';
import { isList, revealTimes, type SpokenWord } from './reveal';
import { captionY } from './styleMap';

/** Engine seams: 0 = full camera, 1160 = split (paper above, camera card below), 1920 = paper only. */
const SEAM: Record<string, number> = { split: 1160, text_card: 1920 };
const MAX_ZOOM = 1.15;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Punch-in per shot so the face size changes where the reference's does: the widest shot = 1, capped at 1.15. */
export const zoomPerShot = (facePcts: number[]): number[] => {
  const faces = facePcts.filter((f) => f > 0);
  const widest = faces.length ? Math.min(...faces) : 0;
  return facePcts.map((f) => (widest && f > 0 ? r2(Math.min(MAX_ZOOM, f / widest)) : 1));
};

/** Text size from its longest line, so a title is big and a 6-line list still fits the top of the frame. */
export const textSize = (text: string, onPaper: boolean) => {
  const lines = text.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const base = onPaper ? 96 : longest <= 18 ? 84 : longest <= 30 ? 68 : 56;
  return lines.length > 4 ? Math.round(base * 0.8) : base;
};

type TextItem = Record<string, unknown>;

/**
 * The shot's on-screen text over the camera (white with a dark outline), or on the paper for a text card.
 * A list (3 lines or more) is one item per line, each landing when Guillaume says it; anything else shows whole.
 */
const textScene = (text: string, span: ShotSpan, onPaper: boolean, last: boolean, words: SpokenWord[]) => {
  const size = textSize(text, onPaper);
  const look = onPaper ? {} : { color: '#FFFFFF', halo: 12 };
  const top = onPaper ? 760 : 380;
  let items: TextItem[];
  if (isList(text)) {
    const lines = text.split('\n').filter((l) => l.trim());
    const times = revealTimes(lines, words, span.from, span.to);
    const lh = Math.round(size * 1.18);
    items = lines.map((line, i) => ({ k: 'text', text: line, at: times[i], x: 540, y: top + i * lh, size, ...look, shown: times[i] === 0 }));
  } else {
    // explicit line breaks keep the reference's lines; one long line wraps at 940 px
    items = [{ k: 'text', text, at: r2(span.from), x: 540, y: top, size, ...(text.includes('\n') ? {} : { maxW: 940 }), ...look, shown: span.from === 0 }];
  }
  return { type: 'board', layer: onPaper ? 'stage' : 'over', from: r2(span.from), ...(last ? {} : { to: r2(span.to) }), pre: 0.05, items };
};

/** Default size of the cut-out person over a picture (1 = the take's size); the director tunes it per sequence. */
export const CUTOUT_SCALE = 0.8;

/**
 * Green-screen shots (a picture behind me): I am cut out (Apple Vision) and stand on the paper in front of the picture,
 * smaller and low like the original's cut-out creator. One standard cutout per picture shot, one full-frame
 * image board per picture (stage layer, under the texts). Their layout keys must be 1920 (paper shown), or the cutout
 * hands back to the camera. Empty when no shot has a picture.
 */
export const pictureScenes = (backgrounds: (string | null)[], spans: ShotSpan[]) => {
  const end = spans.length - 1;
  const runs: { from: number; to: number; src: string; last: boolean }[] = [];
  backgrounds.forEach((src, i) => {
    if (!src) return;
    const prev = runs[runs.length - 1];
    if (prev && backgrounds[i - 1] === src) prev.to = spans[i].to;
    else runs.push({ from: spans[i].from, to: spans[i].to, src, last: false });
    runs[runs.length - 1].last = i === end;
  });
  // one cutout per shot: each take is framed a little differently, so each gets its own size and place (the director
  // measures and sets them so my face stays where the original's is)
  const cutout = backgrounds.flatMap((src, i) => (src ? [{ from: r2(spans[i].from), to: r2(spans[i].to), scale: CUTOUT_SCALE, x: 540, bottom: 1920 }] : []));
  const boards = runs.map((r) => ({
    type: 'board', layer: 'stage', from: r2(r.from), ...(r.last ? {} : { to: r2(r.to) }), push: 0,
    items: [{ k: 'img', img: r.src, x: 540, y: 960, s: 1080, h: 1920, shown: true, shadow: false, at: r2(r.from) }],
  }));
  return { cutout, boards };
};

export type SpecInput = {
  title: string;
  /** The `cam: {...}` line `short.mjs init` wrote after finding the face. */
  camLine: string;
  shots: CopyViralShot[];
  spans: ShotSpan[];
  style: CopyViralStyle | null;
  musicMuted: boolean;
  /** Guillaume's words in the joined take, for the list reveals. */
  words: SpokenWord[];
  /** Per shot: the background picture's path inside the edit folder (assets/images/…), or null. */
  backgrounds: (string | null)[];
  /** Measured caption place (the stolen look): wins over the one read from Gemini's words. */
  captions?: { y: number | null; show: boolean };
  /** Measured y of the camera card's top in split shots (the stolen look); else the engine's 1160. */
  splitSeam?: number | null;
  /** The stolen look's board animations, already in seconds, and the shots they cover (their plain text is skipped). */
  planned?: { scenes: unknown[]; shots: Set<number> };
};

export const buildSpec = ({ title, camLine, shots, spans, style, musicMuted, words, backgrounds, captions, splitSeam, planned }: SpecInput): string => {
  // a shot with a picture behind me shows the paper (the picture board) with me cut out in front, whatever the reading
  const seams: Record<string, number> = { ...SEAM, ...(splitSeam ? { split: splitSeam } : {}) };
  const layouts = shots.map((s, i) => (backgrounds[i] ? 1920 : seams[s.reading?.layout ?? ''] ?? 0));
  const zooms = zoomPerShot(shots.map((s) => s.reading?.facePct ?? 0));
  const scenes = shots.flatMap((s, i) => {
    // the stolen plan draws this shot's boards, its title included
    if (planned?.shots.has(s.index)) return [];
    const text = s.myOnScreenText.trim();
    // over a picture the text floats like on the camera (white, outlined), not like on a text card
    return text ? [textScene(text, spans[i], layouts[i] === 1920 && !backgrounds[i], i === shots.length - 1, words)] : [];
  });
  const pictures = pictureScenes(backgrounds, spans);
  const noCaptions = captions ? !captions.show : /\bno (spoken )?captions\b|\bnone\b/i.test(style?.captionPosition ?? '');
  const captionAt = captions?.y ?? captionY(style?.captionPosition ?? '');
  const spec = {
    title,
    cut: [],
    layout: { keys: spans.map((span, i) => [r2(span.from), layouts[i]]) },
    // a third value = instant punch (spring stiffness): the framing jumps on the cut, like the reference
    zoom: { keys: spans.map((span, i) => [r2(span.from), zooms[i], 400]) },
    ...(pictures.cutout.length ? { cutout: pictures.cutout } : {}),
    actors: [],
    // picture boards first: they sit under the texts on the stage layer
    scenes: [...pictures.boards, ...scenes, ...(planned?.scenes ?? [])],
    music: musicMuted ? { mute: true } : { bed: 'enquete', offset: 0 },
    mix: { music: -30 },
    captions: {
      replace: [],
      emph: [],
      hide: noCaptions ? [[0, r2(spans[spans.length - 1]?.to ?? 0)]] : [],
      yKeys: [[0, captionAt]],
    },
  };
  const body = JSON.stringify(spec, null, 2).replace(/^\{\n/, '');
  return `// Copy Viral Post: built from the reference shot by shot (src/server/copyViral/specBuilder.ts). Times = seconds of the joined take.\nwindow.SPEC = {\n  ${camLine.trim().replace(/,?\s*(\/\/.*)?$/, ',')}\n${body};\n`;
};
