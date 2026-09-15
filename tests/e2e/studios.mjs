// Two studios, one account: legacy redirects, add-studio screen, switcher, batch deep links.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const DB = process.env.E2E_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/next5_dev?sslmode=disable`;
const email = `studios-${Date.now()}@next5.local`;
const seed = (product) => execSync(`DATABASE_URL="${DB}" npx tsx --env-file=.env.local scripts/dev-seed-business.ts ${email} ${product}`).toString();
const link = seed('brand').match(/Sign in: (\S+)/)[1];
const assert = (cond, msg) => { if (!cond) throw new Error(msg); console.log('✓', msg); };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
await page.waitForURL(/\/app\/brand$/, { timeout: 20000 });
assert(true, '/app?token → /app/brand');

await page.goto(`${BASE}/app/shop`);
await page.getByRole('heading', { name: 'Add Shop Studio' }).waitFor({ timeout: 15000 });
assert(true, 'a studio you do not have shows Add Shop Studio');

seed('shop');
await page.goto(`${BASE}/app/create?theme=just-listed`);
await page.waitForURL(/\/app\/brand\/create\?theme=just-listed$/, { timeout: 15000 });
assert(true, 'legacy /app/create keeps the last studio and the query');

await page.getByRole('tab', { name: /Shop/ }).click();
await page.waitForURL(/\/app\/shop$/, { timeout: 15000 });
await page.getByRole('link', { name: 'Create drop' }).waitFor();
assert(true, 'switcher opens Shop Studio with its own menu');
await page.screenshot({ path: `${OUT}/studios-shop.png` });

const token = await page.evaluate(() => localStorage.getItem('studio_token'));
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const { sets } = await (await fetch(`${BASE}/api/app/sets?product=brand`, { headers: auth })).json();
const created = await (await fetch(`${BASE}/api/app/batches`, { method: 'POST', headers: auth, body: JSON.stringify({ product: 'brand', kind: 'brand_theme', setId: sets[0].id, themeId: 'just-listed', count: 8, formats: ['portrait_4_5'], highRes: false }) })).json();
await page.goto(`${BASE}/app/batches/${created.batch.id}`);
await page.waitForURL(new RegExp(`/app/brand/batches/${created.batch.id}$`), { timeout: 15000 });
assert(true, 'legacy batch link opens in the batch’s own studio (brand), even when Shop was last used');

await page.goto(`${BASE}/app/settings`);
await page.getByRole('heading', { name: 'Settings' }).waitFor();
assert(page.url().endsWith('/app/settings'), 'settings stay shared');
await browser.close();
console.log('E2E studios OK', email);
