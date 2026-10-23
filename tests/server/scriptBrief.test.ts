import { describe, expect, it } from 'vitest';
import { scriptToBrief } from '../../src/components/admin/scriptGenerator/brief';
import type { GeneratedScript } from '../../src/types/admin/scriptGenerator';

const script: GeneratedScript = {
  title: 'You Do Not Have To Choose',
  format: 'talking_head',
  structure: 'listicle',
  durationSeconds: 30,
  music: 'soft piano',
  cta: 'Follow for more.',
  directorNote: { summary: 'Warm and honest.', decisions: [{ choice: 'Opened on the guilt', rule: 'Name the viewer: it is specific.' }] },
  beats: [
    { start: 0, end: 10, label: 'HOOK', onScreen: 'Build or be present?', spoken: 'Moms, you are not failing.', broll: 'Toddler pulls a sleeve', rehook: 'But wait', rehookAt: 5 },
    { start: 10, end: 30, label: 'POINT 1', spoken: 'Start small.', broll: 'Hands on a laptop' },
  ],
};

describe('scriptToBrief', () => {
  it('writes every part of the script', () => {
    const brief = scriptToBrief(script);
    for (const part of ['# You Do Not Have To Choose', 'Format: Talking Head', 'Music: soft piano', '### 1. HOOK (0-10s)', '- On screen: Build or be present?', '- Spoken: Moms, you are not failing.', '- Visual (first frame): Toddler pulls a sleeve', '- Re-hook at 5s: But wait', '- B-roll: Hands on a laptop', '## Call to action', 'Follow for more.', '1. Opened on the guilt', 'Why: Name the viewer']) {
      expect(brief).toContain(part);
    }
  });

  it('leaves out empty fields (older scripts have no re-hook, silent films no speech)', () => {
    const brief = scriptToBrief(script);
    expect(brief.split('### 2. POINT 1')[1]).not.toContain('On screen');
    expect(brief.split('### 2. POINT 1')[1]).not.toContain('Re-hook');
  });
});
