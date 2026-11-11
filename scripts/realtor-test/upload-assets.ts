/** One-off: copy public/realtor/{music,sfx} to R2 (realtor/assets/…), where the worker reads them. */
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { uploadToR2 } from '../../src/lib/r2';
import { R2_ASSET_PREFIX } from '../../src/server/realtorVideo/build';

const main = async () => {
  for (const dir of ['music', 'sfx']) {
    for (const file of await readdir(path.join('public', 'realtor', dir))) {
      const key = `${R2_ASSET_PREFIX}${dir}/${file}`;
      await uploadToR2(key, await readFile(path.join('public', 'realtor', dir, file)), 'audio/mpeg');
      console.log('uploaded', key);
    }
  }
};
void main();
