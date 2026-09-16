// Admin model bench: the form lists every WaveSpeed editing model, a run starts, and each model gets a result card.
// Needs the dev server and E2E_ADMIN_SECRET (the local ADMIN_SECRET). With a real WaveSpeed key it runs two of the
// cheapest models (about $0.02); without one the models fail, which still proves the flow:
// upload → prompt → per-model cards with time and price.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const SECRET = process.env.E2E_ADMIN_SECRET;
const PHOTO = process.env.E2E_BIG_PHOTO ?? `${process.cwd()}/public/images/business/onboarding/product-good-hanger.png`;
if (!SECRET) throw new Error('set E2E_ADMIN_SECRET');

const auth = await fetch(`${BASE}/api/admin/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: SECRET }) });
const { token } = await auth.json();
if (!token) throw new Error('admin login failed');

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript((t) => window.localStorage.setItem('studio_admin_token', JSON.stringify(t)), token);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const step = (msg) => console.log('✓', msg);
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

await page.goto(`${BASE}/admin`);
await page.evaluate((t) => window.localStorage.setItem('admin_token', t), token);
await page.reload();
await page.getByRole('button', { name: 'models' }).click();
await page.getByText('Model test').waitFor({ timeout: 20000 });
const modelButtons = page.locator('button[aria-pressed]');
assert(await modelButtons.count() >= 5, 'the bench should list every model');

// The search box narrows the list down to one vendor's models.
await page.getByLabel('Search a model').fill('klein-4b');
await page.waitForFunction(() => document.querySelectorAll('button[aria-pressed]').length <= 4, null, { timeout: 5000 });
step('the bench lists the models with their price, and the search narrows them');

await page.locator('input[type=file]').first().setInputFiles(PHOTO);
// Two of the cheapest models, so a real run costs about $0.02.
await page.getByRole('button', { name: 'Clear' }).click();
await page.getByRole('button', { name: /flux-2-klein-4b\/edit$/ }).first().click();
await page.getByLabel('Search a model').fill('z-image-turbo');
await page.getByRole('button', { name: /z-image-turbo/ }).first().click();
await page.getByLabel('Search a model').fill('');
await page.screenshot({ path: `${OUT}/admin-bench-form.png`, fullPage: true });
await page.getByRole('button', { name: /^Run 2 models/ }).click();
const newestRun = page.locator('section').nth(1); // section 0 is the form, and a new run goes on top
await newestRun.getByText('Z Image Turbo').waitFor({ timeout: 90000 });
const cards = newestRun.locator('figure');
await cards.first().waitFor({ timeout: 30000 });
assert(await cards.count() === 2, `expected 2 result cards, got ${await cards.count()}`);
console.log('  cards:', await cards.allInnerTexts());
await page.getByRole('button', { name: 'Show prompt' }).first().click();
await page.getByText(/Setting:/).waitFor({ timeout: 10000 });
await page.screenshot({ path: `${OUT}/admin-bench-run.png`, fullPage: true });
step('a run shows one card per model, with the drop prompt');

await browser.close();
console.log('E2E admin model test OK');
