import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getObject, storageDriver } from '../../src/server/storage/objectStore';
const md5 = (b: Buffer) => createHash('md5').update(b).digest('hex');
async function main() {
  const id = 'cmv04aofq0000vu842bu4sajb';
  console.log('driver', storageDriver());
  const r2 = await getObject(`shorts-ab/${id}/frame-0.jpg`);
  console.log('r2 frame0', r2 && md5(r2), 'ab3 local', md5(readFileSync(`${process.env.OUT}/ab3/${id}/new-frame-0.jpg`)), 'ab local', md5(readFileSync(`${process.env.OUT}/ab/${id}/new-frame-0.jpg`)));
  const c = await getObject(`shorts-ab/${id}/clip-0.mp4`);
  console.log('clip0 size', c?.length);
}
void main();
