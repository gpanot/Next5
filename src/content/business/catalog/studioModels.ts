/** Next5 Studio models — synthetic adult identities owned by Next5. Images: 04-image-prompts.md C15–C26. */

export type StudioModelSeed = { slug: string; name: string; age: number; description: string; faceImage: string; fullImage: string };

const IMG = '/images/business/shop/models';

const model = (slug: string, name: string, age: number, description: string): StudioModelSeed => ({
  slug: `model-${slug}`, name, age, description, faceImage: `${IMG}/model-${slug}-face.png`, fullImage: `${IMG}/model-${slug}-full.png`,
});

export const STUDIO_MODELS: readonly StudioModelSeed[] = [
  model('an', 'An', 22, 'Petite, long straight hair'),
  model('vy', 'Vy', 26, 'Tall and slim'),
  model('thao', 'Thảo', 31, 'Curvy, plus size'),
  model('ngoc', 'Ngọc', 35, 'Athletic build'),
  model('hana', 'Hana', 28, 'Eurasian, wavy bob'),
  model('mira', 'Mira', 42, 'Elegant, short bob'),
];
