// Copies the shared recorder core to the studio skill (plain JS there, no build step).
//   npm run recorder:sync            (studio at ~/.claude/skills/studio/app)
//   STUDIO_APP_DIR=<dir> npm run recorder:sync
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const source = path.resolve('src/components/admin/copyViral/recorder/recorderCore.js');
const dir = process.env.STUDIO_APP_DIR ?? path.join(os.homedir(), '.claude/skills/studio/app');
if (!fs.existsSync(dir)) {
  console.error(`No studio app folder at ${dir} (set STUDIO_APP_DIR)`);
  process.exit(1);
}
fs.copyFileSync(source, path.join(dir, 'recorderCore.js'));
console.log(`recorderCore.js -> ${dir}`);
