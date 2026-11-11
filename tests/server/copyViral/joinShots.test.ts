import { describe, expect, it } from 'vitest';
import { joinWithNext, sentencesOf, splitInTwo, splitPointMs } from '../../../src/server/copyViral/joinShots';
import { emptyShot } from '../../../src/server/copyViral/shots';
import type { CopyViralClip } from '../../../src/types/admin/copyViral';

const clip = (file: string): CopyViralClip => ({ file, durationMs: 1000, width: 1080, height: 1920, fps: 30, uploadedAt: '', warnings: [] });

const three = () => [
  { ...emptyShot(0, 0, 2000), transcript: 'One.', myLine: 'My one.', myOnScreenText: 'A', frame: 'f0.jpg', clip: clip('clips/a.mp4') },
  { ...emptyShot(1, 2000, 5000), transcript: 'Two.', myLine: 'My two.', myOnScreenText: 'B', frame: 'f1.jpg', clip: clip('clips/b.mp4') },
  { ...emptyShot(2, 5000, 6000), transcript: 'Three.', myLine: 'My three.', frame: 'f2.jpg' },
];

describe('joinWithNext', () => {
  it('joins texts and targets, drops both takes and the still', () => {
    const { shots, droppedClips } = joinWithNext(three(), 0);
    expect(shots).toHaveLength(2);
    expect(shots[0]).toMatchObject({ index: 0, startMs: 0, endMs: 5000, targetMs: 5000, transcript: 'One. Two.', myLine: 'My one. My two.', myOnScreenText: 'A\nB', frame: null, clip: null });
    expect(shots[1]).toMatchObject({ index: 1, startMs: 5000, frame: 'f2.jpg' });
    expect(droppedClips).toEqual(['clips/a.mp4', 'clips/b.mp4']);
  });

  it('refuses the last shot', () => {
    expect(() => joinWithNext(three(), 2)).toThrow();
  });
});

describe('splitPointMs', () => {
  it('picks the sentence end nearest the middle, else the middle', () => {
    expect(splitPointMs({ startMs: 0, endMs: 6000 }, [1000, 2500, 5000])).toBe(2500);
    expect(splitPointMs({ startMs: 0, endMs: 6000 }, [100])).toBe(3000);
  });
});

describe('splitInTwo', () => {
  it('shares my line by sentences and keeps the on-screen text on the first half', () => {
    const merged = joinWithNext(three(), 0).shots;
    const { shots, droppedClips } = splitInTwo(merged, 0, 2000, (s) => `${s.startMs}-${s.endMs}`);
    expect(shots.map((s) => [s.index, s.startMs, s.endMs, s.targetMs])).toEqual([[0, 0, 2000, 2000], [1, 2000, 5000, 3000], [2, 5000, 6000, 1000]]);
    expect(shots[0]).toMatchObject({ myLine: 'My one.', transcript: '0-2000', myOnScreenText: 'A\nB' });
    expect(shots[1]).toMatchObject({ myLine: 'My two.', transcript: '2000-5000', myOnScreenText: '' });
    expect(droppedClips).toEqual([]);
  });

  it('refuses a cut too close to an edge', () => {
    expect(() => splitInTwo(three(), 2, 5100, () => '')).toThrow();
  });
});

describe('sentencesOf', () => {
  it('splits on end punctuation and keeps a trailing fragment', () => {
    expect(sentencesOf('One. Two!? "Three." four')).toEqual(['One.', 'Two!?', '"Three."', 'four']);
  });
});
