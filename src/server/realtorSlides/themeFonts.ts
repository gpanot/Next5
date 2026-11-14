// server-only — never import from a 'use client' file.
// Fonts for the realtor slide themes (themeLooks.tsx). Without a user agent Google serves TTF, which Satori reads.

type Weight = 400 | 500 | 600 | 700 | 800 | 900;
export type ThemeFont = { name: string; data: ArrayBuffer; weight: Weight; style: 'normal' | 'italic' };

const FAMILIES = ['Inter:wght@500;600;800;900', 'Playfair+Display:ital,wght@0,700;1,700', 'Anton', 'DM+Sans:wght@500;700', 'Archivo+Black'];

const FACE = /font-family: '([^']+)';\s*font-style: (\w+);\s*font-weight: (\d+);[\s\S]*?src: url\((.+?)\)/g;

const loadFamily = async (family: string): Promise<ThemeFont[]> => {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}`).then((r) => r.text());
  const faces = [...css.matchAll(FACE)];
  return Promise.all(
    faces.map(async ([, name, style, weight, url]) => ({
      name: name!,
      style: style === 'italic' ? 'italic' : 'normal',
      weight: Number(weight) as Weight,
      data: await fetch(url!).then((r) => r.arrayBuffer()),
    })),
  );
};

let fontsPromise: Promise<ThemeFont[]> | null = null;

/** Every theme font, fetched once per instance (a failed fetch is retried on the next render). */
export const loadThemeFonts = (): Promise<ThemeFont[]> => {
  fontsPromise ??= Promise.all(FAMILIES.map(loadFamily))
    .then((families) => families.flat())
    .catch((err: unknown) => {
      fontsPromise = null;
      throw err;
    });
  return fontsPromise;
};
