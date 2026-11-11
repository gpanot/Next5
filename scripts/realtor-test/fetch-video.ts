import { writeFile } from 'fs/promises';
import { getObjectBuffer } from '../../src/lib/r2';
const main = async () => {
  for (const id of process.argv.slice(2)) {
    const buf = await getObjectBuffer(`listing-videos/${id}/video.mp4`);
    if (buf) await writeFile(`out/realtor/e2e/${id}.mp4`, buf);
    console.log(id, buf?.length);
  }
};
void main();
