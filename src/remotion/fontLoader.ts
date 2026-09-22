/**
 * Loads the Blitz Lab fonts from Google Fonts via @remotion/google-fonts.
 * Imported only by the composition (browser preview + worker render), never on
 * the server. loadFont() holds the render until the font file is ready.
 * Only latin and the weights we offer are fetched.
 */

import { loadFont as loadAnton } from '@remotion/google-fonts/Anton';
import { loadFont as loadBebasNeue } from '@remotion/google-fonts/BebasNeue';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';
import { loadFont as loadOswald } from '@remotion/google-fonts/Oswald';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';

let loaded = false;

export const loadBlitzFonts = (): void => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  loadMontserrat('normal', { weights: ['400', '600', '700', '800', '900'], subsets: ['latin'] });
  loadAnton('normal', { weights: ['400'], subsets: ['latin'] });
  loadBebasNeue('normal', { weights: ['400'], subsets: ['latin'] });
  loadPoppins('normal', { weights: ['400', '600', '700', '800', '900'], subsets: ['latin'] });
  loadOswald('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] });
  loadInter('normal', { weights: ['400', '600', '700', '800', '900'], subsets: ['latin'] });
};
