import { readFile } from 'fs/promises';
import { transcribe } from '../../src/server/shorts/wordTiming';
const main = async () => {
  for (const id of process.argv.slice(2)) {
    const heard = await transcribe(await readFile(`${id}`), '');
    console.log(id, '|', heard.map((h) => h.word).join(' '));
  }
};
void main();
