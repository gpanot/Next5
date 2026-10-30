import { describe, expect, it } from 'vitest';
import { applyShotEdits, cutsToShots, emptyShot, frameTimeMs } from '../../../src/server/copyViral/shots';
import { mergeWithNext, moveCut, setTarget, splitShot } from '../../../src/components/admin/copyViral/shotEdits';

describe('cutsToShots', () => {
  it('turns cut times into contiguous shots covering the video', () => {
    const shots = cutsToShots([1.5, 3.2], 6000);
    expect(shots.map((s) => [s.startMs, s.endMs, s.targetMs])).toEqual([[0, 1500, 1500], [1500, 3200, 1700], [3200, 6000, 2800]]);
    expect(shots.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('drops flashes shorter than 400 ms, unsorted and near-end cuts', () => {
    const shots = cutsToShots([3.0, 0.2, 1.0, 1.2, 5.9], 6000);
    expect(shots.map((s) => s.startMs)).toEqual([0, 1000, 3000]);
    expect(shots[shots.length - 1].endMs).toBe(6000);
  });

  it('gives one shot when there is no cut', () => {
    expect(cutsToShots([], 4000)).toEqual([emptyShot(0, 0, 4000)]);
    expect(emptyShot(0, 0, 4000)).toMatchObject({ targetMs: 4000, frame: null, clip: null, myLine: '' });
  });

  it('takes the still in the middle of the shot', () => {
    expect(frameTimeMs({ startMs: 1000, endMs: 2001 })).toBe(1501);
  });
});

describe('applyShotEdits', () => {
  const previous = cutsToShots([2], 5000).map((s) => ({ ...s, frame: `f-${s.startMs}.jpg` }));

  it('keeps frames of unchanged shots and clears moved ones', () => {
    const shots = applyShotEdits([{ startMs: 0, endMs: 2000, targetMs: 1800 }, { startMs: 2000, endMs: 3000, targetMs: 1000 }, { startMs: 3000, endMs: 5000, targetMs: 2000 }], 5000, previous);
    expect(shots.map((s) => s.frame)).toEqual(['f-0.jpg', null, null]);
    expect(shots[0].targetMs).toBe(1800);
  });

  it('refuses gaps, wrong ends and too-short shots', () => {
    expect(() => applyShotEdits([{ startMs: 0, endMs: 2000, targetMs: 1 }, { startMs: 2100, endMs: 5000, targetMs: 1 }], 5000, [])).toThrow(/must start/);
    expect(() => applyShotEdits([{ startMs: 0, endMs: 4000, targetMs: 1 }], 5000, [])).toThrow(/end of the video/);
    expect(() => applyShotEdits([{ startMs: 0, endMs: 100, targetMs: 1 }, { startMs: 100, endMs: 5000, targetMs: 1 }], 5000, [])).toThrow(/shorter/);
  });
});

describe('shot edits in the tab', () => {
  const shots = [{ startMs: 0, endMs: 2000, targetMs: 2000 }, { startMs: 2000, endMs: 5000, targetMs: 2500 }];

  it('merges a shot with the next one', () => {
    expect(mergeWithNext(shots, 0)).toEqual([{ startMs: 0, endMs: 5000, targetMs: 4500 }]);
    expect(mergeWithNext(shots, 1)).toBe(shots);
  });

  it('splits at the playhead, or the middle when the playhead is outside', () => {
    expect(splitShot(shots, 1, 3000).map((s) => [s.startMs, s.endMs, s.targetMs])).toEqual([[0, 2000, 2000], [2000, 3000, 833], [3000, 5000, 1667]]);
    expect(splitShot(shots, 0, 4000).map((s) => s.endMs)).toEqual([1000, 2000, 5000]);
  });

  it('moves a cut, clamps it, and keeps a hand-set target', () => {
    const moved = moveCut(shots, 0, 300);
    expect(moved).toEqual([{ startMs: 0, endMs: 2300, targetMs: 2300 }, { startMs: 2300, endMs: 5000, targetMs: 2500 }]);
    expect(moveCut(shots, 0, -5000)[0].endMs).toBe(400);
  });

  it('sets a target', () => {
    expect(setTarget(shots, 1, 1234.4)[1].targetMs).toBe(1234);
  });
});
