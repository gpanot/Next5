/**
 * Brand calendar (P19): onboarding → trial → the month is already planned →
 * open a post on a phone → copy the caption → it counts itself as posted.
 * Needs: NEXT5_BUSINESS_ENABLED=true NEXT5_MOCK_GENERATION=true on next5_dev.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const ROOT = `${process.cwd()}/public/images/business`;
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

const browser = await chromium.launch({ channel: 'chrome' });
// A phone: this feature is used between client calls, not at a desk.
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));

const email = `e2e-cal-${Date.now()}@example.com`;
await page.goto(`${BASE}/start/brand`);
await page.getByLabel('Email').fill(email);
await page.getByLabel('First name').fill('Mai');
await page.getByRole('button', { name: 'Real estate' }).click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('A few things before we start').waitFor();
for (const cb of await page.locator('input[type=checkbox]').all()) await cb.check({ force: true });
await page.getByRole('button', { name: 'Agree and continue' }).click();
await page.getByText('Add three selfies').waitFor();
const inputs = page.locator('input[type=file]');
for (let i = 0; i < 3; i++) await inputs.nth(i).setInputFiles(`${ROOT}/onboarding/selfie-good.png`);
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('Pick your set').waitFor();
await page.getByRole('radio').first().click();
await page.getByRole('button', { name: 'Save my set' }).click();
await page.getByText('Create your 3 free photos').waitFor();
await page.getByRole('button', { name: 'Create my free photos' }).click();
await page.waitForFunction(() => document.querySelectorAll('img[alt="Your free photo"]').length === 3, null, { timeout: 60000 });
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('Keep creating every month').waitFor();
await page.getByRole('button', { name: /Not now/ }).click();
await page.waitForURL(/\/app\/brand/, { timeout: 20000 });

// The dashboard leads with what to post.
await page.getByText(/Today’s post|Up next|No posts planned yet/).waitFor({ timeout: 20000 });
await shot(page, 'cal-0-dashboard');

// The calendar should already hold the trial photos — she never asked for a plan.
await page.goto(`${BASE}/app/brand/calendar`);
await page.getByText(/post this month|Your feed this month/).waitFor({ timeout: 20000 });
await page.waitForFunction(() => document.querySelectorAll('section h2').length > 0, null, { timeout: 15000 });
const days = await page.locator('section h2').count();
if (days === 0) throw new Error('calendar is empty: auto-fill did not run');

// The month grid, with her photos in the days.
await page.getByRole('button', { name: /^Post on \d{4}-\d{2}-\d{2}$/ }).first().waitFor({ timeout: 15000 });
await shot(page, 'cal-1-month');

// One tap on a day in the month opens that post.
await page.getByRole('button', { name: /^Post on \d{4}-\d{2}-\d{2}$/ }).first().click();
await page.getByRole('dialog').waitFor();
await page.getByRole('button', { name: 'Save photo' }).waitFor();
await page.waitForTimeout(600); // let the sheet finish animating in
await shot(page, 'cal-2-sheet');

// Copying the caption is what marks it posted — no checkbox to tick.
const copy = page.getByRole('button', { name: 'Copy caption' });
if (await copy.count()) {
  await copy.click();
} else {
  await page.getByRole('button', { name: 'Save photo' }).click();
}
await page.getByText(/Posted|copied/).first().waitFor({ timeout: 10000 });
await page.keyboard.press('Escape');
await page.getByText(/1 post this month/).waitFor({ timeout: 10000 });
await shot(page, 'cal-3-counted');

// Her days, changed without leaving the page.
await page.getByRole('button', { name: /You post on/ }).click();
await page.getByRole('button', { name: 'Mon', exact: true }).click();
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.getByText(/You post on .*Mon/).waitFor({ timeout: 10000 });
await shot(page, 'cal-4-cadence');

// Her properties are one tap from listing mode.
await page.getByText('Your properties').scrollIntoViewIfNeeded();
await shot(page, 'cal-5-properties');
await page.getByRole('link', { name: 'Property' }).click();
await page.waitForURL(/\/app\/brand\/create\?listing=new/, { timeout: 15000 });
await page.getByLabel('Paste your Zillow link').waitFor({ timeout: 15000 });

console.log('E2E brand calendar OK', email, `${days} days planned`);
await browser.close();
