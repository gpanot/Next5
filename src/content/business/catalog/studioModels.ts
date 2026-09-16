/** Next5 Studio models — synthetic adult identities owned by Next5. Images: 04-image-prompts.md C15–C38. */

/** Markets the shop sells to; sellers pick the model their customers look like. */
export const MODEL_ETHNICITIES = [
  { id: 'asian', label: 'Asian' },
  { id: 'white', label: 'White' },
  { id: 'black', label: 'Black' },
  { id: 'arabic', label: 'Arabic' },
  { id: 'latina', label: 'Latina' },
] as const;

export type ModelEthnicity = (typeof MODEL_ETHNICITIES)[number]['id'];

export type StudioModelSeed = { slug: string; name: string; age: number; ethnicity: ModelEthnicity; description: string; faceImage: string; fullImage: string };

const IMG = '/images/business/shop/models';

const model = (slug: string, name: string, age: number, ethnicity: ModelEthnicity, description: string): StudioModelSeed => ({
  slug: `model-${slug}`, name, age, ethnicity, description, faceImage: `${IMG}/model-${slug}-face.png`, fullImage: `${IMG}/model-${slug}-full.png`,
});

export const STUDIO_MODELS: readonly StudioModelSeed[] = [
  model('an', 'An', 22, 'asian', 'Petite, long straight hair'),
  model('vy', 'Vy', 26, 'asian', 'Tall and slim'),
  model('thao', 'Thảo', 31, 'asian', 'Curvy, plus size'),
  model('ngoc', 'Ngọc', 35, 'asian', 'Athletic build'),
  model('hana', 'Hana', 28, 'asian', 'Eurasian, wavy bob'),
  model('mira', 'Mira', 42, 'asian', 'Elegant, short bob'),
  model('emma', 'Emma', 27, 'white', 'Medium build, wavy light brown hair'),
  model('grace', 'Grace', 22, 'white', 'Petite, long straight hair'),
  model('ivy', 'Ivy', 26, 'white', 'Tall and slim, sleek ponytail'),
  model('sarah', 'Sarah', 31, 'white', 'Athletic build, auburn hair'),
  model('diane', 'Diane', 45, 'white', 'Elegant, short silver bob'),
  model('chloe', 'Chloe', 34, 'white', 'Curvy plus size, blonde'),
  model('amara', 'Amara', 25, 'black', 'Tall and slim, short natural hair'),
  model('zuri', 'Zuri', 22, 'black', 'Petite, short twisted locs'),
  model('imani', 'Imani', 28, 'black', 'Medium build, natural afro'),
  model('keisha', 'Keisha', 35, 'black', 'Athletic build, sleek straight hair'),
  model('yvonne', 'Yvonne', 44, 'black', 'Elegant, short natural hair'),
  model('nia', 'Nia', 31, 'black', 'Curvy, long box braids'),
  model('layla', 'Layla', 26, 'arabic', 'Medium build, long wavy hair'),
  model('noor', 'Noor', 22, 'arabic', 'Petite, long straight hair'),
  model('dalia', 'Dalia', 28, 'arabic', 'Curvy plus size, wavy hair'),
  model('rania', 'Rania', 30, 'arabic', 'Athletic build, wears a hijab'),
  model('hoda', 'Hoda', 43, 'arabic', 'Elegant, short bob'),
  model('salma', 'Salma', 33, 'arabic', 'Medium build, wears a hijab'),
  model('sofia', 'Sofia', 24, 'latina', 'Petite and curvy, long dark hair'),
  model('camila', 'Camila', 22, 'latina', 'Tall and slim, long wavy hair'),
  model('lucia', 'Lucia', 27, 'latina', 'Medium build, straight dark hair'),
  model('mariana', 'Mariana', 35, 'latina', 'Curvy plus size, curly hair'),
  model('elena', 'Elena', 44, 'latina', 'Elegant, short bob'),
  model('valentina', 'Valentina', 30, 'latina', 'Athletic build, wavy hair'),
];
