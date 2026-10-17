// End-to-end check (2026-10-17): the real narrateSlides on a narrated BlitzProject's original captions, written as a
// plan + voice.wav for blitz-worker/src/spokenTestRender.ts.
// Run: npx tsx --env-file=.env.local scripts/tmp-synced-captions/e2e.ts <blitzProjectId> <outRoot>
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../../src/lib/db';
import { narrateSlides } from '../../src/server/labs/blitzVoice';
import { getObject } from '../../src/server/storage/objectStore';

type Row = { template_id: string; ws: string | null; slides: { text: string; backgroundKey?: string; camera?: unknown; positionY?: number }[]; narration: { voice: string }; text_config_override: unknown };

(async () => {
  const [id, outRoot] = process.argv.slice(2);
  const [row] = await prisma.$queryRaw<Row[]>`
    SELECT template_id, workspace_id AS ws, current_assets->'slides' AS slides, current_assets->'narration' AS narration,
      current_assets->'textConfigOverride' AS text_config_override
    FROM blitz_projects WHERE id = ${id}`;
  const t = Date.now();
  // The stored slide texts are the captions the narration was written from (before 2026-10-17).
  const n = await narrateSlides(row!.slides, row!.narration.voice, row!.ws);
  console.log(`narrated in ${((Date.now() - t) / 1000).toFixed(1)} s, ${n.durationSeconds} s`);
  n.slides.forEach((s, i) => console.log(`  ${i + 1}. ${s.text}\n     ${s.words.map((w) => `${w.word}@${w.startS}`).join(' ')}`));
  const dir = path.join(outRoot!, id!);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'voice.wav'), (await getObject(n.audioKey))!);
  await writeFile(path.join(dir, 'plan-e2e.json'), JSON.stringify({ total: n.durationSeconds, body: { templateId: row!.template_id, textConfigOverride: row!.text_config_override ?? undefined }, slides: n.slides }, null, 2));
  process.exit(0);
})();
