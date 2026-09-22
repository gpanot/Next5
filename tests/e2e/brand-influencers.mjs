// Influencers on a 390 px phone: describe → 1 variation → pick it → create 1 photo with it;
// then a gallery face and an uploaded photo; key checks on the API; archive.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const OUT = process.env.E2E_OUT ?? '.data/e2e/influencers';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const DB = process.env.E2E_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/next5_dev?sslmode=disable`;
const EMAIL = `influencers-${Date.now()}@next5.local`;
// E2E_REAL=1 against a server with NEXT5_MOCK_GENERATION=false: 1 portrait + 1 variation + 1 photo, then stop.
const REAL = process.env.E2E_REAL === '1';
const WAIT = REAL ? 240000 : 60000;
const out = execSync(`DATABASE_URL="${DB}" npx tsx --env-file=.env.local scripts/dev-seed-business.ts ${EMAIL} brand bare`).toString();
const link = out.match(/Sign in: (\S+)/)[1];
const sql = (q) => execSync(`psql "${DB}" -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const assert = (ok, msg) => { if (!ok) throw new Error(`ASSERT: ${msg}`); console.log(`  ✓ ${msg}`); };
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));

await page.goto(link);
await page.waitForURL(/\/app\/brand/, { timeout: 30000 });

// 1. Empty state.
await page.goto(`${BASE}/app/brand/sets`);
await page.getByText('Create your first AI influencer').waitFor({ timeout: 20000 });
await shot(page, '01-empty');

// 2. Describe → AI portrait.
await page.getByRole('button', { name: 'New influencer' }).first().click();
await page.getByText('Choose a face').waitFor();
assert(await page.getByRole('button', { name: 'Make the portrait' }).isDisabled(), 'portrait button waits for a description');
await page.getByLabel('Describe them').fill('warm smile, shoulder-length brown hair, navy blazer');
await page.getByLabel('Gender').selectOption('Female');
await page.getByRole('button', { name: 'Make the portrait' }).click();
await page.getByRole('img', { name: 'AI portrait' }).waitFor({ timeout: WAIT });
await page.getByLabel(/^Name/).fill('Maya');
await shot(page, '02-face-generated');
await page.getByRole('button', { name: 'Continue' }).click();

// 3. Styles: default is the first style, 1 photo.
await page.getByText('Pick styles', { exact: true }).first().waitFor();
await page.getByText('1 photo · 1 credit').waitFor();
await shot(page, '03-variations');
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('Review').first().waitFor();
await shot(page, '04-review');
await page.getByRole('button', { name: 'Create influencer' }).click();

// 4. List: the variation arrives while the page is open.
await page.waitForURL(/\/app\/brand\/sets$/, { timeout: 20000 });
await page.getByRole('heading', { name: 'Maya' }).waitFor();
await page.getByText('1 variation · tap one to use it').waitFor({ timeout: WAIT });
const maya = sql(`select id from influencers where name='Maya' and workspace_id=(select w.id from workspaces w join users u on u.id=w.owner_user_id where u.email='${EMAIL}' and w.product='brand')`);
assert(sql(`select count(*) from batch_items bi join batches b on b.id=bi.batch_id join studio_sets s on s.id=b.set_id where s.influencer_id='${maya}'`) === '1', 'exactly 1 variation was made (not 30)');
assert(sql(`select bool_and(b.variation) from batches b join studio_sets s on s.id=b.set_id where s.influencer_id='${maya}'`) === 't', 'wizard batches are flagged as variations');
const listed = await page.evaluate(async () => {
  const token = localStorage.getItem('studio_token');
  const res = await fetch('/api/app/batches?product=brand', { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).batches.length;
});
assert(listed === 0, 'variations stay out of the batch list');
await page.goto(`${BASE}/app/brand/library`);
await page.waitForLoadState('networkidle');
assert(await page.locator('img[alt^="Cover of"]').count() === 0, 'variations stay out of the library');
await page.goto(`${BASE}/app/brand/sets`);
await page.getByRole('radio', { name: 'Maya, variation 1' }).click();
await shot(page, '05-list-variation-picked');

// 5. Create 1 photo with that variation.
await page.getByRole('link', { name: 'Create with this face' }).click();
await page.waitForURL(/\/app\/brand\/create\?influencerId=.+&photo=/);
await page.getByText('Which photo of Maya?').waitFor({ timeout: 20000 });
assert(await page.getByRole('radio', { name: 'Maya, variation 1' }).getAttribute('aria-checked') === 'true', 'deep link preselects the variation');
await page.getByRole('button', { name: /^1 photo · just to try/ }).click();
await page.waitForFunction(() => /Generate 1 photo/.test(document.body.innerText), null, { timeout: 20000 });
await shot(page, '06-create');
await page.getByRole('button', { name: /Generate 1 photo/ }).click();
await page.waitForURL(/\/app\/brand\/batches\//, { timeout: 20000 });
const batchId = page.url().split('/batches/')[1].split(/[?#]/)[0];
const variationKey = sql(`select bi.r2_key from batch_items bi join batches b on b.id=bi.batch_id join studio_sets s on s.id=b.set_id where s.influencer_id='${maya}' and bi.status='ready' limit 1`);
const inputKeys = sql(`select array_to_string(input_r2_keys, ',') from batch_items where batch_id='${batchId}'`);
assert(inputKeys.split(',').includes(variationKey), 'the new photo uses the chosen variation as the face');
await page.waitForFunction(() => /1 of 1 ready/.test(document.body.innerText), null, { timeout: WAIT });
await shot(page, '07-batch');
assert(sql(`select variation from batches where id='${batchId}'`) === 'f', 'a Create batch is a normal batch, not a variation');
assert(sql(`select count(*) from post_slots ps join batch_items bi on bi.id=ps.item_id join batches b on b.id=bi.batch_id where b.variation`) === '0', 'no variation is planned on the calendar');
if (REAL) {
  console.log('E2E brand influencers (real generation) OK');
  await browser.close();
  process.exit(0);
}

// 6. Gallery face.
await page.goto(`${BASE}/app/brand/sets/new`);
await page.getByRole('radio', { name: /Gallery/ }).click();
await page.getByRole('button', { name: 'Browse faces' }).click();
const gallery = page.getByRole('dialog', { name: 'Pick from gallery' });
await gallery.waitFor();
await page.waitForTimeout(800);
await shot(page, '08-gallery');
await gallery.locator('button').nth(1).click();
await page.getByRole('img', { name: 'Gallery face' }).waitFor();
await page.getByLabel(/^Name/).fill('Gia');
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Create influencer' }).click();
await page.getByRole('heading', { name: 'Gia' }).waitFor({ timeout: 20000 });
assert(sql(`select base_image_key from influencers where name='Gia' order by created_at desc limit 1`).startsWith('influencer-gallery/'), 'gallery influencer stores the gallery image key, not a URL');

// 7. Uploaded photo.
await page.goto(`${BASE}/app/brand/sets/new`);
await page.getByRole('radio', { name: /Use a photo/ }).click();
await page.getByLabel('Upload a photo').setInputFiles('public/images/business/us/ai-avatars/avatar-2-maria.jpg');
await page.getByRole('img', { name: 'Your photo' }).waitFor({ timeout: 20000 });
await page.getByLabel(/^Name/).fill('Uma');
await shot(page, '09-upload');
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Create influencer' }).click();
await page.getByRole('heading', { name: 'Uma' }).waitFor({ timeout: 20000 });
await page.waitForFunction(() => !/Making \d+ variation/.test(document.body.innerText), null, { timeout: 90000 });
await shot(page, '10-list-three');

// 8. The API refuses keys the wizard did not make, and variations of someone else.
const api = (path, body) => page.evaluate(async ([p, b]) => {
  const token = localStorage.getItem('studio_token');
  const res = await fetch(p, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  return res.status;
}, [path, body]);
const themeId = sql(`select id from themes where is_active limit 1`);
const templateId = sql(`select id from set_templates where is_active and product='brand' limit 1`);
assert(await api('/api/app/influencers', { product: 'brand', name: 'Bad', source: 'uploaded', baseImageKey: 'identity/someone-else/face.jpg', templateIds: [templateId] }) === 400, 'arbitrary storage key is refused');
assert(await api('/api/app/influencers', { product: 'brand', name: 'Ghost', source: 'gallery', galleryItemId: 'missing', templateIds: [templateId] }) === 404, 'unknown gallery face is refused');
assert(await api('/api/app/batches/estimate', { product: 'brand', kind: 'brand_theme', setId: sql(`select id from studio_sets where influencer_id='${maya}' limit 1`), themeId, count: 1, formats: ['portrait_4_5'], influencerId: maya, influencerPhotoId: 'not-a-photo' }) === 404, 'unknown variation id is refused');

// 9. Archive.
await page.goto(`${BASE}/app/brand/sets`);
await page.getByRole('button', { name: 'Archive Uma' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Archive' }).click();
await page.getByRole('heading', { name: 'Uma', exact: true }).waitFor({ state: 'detached' });
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(800);
await shot(page, '11-list-desktop');

assert(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
console.log('E2E brand influencers OK');
await browser.close();
