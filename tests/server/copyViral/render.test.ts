import { describe, expect, it } from 'vitest';
import { emptyShot } from '../../../src/server/copyViral/shots';
import { buildSpec, zoomPerShot } from '../../../src/server/copyViral/specBuilder';
import { captionY, pickAccent, toEngineStyle } from '../../../src/server/copyViral/styleMap';
import type { CopyViralShotReading, CopyViralStyle } from '../../../src/types/admin/copyViral';

const style = (patch: Partial<CopyViralStyle>): CopyViralStyle => ({
  captionFont: '', captionCase: '', captionPosition: '', captionWordsPerLine: 3, captionHighlight: '', colors: '', grade: '',
  transitions: '', hook: '', cta: '', music: '', soundEffects: '', notes: '', ...patch,
});

const reading = (patch: Partial<CopyViralShotReading>): CopyViralShotReading => ({
  layout: 'full_cam', framing: '', facePct: 20, movement: 'static', direction: '', onScreenText: '', overlays: '', background: '', ...patch,
});

describe('styleMap', () => {
  it('picks the first real color, skipping white, black and greys', () => {
    expect(pickAccent('Green (#00FF00), Red (#FF0000), Black, White')).toBe('#00FF00');
    expect(pickAccent('#FFFFFF and #222222 then yellow')).toBe('#FFD60A');
    expect(pickAccent('white, black')).toBeNull();
  });

  it('places captions from the words', () => {
    expect(captionY('top center')).toBeLessThan(captionY('middle center'));
    expect(captionY('lower middle')).toBeLessThan(captionY('bottom'));
  });

  it('maps a reel look onto the engine keys', () => {
    const s = toEngineStyle(style({ captionFont: 'bold condensed sans', captionCase: 'UPPER', captionWordsPerLine: 9, music: 'no music' }), 'x');
    expect(s.captions).toMatchObject({ font: 'Archivo', upper: true, maxWords: 5, style: 'band' });
    expect(s.music).toEqual({ mute: true });
    expect(toEngineStyle(style({ captionHighlight: 'said word on a yellow box' }), 'x').captions).toMatchObject({ style: 'rise' });
  });
});

describe('specBuilder', () => {
  it('punches in where the reference face gets bigger, capped at 1.15', () => {
    expect(zoomPerShot([20, 22, 40, 0])).toEqual([1, 1.1, 1.15, 1]);
  });

  it('keys layout and zoom on each shot start and adds on-screen texts', () => {
    const shots = [
      { ...emptyShot(0, 0, 2000), reading: reading({ facePct: 20 }), myOnScreenText: 'Content ideas' },
      { ...emptyShot(1, 2000, 5000), reading: reading({ layout: 'text_card', facePct: 0 }), myOnScreenText: 'Step 1' },
    ];
    const js = buildSpec({
      title: 't', camLine: '  cam: { crop: [0, 0, 1080, 1920], eyes: [540, 600] },   // face detected', shots,
      spans: [{ index: 0, from: 0, to: 2.5 }, { index: 1, from: 2.5, to: 6 }], style: null, musicMuted: true, words: [], backgrounds: [null, null],
    });
    const ctx: { window: { SPEC?: Record<string, unknown> } } = { window: {} };
    new Function('window', js)(ctx.window);
    const spec = ctx.window.SPEC as { cam: unknown; layout: { keys: number[][] }; zoom: { keys: number[][] }; scenes: { layer: string; from: number; to?: number }[]; music: unknown };
    expect(spec.cam).toEqual({ crop: [0, 0, 1080, 1920], eyes: [540, 600] });
    expect(spec.layout.keys).toEqual([[0, 0], [2.5, 1920]]);
    expect(spec.zoom.keys).toEqual([[0, 1, 400], [2.5, 1, 400]]);
    expect(spec.scenes.map((s) => [s.layer, s.from, s.to])).toEqual([['over', 0, 2.5], ['stage', 2.5, undefined]]);
    expect(spec.music).toEqual({ mute: true });
  });

  it('shows the paper (the picture board) for a shot with a picture behind me, even when read as split', () => {
    const shots = [{ ...emptyShot(0, 0, 2000), reading: reading({ layout: 'split' }) }];
    const js = buildSpec({
      title: 't', camLine: 'cam: { crop: [0, 0, 1080, 1920], eyes: [540, 600] },', shots,
      spans: [{ index: 0, from: 0, to: 2 }], style: null, musicMuted: true, words: [], backgrounds: ['assets/images/bg-1.jpg'],
    });
    const ctx: { window: { SPEC?: { layout: { keys: number[][] } } } } = { window: {} };
    new Function('window', js)(ctx.window);
    expect(ctx.window.SPEC?.layout.keys).toEqual([[0, 1920]]);
  });
});
