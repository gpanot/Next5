/**
 * Property photos after generation (P21): Recents… picker, "Add to calendar" per photo, trash to archive,
 * and the library grouped by series. Uses an uploaded property (no Apify call).
 * Needs: NEXT5_BUSINESS_ENABLED=true NEXT5_MOCK_GENERATION=true on next5_dev.
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const DB = process.env.E2E_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/next5_dev?sslmode=disable`;
const email = `e2e-results-${Date.now()}@next5.local`;
const out = execSync(`DATABASE_URL="${DB}" npx tsx --env-file=.env.local scripts/dev-seed-business.ts ${email} brand`, { cwd: process.cwd() }).toString();
const link = out.match(/Sign in: (\S+)/)[1];
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(0, 120)); });
process.on('uncaughtException', async (e) => { await page.screenshot({ path: `${OUT}/results-fail.png` }).catch(() => {}); console.log('FAIL', e.message.slice(0, 300)); process.exit(1); });
await page.goto(link);
await page.getByText('Recent batches').waitFor({ timeout: 20000 });

// A property from her own photo.
await page.goto(`${BASE}/app/brand/create`);
await page.getByText('Who is it for?').waitFor({ timeout: 20000 });
if (await page.getByRole('button', { name: /Recents/ }).count()) throw new Error('Recents shown with no properties');
await page.getByRole('button', { name: /Property/ }).click();
await page.getByRole('button', { name: 'Upload photos instead' }).click();
await page.getByLabel('Address or name').fill('24 Oak St');
await page.locator('input[type=checkbox]').first().check();
await page.getByRole('button', { name: 'Add property' }).click();
await page.getByText(/We put you in the photos you keep here/).waitFor({ timeout: 15000 });
await page.locator('input[type=file]').first().setInputFiles(`${process.cwd()}/public/images/business/brand/themes/just-listed.png`);
await page.getByText('1 photo × 2 = 2 photos.').waitFor({ timeout: 20000 });

// Recents…: only the picked property shows; earlier ones live in the pop-up.
await page.getByRole('button', { name: 'Just me' }).click();
await page.getByRole('button', { name: /Recents/ }).click();
await page.getByText('Recent properties').waitFor();
await page.waitForTimeout(500);
await shot(page, 'results-1-recents');
await page.getByRole('button', { name: /24 Oak St/ }).click();
await page.getByText('1 photo × 2 = 2 photos.').waitFor({ timeout: 10000 });

// Make the photos from the Ready step.
await page.getByRole('button', { name: 'Done with my photos' }).click();
await page.getByRole('button', { name: /Make my \d+ photos/ }).click({ timeout: 15000 });
await page.waitForURL(/\/app\/brand\/batches\//, { timeout: 20000 });
await page.waitForFunction(() => /2 of 2 ready|2 photos/.test(document.body.innerText) && document.querySelectorAll('button[aria-pressed]').length >= 2, null, { timeout: 120000 });
await page.getByRole('button', { name: 'Add to calendar' }).first().waitFor({ timeout: 30000 });
if (await prisma_slots() !== 0) throw new Error('property photos were auto-added to the calendar');
await shot(page, 'results-2-batch');

// Add one photo to the calendar; archive the other.
await page.getByRole('button', { name: 'Add to calendar' }).first().click();
await page.getByRole('button', { name: /On calendar, / }).waitFor({ timeout: 15000 });
await page.getByRole('button', { name: 'Archive' }).nth(1).click();
await page.getByText('Photo archived').waitFor({ timeout: 10000 });
await page.waitForFunction(() => document.querySelectorAll('button[aria-label="Archive"]').length === 1, null, { timeout: 10000 });
await shot(page, 'results-3-picked');
if (await prisma_slots() !== 1) throw new Error('expected exactly one calendar post');

// Library: series first, with the property label; tapping opens the series.
await page.goto(`${BASE}/app/brand/library`);
await page.getByRole('button', { name: 'Properties' }).click();
await page.getByText('Property · 24 Oak St').waitFor({ timeout: 20000 });
await page.getByText('1 photo', { exact: true }).waitFor();
await shot(page, 'results-4-library');
await page.getByText('Property · 24 Oak St').click();
await page.waitForURL(/\/app\/brand\/batches\//, { timeout: 15000 });
await page.getByRole('button', { name: /On calendar, / }).waitFor({ timeout: 15000 });

console.log('E2E brand listing results OK', email);
await browser.close();

function prisma_slots() {
  const sql = `SELECT count(*) FROM post_slots s JOIN workspaces w ON w.id = s.workspace_id JOIN users u ON u.id = w.owner_user_id WHERE u.email = '${email}'`;
  return Number(execSync(`psql "${DB}" -tAc "${sql}"`).toString().trim());
}
