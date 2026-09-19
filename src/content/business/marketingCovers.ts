/**
 * US marketing covers for catalog items. The studio (after login) keeps the catalog's own `coverImage`;
 * only the public pages (/brand, /shop) show these. Every path must exist in public/images/manifest.json.
 */

const US = '/images/business/us';

const covers = (folder: string, ids: readonly string[]): Record<string, string> =>
  Object.fromEntries(ids.map((id) => [id, `${US}/${folder}/${id}.png`]));

const SET_COVERS = covers('brand/sets', ['modern-office', 'listing-interior', 'neighborhood-cafe', 'studio-backdrop', 'urban-outdoor', 'home-office']);
const THEME_COVERS = covers('brand/themes', ['just-listed', 'market-update', 'client-meeting', 'behind-the-scenes', 'new-year-goals', 'holiday-greetings', 'tet-greetings', 'open-house']);
const LOOK_COVERS = covers('shop/looks', ['clean-white', 'beige-wall', 'cafe-lifestyle', 'street-urban', 'boutique-rack', 'resort']);

/** Marketing cover for a Brand set template; falls back to the catalog image. */
export const setCover = (id: string, fallback: string): string => SET_COVERS[id] ?? fallback;

/** Marketing cover for a Brand theme; falls back to the catalog image. */
export const themeCover = (id: string, fallback: string): string => THEME_COVERS[id] ?? fallback;

/** Marketing cover for a Shop look template; falls back to the catalog image. */
export const lookCover = (id: string, fallback: string): string => LOOK_COVERS[id] ?? fallback;

