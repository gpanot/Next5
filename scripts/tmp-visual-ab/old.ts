import { writeFileSync } from 'node:fs';
import { getObject } from '../../src/server/storage/objectStore';
async function main() { for (const id of process.argv.slice(2)) for (let i = 0; i < 7; i++) { const b = await getObject(`shorts/${id}/frame-${i}.jpg`); if (b) writeFileSync(`${process.env.OUT}/${id}/old-frame-${i}.jpg`, b); } }
void main();
