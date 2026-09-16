/**
 * Listing mode (P20): one property photo must never become a tour of invented rooms.
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

const email = `e2e-listing-${Date.now()}@example.com`;
await page.goto(`${BASE}/start/brand`);
await page.getByLabel('Email').fill(email);
await page.getByLabel('First name').fill('Dana');
await page.getByRole('button', { name: 'Real estate' }).click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('A few things before we start').waitFor();
for (const cb of await page.locator('input[type=checkbox]').all()) await cb.check({ force: true });
await page.getByRole('button', { name: 'Agree and continue' }).click();
await page.getByText('Add three selfies').waitFor();
const selfies = page.locator('input[type=file]');
for (let i = 0; i < 3; i++) await selfies.nth(i).setInputFiles(`${ROOT}/onboarding/selfie-good.png`);
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

await page.goto(`${BASE}/app/brand/create`);
await page.getByText('Who is it for?').waitFor({ timeout: 20000 });

// Add a property. It cannot be created without the attestation.
await page.getByRole('button', { name: /Property/ }).click();
await page.getByLabel('Address or name').fill('2720 Ashford Dr');
const add = page.getByRole('button', { name: 'Add property' });
if (await add.isEnabled()) throw new Error('a property was addable without attesting');
await page.locator('input[type=checkbox]').first().check();
await add.click();
await page.getByText(/We put you in the photos you add here/).waitFor({ timeout: 15000 });
await shot(page, 'listing-1-added');

// One room photo → the count must follow the rooms, not a picker.
await page.locator('input[type=file]').first().setInputFiles(`${ROOT}/brand/themes/just-listed.png`);
await page.getByText('1 room × 2 = 2 photos.').waitFor({ timeout: 20000 });
await page.getByText(/^2 photos × 1 format/).waitFor({ timeout: 10000 });
await shot(page, 'listing-2-one-room');

// Three looks per room from one photo.
await page.getByRole('button', { name: '3 looks per room' }).click();
await page.getByText('1 room × 3 = 3 photos.').waitFor({ timeout: 10000 });

// A second room doubles it — this is how she gets volume, not by inventing rooms.
await page.getByRole('button', { name: '2 looks per room' }).click();
await page.locator('input[type=file]').first().setInputFiles(`${ROOT}/brand/sets/modern-office.png`);
await page.getByText('2 rooms × 2 = 4 photos.').waitFor({ timeout: 20000 });
await shot(page, 'listing-3-two-rooms');

// The visible AI label is off by default and she can turn it on.
const tag = page.getByRole('checkbox', { name: /visible “AI” label/ });
if (await tag.isChecked()) throw new Error('the visible AI label was on by default');
await tag.check();
await page.waitForTimeout(800);
await shot(page, 'listing-4-label-on');

// Back to "just me" and the old photo-count picker returns.
await page.getByRole('button', { name: 'Just me' }).click();
await page.getByText('How many photos?').waitFor({ timeout: 10000 });

console.log('E2E brand listing OK', email);
await browser.close();
