/**
 * Listing mode (P20): one property photo must never become a tour of invented rooms.
 * Zillow import (P21): paste link + attest → Add property → all photos come in → remove / add back → Ready.
 * Needs: NEXT5_BUSINESS_ENABLED=true NEXT5_MOCK_GENERATION=true on next5_dev.
 * The Zillow part uses Apify when APIFY_TOKEN is set (≈ $0.004), else the spike fixtures.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const ROOT = `${process.cwd()}/public/images/business`;
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
/** Zillow photos come straight from Zillow's CDN; wait until the first ones have really loaded. */
const zillowImagesLoaded = (page, count) =>
  page.waitForFunction((n) => {
    const imgs = [...document.querySelectorAll('img[src*="zillowstatic.com"]')].slice(0, n);
    return imgs.length === n && imgs.every((img) => img.complete && img.naturalWidth > 0);
  }, count, { timeout: 20000 });

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

// Add a property from her own photos. It cannot be created without the attestation.
await page.getByRole('button', { name: /Property/ }).click();
await page.getByText('Paste your Zillow link').waitFor({ timeout: 10000 });
await page.getByRole('button', { name: 'Upload photos instead' }).click();
await page.getByLabel('Address or name').fill('2720 Ashford Dr');
const add = page.getByRole('button', { name: 'Add property' });
if (await add.isEnabled()) throw new Error('a property was addable without attesting');
await page.locator('input[type=checkbox]').first().check();
await add.click();
await page.getByText(/We put you in the photos you keep here/).waitFor({ timeout: 15000 });
await shot(page, 'listing-1-added');

// One photo → the count must follow her photos, not a picker.
await page.locator('input[type=file]').first().setInputFiles(`${ROOT}/brand/themes/just-listed.png`);
// One look per photo unless she asks for more.
await page.getByText('1 photo × 1 = 1 photo.').waitFor({ timeout: 20000 });
await page.getByText(/^1 photo × 1 format/).waitFor({ timeout: 10000 });
await shot(page, 'listing-2-one-room');

// Three looks per photo from one photo.
await page.getByRole('button', { name: '3 looks per photo' }).click();
await page.getByText('1 photo × 3 = 3 photos.').waitFor({ timeout: 10000 });

// A second photo doubles it — this is how she gets volume, not by inventing rooms.
await page.getByRole('button', { name: '2 looks per photo' }).click();
await page.locator('input[type=file]').first().setInputFiles(`${ROOT}/brand/sets/modern-office.png`);
await page.getByText('2 photos × 2 = 4 photos.').waitFor({ timeout: 20000 });
await shot(page, 'listing-3-two-rooms');

// A property has no set and no theme: it asks what is happening and how she looks.
for (const gone of ['Set', 'Theme']) {
  if (await page.getByRole('heading', { name: gone, exact: true }).count()) throw new Error(`${gone} is still shown for a property`);
}
await page.getByText('Your style').waitFor();
// An uploaded home: nothing is picked for her, and she cannot generate until she picks.
await page.getByText('What’s happening?').waitFor();
if (await page.locator('[aria-pressed=true]').filter({ hasText: /^(Coming soon|Just listed|For sale|Open house|Under contract|Just sold)$/ }).count()) {
  throw new Error('an occasion was guessed for an uploaded home');
}
await page.getByText('Pick what’s happening with this home.').waitFor();
if (await page.getByRole('button', { name: /^Generate/ }).isEnabled()) throw new Error('could generate without an occasion');
await page.getByRole('button', { name: 'Open house', exact: true }).click();
await page.getByText('Pick what’s happening with this home.').waitFor({ state: 'detached', timeout: 10000 });
// With an occasion the estimate comes back (this trial account then shows Top up, not Generate).
await page.getByText('4 photos × 1 format = 4 photos').waitFor({ timeout: 15000 });
// Her style is one line until she changes it.
await page.getByRole('button', { name: 'Change', exact: true }).click();
await page.getByRole('button', { name: 'Business formal', exact: true }).click();
await shot(page, 'listing-3b-occasion-style');

// The visible AI label is off by default and she can turn it on.
const tag = page.getByRole('checkbox', { name: /visible “AI” label/ });
if (await tag.isChecked()) throw new Error('the visible AI label was on by default');
await tag.check();
await page.waitForTimeout(800);
await shot(page, 'listing-4-label-on');

// Back to "just me" and the old photo-count picker returns.
await page.getByRole('button', { name: 'Just me' }).click();
await page.getByText('How many photos?').waitFor({ timeout: 10000 });
await page.getByRole('heading', { name: 'Theme', exact: true }).waitFor();

// Zillow: paste a home link, say she represents it, Add property → every photo comes in → she cleans up.
await page.getByRole('button', { name: /Property/ }).click();
const addProperty = page.getByRole('button', { name: 'Add property' });
await page.getByLabel('Paste your Zillow link').fill('https://www.zillow.com/austin-tx/');
await page.getByText('I represent this property.').click();
if (await addProperty.isEnabled()) throw new Error('a search page link was accepted');
await page.getByLabel('Paste your Zillow link').fill('https://www.zillow.com/homedetails/2720-Carolyn-Dr-SE-Smyrna-GA-30080/14312548_zpid/');
await page.getByText('I represent this property.').click();
if (await addProperty.isEnabled()) throw new Error('a property was addable without attesting');
await page.getByText('I represent this property.').click();
await shot(page, 'zillow-1-link');
await addProperty.click();
await page.getByText(/Getting your photos from Zillow/).waitFor({ timeout: 15000 });
await shot(page, 'zillow-2-loading');
await page.getByText('20 photos', { exact: true }).waitFor({ timeout: 120000 });
await page.getByText(/\$399,000 · 3 bd · 2 ba/).waitFor();
await page.getByText('20 photos × 2 = 40 photos.').waitFor({ timeout: 10000 });
// Zillow says it: the occasion is picked from the listing status.
await page.locator('[aria-pressed=true]', { hasText: 'Just listed' }).waitFor({ timeout: 10000 });
await page.getByText('From the Zillow listing.', { exact: false }).waitFor();
await page.mouse.wheel(0, 650);
await page.waitForTimeout(1500);
await shot(page, 'zillow-3-imported');

// She removes a photo she doesn't want, then adds it back from Zillow.
await page.getByRole('button', { name: /^Remove / }).first().click();
await page.getByText('19 photos', { exact: true }).waitFor({ timeout: 10000 });
await page.getByRole('button', { name: '1 more on Zillow' }).click({ timeout: 15000 });
await page.getByText('Add photos back from Zillow').waitFor();
await zillowImagesLoaded(page, 1);
await page.locator('[aria-pressed=false]').filter({ has: page.locator('img[src*="zillowstatic.com"]') }).first().click();
await shot(page, 'zillow-4-add-back');
await page.getByRole('button', { name: 'Add 1 photo' }).click();
await page.getByText('20 photos', { exact: true }).waitFor({ timeout: 30000 });
await shot(page, 'zillow-5-cleaned');
if (await page.getByRole('button', { name: 'Done with my photos' }).count()) throw new Error('Done with my photos is back');

console.log('E2E brand listing OK', email);
await browser.close();
