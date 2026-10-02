import { describe, expect, it } from 'vitest';
import { findShareImage, pickPalette } from '../../../src/server/companyIntel/palette';
import { boxColors, contrast, toSlideshowStyle, cleanPhotoStyle } from '../../../src/server/companyIntel/slideshowStyle';

describe('pickPalette', () => {
  it('keeps a black-and-white brand black and white when its only strong colors are rare', () => {
    const scores = new Map([['#010205', 400], ['#ffffff', 300], ['#e6e6e6', 120], ['#1a44ea', 6]]);
    expect(pickPalette(scores)).toEqual(['#010205', '#ffffff', '#e6e6e6']);
  });

  it('puts a well-used brand color first', () => {
    const scores = new Map([['#ffffff', 300], ['#1ed760', 90], ['#000000', 200]]);
    expect(pickPalette(scores)[0]).toBe('#1ed760');
  });
});

describe('findShareImage', () => {
  it('reads og:image written with name= and resolves relative links', () => {
    expect(findShareImage('<meta name="og:image" content="https://cdn.x.com/a.jpg">', 'https://x.com')).toBe('https://cdn.x.com/a.jpg');
    expect(findShareImage('<meta content="/b.png" property="og:image" />', 'https://x.com/usa')).toBe('https://x.com/b.png');
    expect(findShareImage('<meta name="twitter:image" content="https://x.com/t.jpg">', 'https://x.com')).toBe('https://x.com/t.jpg');
    expect(findShareImage('<meta name="og:image:alt" content="Crest">', 'https://x.com')).toBeNull();
  });
});

describe('slideshow style', () => {
  it('drops clauses that set the light or ask for text, and stops on a whole clause', () => {
    expect(cleanPhotoStyle('The car on coastal roads, moody cinematic dusk light, owners in tailored clothes.')).toBe('The car on coastal roads, owners in tailored clothes.');
    expect(cleanPhotoStyle('Cars at a dealership; price graphics on screen.')).toBe('Cars at a dealership.');
    const long = Array.from({ length: 12 }, (_, i) => `scene number ${i} here,`).join(' ');
    expect(cleanPhotoStyle(long).split(/\s+/).length).toBeLessThanOrEqual(40);
  });

  it('fixes a box text color that does not read', () => {
    expect(boxColors('#010205', '#111111')).toEqual({ boxColor: '#010205', boxTextColor: '#ffffff' });
    expect(boxColors('#ffffff', '#010205')).toEqual({ boxColor: '#ffffff', boxTextColor: '#010205' });
    expect(boxColors('red', '#fff')).toEqual({ boxColor: '#ffffff', boxTextColor: '#111111' });
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21);
  });

  it('needs a photo style', () => {
    expect(toSlideshowStyle({ photoStyle: '', boxColor: '#000000' })).toBeUndefined();
    expect(toSlideshowStyle({ photoStyle: 'Families in driveways.', productAsSubject: true })).toEqual({
      photoStyle: 'Families in driveways.',
      productAsSubject: true,
      boxColor: '#ffffff',
      boxTextColor: '#111111',
    });
  });
});
