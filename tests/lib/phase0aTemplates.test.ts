import { describe, expect, it } from 'vitest';
import {
  PHASE0A_TEMPLATES,
  matchPhase0ATemplate,
  resolvePhase0ATemplate,
} from '../../src/lib/phase0aTemplates';

describe('resolvePhase0ATemplate', () => {
  it('uses the id the research classifier chose, over anything the hook says', () => {
    // The hook screams "red flags" (template 1), but the classifier read the
    // whole transcript and said Day in the Life. The classifier wins.
    const resolved = resolvePhase0ATemplate(17, '5 red flags your mechanic is scamming you');
    expect(resolved.id).toBe(17);
    expect(resolved.name).toBe('Day in the Life');
  });

  it('falls back to hook matching for results cached before classification existed', () => {
    const resolved = resolvePhase0ATemplate(undefined, '5 red flags your mechanic is scamming you');
    expect(resolved.id).toBe(matchPhase0ATemplate('5 red flags your mechanic is scamming you').id);
    expect(resolved.id).toBe(1);
  });

  it('falls back when the classifier returned nothing', () => {
    expect(resolvePhase0ATemplate(null, 'before and after transformation').id).toBe(18);
  });

  it('ignores an id no template has', () => {
    const resolved = resolvePhase0ATemplate(999, 'day in the life of a plumber');
    expect(resolved.id).toBe(17);
  });

  it('every template has slides and a prompt per slide, so generation always has a fallback', () => {
    for (const template of PHASE0A_TEMPLATES) {
      expect(template.suggestedSlides.length).toBeGreaterThan(0);
      for (const slide of template.suggestedSlides) {
        expect(slide.text.trim()).not.toBe('');
        expect(slide.bgPrompt.trim()).not.toBe('');
      }
    }
  });

  it('template ids are unique — they are the classifier menu and the cache key', () => {
    const ids = PHASE0A_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
