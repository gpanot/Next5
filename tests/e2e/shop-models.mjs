// The shop look editor offers Studio models for every market (Asian, White, Black, Arabic, Latina).
// Needs the dev server in mock mode and a seeded database (npm run db:seed:business).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const STORE = 'https://shop.tiktok.com/us/store/flux-hoodies/8652615273314554588';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const step = (msg) => console.log('✓', msg);

// Sign up far enough to reach the model step.
await page.goto(`${BASE}/start/shop`);
await page.getByLabel('Email').fill(`e2e-models-${Date.now()}@example.com`);
await page.getByLabel('First name').fill('Mai');
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('A few things before we start').waitFor();
await page.locator('input[type=checkbox]').nth(1).check({ force: true });
await page.locator('input[type=checkbox]').nth(2).check({ force: true });
await page.getByRole('button', { name: 'Agree and continue' }).click();
await page.getByText('Who wears your products?').waitFor();
await page.getByRole('button', { name: /Studio model/ }).click();

const markets = ['All', 'Asian', 'White', 'Black', 'Arabic', 'Latina'];
for (const market of markets) await page.getByRole('button', { name: market, exact: true }).waitFor({ timeout: 20000 });
const all = await page.getByRole('radio').count();
assert(all === 14, `expected 14 studio models, got ${all}`);
await page.screenshot({ path: `${OUT}/models-all.png`, fullPage: true });

for (const market of ['White', 'Black', 'Arabic', 'Latina']) {
  await page.getByRole('button', { name: market, exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[role=radio]').length === 2, null, { timeout: 10000 });
}
await page.screenshot({ path: `${OUT}/models-latina.png`, fullPage: true });
step('every market has models, and the filter shows them');

// A model from a new market can be picked and used for the look.
await page.getByRole('radio').first().click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('Pick your shop look').waitFor({ timeout: 20000 });
await page.getByRole('radio').nth(1).click();
await page.getByLabel('Your TikTok Shop link').fill(STORE);
await page.getByText('I own or manage this shop.').click();
await page.getByRole('button', { name: 'Import my store' }).click();
await page.waitForFunction(() => { const r = document.querySelector('[aria-label="Product for your free photos"] [role=radio]'); return r && !r.hasAttribute('disabled'); }, null, { timeout: 60000 });
step('a Latina model carries through to the shop look');

await browser.close();
console.log('E2E shop models OK');
