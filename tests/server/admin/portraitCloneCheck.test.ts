import { describe, expect, it } from 'vitest';
import { checkPortraitJson } from '../../../src/server/admin/portraitCloneCheck';

const base = {
  prompt_id: 'x_locked_v1',
  negative_prompt: ['glasses, hat, bag, tattoo, necklace, bracelet, watch', 'sharp focus, perfect skin'],
  jewelry: { earrings: 'one pearl stud per earlobe, 7 mm', necklace: 'none', bracelet: 'none', watch: 'none' },
  accessories: { glasses: 'none', headwear: 'none', bag: 'none' },
  body_marks: { tattoos: 'none' },
  camera: { sharpness: 'no sharpening, low micro-contrast' },
  generation_params: { note_to_model: 'do not add, remove, beautify, sharpen or reinterpret' },
};

describe('checkPortraitJson', () => {
  it('passes a clean JSON (negatives and instructions are not word-checked)', () => {
    expect(checkPortraitJson(base)).toEqual([]);
  });

  it('flags open words and boosters in positive fields', () => {
    const issues = checkPortraitJson({ ...base, face: { skin: 'natural texture', jaw: 'round or square' }, camera: { focus: 'sharp on eyes' } });
    expect(issues.some((i) => i.includes('"natural"'))).toBe(true);
    expect(issues.some((i) => i.includes('"or"'))).toBe(true);
    expect(issues.some((i) => i.includes('"sharp"'))).toBe(true);
  });

  it('flags a present item that negative_prompt bans', () => {
    const issues = checkPortraitJson({ ...base, negative_prompt: [...base.negative_prompt, 'earrings'] });
    expect(issues.some((i) => i.startsWith('jewelry.earrings'))).toBe(true);
  });

  it('flags an absent item missing from negative_prompt', () => {
    const issues = checkPortraitJson({ ...base, negative_prompt: ['hat, bag, tattoo, necklace, bracelet, watch'] });
    expect(issues.some((i) => i.startsWith('accessories.glasses'))).toBe(true);
  });
});
