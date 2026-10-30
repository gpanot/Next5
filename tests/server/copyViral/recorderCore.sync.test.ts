import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The studio skill loads the same recorder core as plain JS. Skipped where the skill isn't installed (CI).
const source = path.resolve('src/components/admin/copyViral/recorder/recorderCore.js');
const copy = path.join(process.env.STUDIO_APP_DIR ?? path.join(homedir(), '.claude/skills/studio/app'), 'recorderCore.js');

describe.skipIf(!existsSync(copy))('recorderCore shared with the studio skill', () => {
  it('is the same file (run npm run recorder:sync)', () => {
    expect(readFileSync(copy, 'utf8')).toBe(readFileSync(source, 'utf8'));
  });
});
