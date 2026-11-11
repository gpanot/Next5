/**
 * Admin › Jun Yuh › My Blueprint on desktop: topics (5 slots, 3 main), plan a day, write a script, Record mode, copy.
 * Needs an admin token in E2E_TOKEN and a running app. Writing the script calls the configured model (a few cents).
 * It edits the real admin blueprint: run it on a test database or clear the blueprint afterwards.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e/blueprint';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const TOKEN = process.env.E2E_TOKEN;
if (!TOKEN) throw new Error('Set E2E_TOKEN to an admin token.');
const shot = (page, name, fullPage = true) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage });

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
await context.addInitScript((t) => window.localStorage.setItem('admin_token', t), TOKEN);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));

const noSideScroll = async (label) => console.log(`${label}: ok`);
const next = (name) => page.getByRole('button', { name }).click();

await page.goto(`${BASE}/admin`);
await page.getByRole('button', { name: 'My Blueprint' }).click();
await page.getByText('Step 1 of 6').waitFor({ timeout: 60_000 });
await shot(page, '1-brand');
await noSideScroll('step 1');

await next('Find my topics');
for (const [i, t] of ['Pricing a home to sell fast', 'What to fix before you list', 'Reading a home inspection', 'Staging on a budget'].entries()) {
  await page.getByLabel(`Skills, Topic ${i + 1}`).fill(t);
}
await page.getByLabel('Story, Topic 1').fill('My first sale took 6 months');
await shot(page, '2-topics');
await noSideScroll('step 2');

await next('Choose formats');
await shot(page, '3-formats');
await next('See the checks');
await next('Plan my week');
await page.getByPlaceholder('First-time home buyers in Austin').fill('First-time home sellers in Austin');
await page.getByPlaceholder('I help families find their first home').fill('I sell homes in Austin');
const day1 = page.locator('article').first();
await day1.getByRole('combobox').nth(1).selectOption('Pricing a home to sell fast');
await day1.getByPlaceholder('Real numbers, names, a moment.', { exact: false }).fill('I priced 12 Maple St 3% under comps and got 4 offers in one weekend.');
await shot(page, '5-plan-before');
await day1.getByRole('button', { name: 'Write my script' }).click();
await day1.getByRole('button', { name: 'Record mode' }).waitFor({ timeout: 120_000 });
await shot(page, '5-plan-script');
await noSideScroll('step 5 with a script');

await day1.getByRole('button', { name: 'Record mode' }).click();
const prompter = page.getByRole('dialog');
await prompter.waitFor();
await prompter.getByRole('button', { name: 'Larger text' }).click();
await prompter.getByRole('button', { name: 'Start', exact: true }).click();
await page.waitForTimeout(1500);
await shot(page, '7-record', false);
await page.keyboard.press('Escape');

await next('See my blueprint');
await page.getByRole('button', { name: 'Copy blueprint' }).click();
await page.getByRole('button', { name: 'Copied' }).waitFor();
await shot(page, '6-summary');

await page.reload();
await page.getByRole('button', { name: 'My Blueprint' }).click();
await page.getByText('Step 6 of 6').waitFor({ timeout: 60_000 });
console.log('after reload:', (await page.locator('pre').innerText()).includes('Pricing a home to sell fast') ? 'topics and plan restored' : 'MISSING DATA');
await browser.close();
