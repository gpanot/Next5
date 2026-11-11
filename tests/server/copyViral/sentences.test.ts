import { describe, expect, it } from 'vitest';
import { sentenceShots } from '../../../src/server/copyViral/shots';
import { sentenceBreaks } from '../../../src/server/copyViral/transcript';

const words = (list: [string, number, number][]) => list.map(([word, start, end]) => ({ word, start, end }));

describe('sentenceBreaks', () => {
  it('finds sentence ends between words, from the punctuated text', () => {
    const t = {
      text: "If I was an electrician, I'd post. I'm Hannah! Panel work is tidy.",
      words: words([['If', 0, 0.2], ['I', 0.2, 0.3], ['was', 0.3, 0.5], ['an', 0.5, 0.6], ['electrician', 0.6, 1.2], ['I\'d', 1.3, 1.5], ['post', 1.5, 2.0],
        ['I\'m', 2.4, 2.6], ['Hannah', 2.6, 3.0], ['Panel', 3.4, 3.7], ['work', 3.7, 3.9], ['is', 3.9, 4.0], ['tidy', 4.0, 4.4]]),
    };
    // the last sentence has no next word: no break after it
    expect(sentenceBreaks(t)).toEqual([2200, 3200]);
  });
});

describe('sentenceShots', () => {
  it('moves a picture cut in mid sentence to the nearest sentence end', () => {
    const shots = sentenceShots([12.2], [11000, 13500], 18000);
    expect(shots.map((s) => s.startMs)).toEqual([0, 11000]);
  });

  it('splits a long shot into 1-2 sentences, at most 8 s past one sentence', () => {
    // sentences end at 3, 6, 9, 12, 15 s in a 20 s single picture shot
    const shots = sentenceShots([], [3000, 6000, 9000, 12000, 15000], 20000);
    expect(shots.map((s) => [s.startMs, s.endMs])).toEqual([[0, 6000], [6000, 12000], [12000, 20000]]);
  });

  it('keeps picture cuts far from any speech', () => {
    expect(sentenceShots([2], [9000], 9500).map((s) => s.startMs)).toEqual([0, 2000]);
  });

  it('numbers shots by the picture scene they come from', () => {
    // picture cut at 12.2 s snaps to the 13.0 s sentence end; scene 1 splits into 3 shots of sentences
    const shots = sentenceShots([12.2], [4900, 10700, 13000, 17700], 22000);
    expect(shots.map((s) => [s.startMs, s.sequence])).toEqual([[0, 0], [4900, 0], [10700, 0], [13000, 1], [17700, 1]]);
  });

  it('falls back to picture cuts without speech', () => {
    expect(sentenceShots([5], [], 10000).map((s) => s.startMs)).toEqual([0, 5000]);
  });
});
