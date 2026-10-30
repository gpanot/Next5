import { describe, expect, it } from 'vitest';
import { toSrt } from '../../../src/server/copyViral/deliver';
import { isList, revealTimes } from '../../../src/server/copyViral/reveal';
import { CUTOUT_SCALE, pictureScenes } from '../../../src/server/copyViral/specBuilder';

const w = (text: string, start: number) => ({ text, start, end: start + 0.3 });

describe('revealTimes', () => {
  const lines = ['You want          You must', 'Freedom          Time', 'Trust          Honest', 'Peace          Boundaries'];
  const words = [w('If', 0.2), w('you', 0.4), w('want', 0.6), w('freedom,', 0.9), w('save', 1.5), w('time.', 1.8), w('If', 2.4), w('you', 2.6), w('want', 2.8), w('trust,', 3.1)];

  it('shows the header at the shot start and each line on its first said word', () => {
    expect(revealTimes(lines, words, 0, 6)).toEqual([0, 0.9, 3.1, 3.7]);
  });

  it('only treats 3 lines or more as a list', () => {
    expect(isList('Content Ideas\nfor Electricians')).toBe(false);
    expect(isList(lines.join('\n'))).toBe(true);
  });
});

describe('pictureScenes', () => {
  const spans = [{ index: 0, from: 0, to: 2 }, { index: 1, from: 2, to: 5 }, { index: 2, from: 5, to: 9 }];

  it('is empty without any picture', () => {
    expect(pictureScenes([null, null, null], spans)).toEqual({ cutout: [], boards: [] });
  });

  it('cuts me out over each picture, one board per picture, one cutout per shot', () => {
    const { cutout, boards } = pictureScenes(['a.jpg', 'a.jpg', 'b.jpg'], spans);
    expect(cutout.map((c) => [c.from, c.to, c.scale])).toEqual([[0, 2, CUTOUT_SCALE], [2, 5, CUTOUT_SCALE], [5, 9, CUTOUT_SCALE]]);
    expect(boards.map((b) => [b.from, 'to' in b ? b.to : undefined, b.items[0].img])).toEqual([[0, 5, 'a.jpg'], [5, undefined, 'b.jpg']]);
  });

  it('leaves my real room between pictures', () => {
    const { cutout } = pictureScenes(['a.jpg', null, 'b.jpg'], spans);
    expect(cutout.map((c) => [c.from, c.to])).toEqual([[0, 2], [5, 9]]);
  });
});

describe('toSrt', () => {
  it('cuts cues at sentence ends, pauses and 5 words', () => {
    const srt = toSrt([w('Hi.', 0), w('One', 1), w('two', 1.3), w('three', 1.6), w('four', 1.9), w('five', 2.2), w('six', 2.5), w('later', 4)]);
    expect(srt).toContain('1\n00:00:00,000 --> 00:00:00,300\nHi.');
    expect(srt).toContain('One two three four five');
    expect(srt).toContain('4\n00:00:04,000 --> 00:00:04,300\nlater');
  });
});
