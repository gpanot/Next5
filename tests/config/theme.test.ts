import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME } from '../../src/config/theme';

const css = readFileSync('app/globals.css', 'utf8');
const token = (name: string): string | undefined => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]?.toLowerCase();

describe('theme', () => {
  it('keeps CSS tokens in sync with src/config/theme.ts (light values)', () => {
    expect(token('app-bg')).toBe(THEME.ground);
    expect(token('app-panel')).toBe(THEME.panel);
    expect(token('app-sunken')).toBe(THEME.sunken);
    expect(token('app-ink')).toBe(THEME.ink);
    expect(token('app-muted')).toBe(THEME.muted);
    expect(token('app-line')).toBe(THEME.line);
    expect(token('app-accent')).toBe(THEME.accent);
    expect(token('app-accent-soft')).toBe(THEME.blush);
    expect(token('ink')).toBe(THEME.ink);
    expect(token('accent-strong')).toBe(THEME.accent);
    expect(token('accent')).toBe(THEME.accentBright);
  });

  it('has no leftovers from the old cream/terracotta palette in components', async () => {
    const { execSync } = await import('node:child_process');
    const hits = execSync("grep -rniE '#(b8683f|9c5c3a|d89873|c37d55|f5f1ea|1f1c19|221f1c|6e655c|e9e1d6)' src app --include='*.tsx' --include='*.ts' --include='*.css' || true").toString().trim();
    expect(hits).toBe('');
  });
});
