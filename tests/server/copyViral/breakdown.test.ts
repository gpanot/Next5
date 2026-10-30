import { describe, expect, it } from 'vitest';
import { clipWarnings } from '../../../src/server/copyViral/clips';
import { writeLines } from '../../../src/server/copyViral/script';
import { emptyShot } from '../../../src/server/copyViral/shots';
import { shotTranscript } from '../../../src/server/copyViral/transcript';

describe('shotTranscript', () => {
  const words = [{ word: 'I', start: 0.1, end: 0.2 }, { word: "didn't", start: 0.2, end: 0.5 }, { word: 'edit', start: 0.95, end: 1.3 }];

  it('keeps the words whose middle is inside the shot', () => {
    expect(shotTranscript(words, { startMs: 0, endMs: 1000 })).toBe("I didn't");
    expect(shotTranscript(words, { startMs: 1000, endMs: 2000 })).toBe('edit');
  });
});

describe('clipWarnings', () => {
  const probe = { durationMs: 3000, width: 1080, height: 1920, fps: 30, hasAudio: true };

  it('is quiet for a good vertical take', () => {
    expect(clipWarnings(probe, 3000)).toEqual([]);
  });

  it('flags landscape, low resolution, short and silent takes', () => {
    const w = clipWarnings({ durationMs: 1000, width: 1280, height: 720, fps: 30, hasAudio: false }, 3000);
    expect(w).toHaveLength(4);
    expect(w[0]).toMatch(/Landscape/);
  });
});

describe('writeLines', () => {
  const shots = [emptyShot(0, 0, 2000), emptyShot(1, 2000, 5000)];

  it('maps lines by shot number, strips dashes, keeps the caption', async () => {
    const call = async () => ({ shots: [{ shot: 2, line: 'Second — line', on_screen_text: '' }, { shot: 1, line: 'First', on_screen_text: 'HOOK' }], caption: 'Comment EDIT' });
    const out = await writeLines(shots, null, call);
    expect(out.lines[0]).toEqual({ myLine: 'First', myOnScreenText: 'HOOK' });
    expect(out.lines[1].myLine).not.toContain('—');
    expect(out.caption).toBe('Comment EDIT');
  });

  it('refuses an empty answer', async () => {
    await expect(writeLines(shots, null, async () => ({ shots: [] }))).rejects.toThrow(/empty/);
  });
});
