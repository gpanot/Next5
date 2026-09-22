// Brand home Quickstart on a 390 px phone: influencer → calendar → Zillow import → collapse.
// Needs NEXT5_ZILLOW_IMPORT_MOCK=true (plus the usual mock generation on next5_dev).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const OUT = process.env.E2E_OUT ?? '.data/e2e/quickstart';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const DB = process.env.E2E_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/next5_dev?sslmode=disable`;
const out = execSync(`DATABASE_URL="${DB}" npx tsx --env-file=.env.local scripts/dev-seed-business.ts quickstart-${Date.now()}@next5.local brand bare`).toString();
const link = out.match(/Sign in: (\S+)/)[1];
const assert = (ok, msg) => { if (!ok) throw new Error(`ASSERT: ${msg}`); console.log(`  ✓ ${msg}`); };
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const quickstart = page.getByRole('region', { name: 'Quickstart' });
const progress = () => quickstart.getByRole('progressbar').getAttribute('aria-valuenow');

await page.goto(link);
await page.waitForURL(/\/app\/brand/, { timeout: 30000 });
await page.goto(`${BASE}/app/brand`);
await quickstart.waitFor({ timeout: 20000 });
assert(await progress() === '0', 'starts at 0/4');
assert(await quickstart.getByRole('button', { name: 'Fill my calendar' }).isDisabled(), 'calendar step waits for a face or a listing');
await shot(page, '01-start');

// Step 1 → the influencer wizard, with a gallery face and 1 variation.
await quickstart.getByRole('link', { name: 'Create influencer' }).click();
await page.waitForURL(/\/app\/brand\/sets\/new/);
await page.getByRole('radio', { name: /Gallery/ }).click();
await page.getByRole('button', { name: 'Browse faces' }).click();
await page.getByRole('dialog', { name: 'Pick from gallery' }).locator('button').nth(1).click();
await page.getByRole('img', { name: 'Gallery face' }).waitFor();
await page.getByLabel(/^Name/).fill('Nora');
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Create influencer' }).click();
await page.getByText('1 variation · tap one to use it').waitFor({ timeout: 60000 });

await page.goto(`${BASE}/app/brand`);
await quickstart.waitFor();
await page.waitForFunction(() => /Done: Create your AI influencer/.test(document.body.textContent), null, { timeout: 15000 });
assert(Number(await progress()) >= 1, 'step 1 done after creating an influencer');

// Step 3 unlocked: the one variation is not on a posting day's plan yet, or it is — either answer is shown.
// Variations are faces, not posts: filling the calendar finds nothing to plan yet.
await page.getByText('Your feed this month').waitFor();
await page.waitForLoadState('networkidle');
await quickstart.getByRole('button', { name: 'Fill my calendar' }).click();
await page.getByText('No photos to plan yet').waitFor({ timeout: 20000 });
assert(await progress() === '1', 'the influencer variation is not planned as a post');
await shot(page, '02-after-influencer');

// Step 2: a bad link is refused in place; a Zillow link imports and opens Create with it.
await quickstart.getByLabel('Zillow listing link').fill('https://example.com/house');
await quickstart.getByRole('button', { name: 'Import listing' }).click();
await quickstart.getByRole('alert').waitFor();
assert(/Zillow home link/.test(await quickstart.getByRole('alert').innerText()), 'non-Zillow link shows an error');
await quickstart.getByLabel('Zillow listing link').fill('https://www.zillow.com/homedetails/2720-Carolyn-Dr-SE-Smyrna-GA-30080/14312548_zpid/');
await quickstart.getByRole('button', { name: 'Import listing' }).click();
await page.getByRole('dialog').waitFor();
await shot(page, '03-import-dialog');
await page.waitForURL(/\/app\/brand\/create\?listing=/, { timeout: 60000 });
await page.waitForTimeout(2500);
await shot(page, '04-create-listing');

await page.goto(`${BASE}/app/brand`);
await quickstart.waitFor();
await page.waitForFunction(() => /Done: Import a listing/.test(document.body.textContent), null, { timeout: 15000 });
assert(Number(await progress()) >= 2, 'step 2 done after the import');
assert(await quickstart.getByRole('button', { name: 'Connect Instagram' }).count() === 1, 'step 4 offers Instagram');
await shot(page, '05-progress');

// Hide and show again.
await page.getByRole('button', { name: 'Hide quickstart' }).click();
await page.getByText(/Quickstart · \d\/4 done/).waitFor();
await page.getByRole('button', { name: 'Show steps' }).click();
await quickstart.waitFor();
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(600);
await shot(page, '06-desktop');

assert(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
console.log('E2E brand quickstart OK');
await browser.close();
