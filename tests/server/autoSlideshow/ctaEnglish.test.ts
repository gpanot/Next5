import { describe, expect, it } from 'vitest';
import { ctaProblems } from '../../../src/server/autoSlideshow/bank/checks';

const cta = (title: string, body: string) => ({ angle: 'result-focused', title, body, photo: 'A woman stretching in a bright studio, seen from the side.' });

describe('ctaProblems', () => {
  it('rejects a CTA written in the site\'s own language', () => {
    expect(ctaProblems(cta('EQL Apparel—Tự tin khi luyện tập', 'Thoải mái tuyệt đối cho mọi hoạt động.'), [], '')).toContain('not in English');
  });

  it('keeps an English CTA with one accented word', () => {
    expect(ctaProblems(cta('Visit Café Lumen today', 'Fresh coffee made the way you like it.'), [], '')).not.toContain('not in English');
  });
});
