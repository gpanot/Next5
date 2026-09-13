import { describe, expect, it } from 'vitest';
import { BRAND_TEMPLATES, SHOP_TEMPLATES } from '../../../src/content/business/catalog/templates';
import { THEMES } from '../../../src/content/business/catalog/themes';
import { composeBrandPrompt } from '../../../src/server/generation/composer/brand';
import { composeShopPrompt } from '../../../src/server/generation/composer/shop';
import { buildFileNames } from '../../../src/server/generation/zip';

const office = BRAND_TEMPLATES.find((t) => t.id === 'modern-office')!;
const justListed = THEMES.find((t) => t.id === 'just-listed')!;
const beige = SHOP_TEMPLATES.find((t) => t.id === 'beige-wall')!;

const brand = (index: number) =>
  composeBrandPrompt({
    template: office.config,
    set: { locations: ['glass-meeting-room', 'reception-lounge'], wardrobe: 'brand_color_accent', poseEnergy: 'confident_expert', brandColors: ['#1F3A5F'] },
    scene: justListed.scenes[index % justListed.scenes.length]!,
    index,
    sceneCount: justListed.scenes.length,
    format: 'portrait_4_5',
    industry: 'realtor',
    identityImageCount: 2,
  });

describe('composeBrandPrompt', () => {
  it('puts identity first and guardrails last', () => {
    const prompt = brand(0);
    expect(prompt.startsWith('Images 1 to 2 show the person.')).toBe(true);
    expect(prompt.trim().endsWith('uniforms of real companies.')).toBe(true);
    expect(prompt).toContain('real estate');
    expect(prompt).toContain('#1F3A5F');
    expect(prompt).toContain('4:5 instagram feed');
  });

  it('alternates chosen locations and adds variation notes when cycling scenes', () => {
    expect(brand(0)).toContain('glass meeting-room wall');
    expect(brand(1)).toContain('reception lounge');
    expect(brand(0)).not.toContain('Variation');
    expect(brand(justListed.scenes.length)).toContain('Variation 2');
  });
});

describe('composeShopPrompt', () => {
  const prompt = composeShopPrompt({
    template: beige.config,
    garment: { category: 'dress', name: 'Satin slip dress', colorName: 'sage green', fit: 'regular', notes: 'bias cut' },
    shot: 'full_body_front',
    format: 'square_1_1',
    identityImageCount: 2,
    productImageCount: 2,
    isStudioModel: true,
  });

  it('numbers product images after identity images', () => {
    expect(prompt).toContain('Images 1 to 2 show the model.');
    expect(prompt).toContain('Images 3 to 4 show the product (dress: Satin slip dress; colour: sage green; fit: regular; notes: bias cut)');
  });

  it('includes garment fidelity, shot, format and shop guardrails', () => {
    expect(prompt).toContain('identical colour, pattern and print placement');
    expect(prompt).toContain('whole garment visible from head to toe');
    expect(prompt).toContain('1:1 listing / square');
    expect(prompt).toContain('accessories that are not in the product photos');
  });
});

describe('buildFileNames', () => {
  it('names shop files by SKU and dedupes', () => {
    const names = buildFileNames([
      { productLabel: 'LS-03', shot: 'full_body_front', format: 'square_1_1', sceneId: null, themeId: null },
      { productLabel: 'LS-03', shot: 'full_body_front', format: 'square_1_1', sceneId: null, themeId: null },
      { productLabel: null, shot: null, format: 'story_9_16', sceneId: 'doorway-welcome', themeId: 'just-listed' },
    ]);
    expect(names).toEqual(['LS-03_full_body_front_1x1.jpg', 'LS-03_full_body_front_1x1-2.jpg', 'just-listed_doorway-welcome_9x16.jpg']);
  });
});
