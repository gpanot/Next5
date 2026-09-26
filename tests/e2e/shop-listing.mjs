// Shop listing workflow: listing Post Kit (kept), "Create more photos" in the product row, earlier photos,
// TikTok library Remove/Add (no duplicates) and 9:16 cover, add "You" as a model, archive a scene.
// Run the dev server with NEXT5_MOCK_GENERATION=true and NEXT5_SHOP_IMPORT_MOCK=true (see README).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const ROOT = `${process.cwd()}/public/images/business`;
const STORE = 'https://shop.tiktok.com/us/store/flux-hoodies/8652615273314554588';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const step = (msg) => console.log('✓', msg);
const shot = (name) => page.screenshot({ path: `${OUT}/listing-${name}.png`, fullPage: true });
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

/** Opens the newest batch from Home and waits until every photo is ready (mock generation advances on each poll). */
const openNewestBatch = async () => {
  await page.goto(`${BASE}/app/shop`);
  const card = page.locator('a[href*="/app/shop/batches/"]').first();
  await card.waitFor({ timeout: 20000 });
  await card.click();
  await page.waitForFunction(() => /(\d+) of \1 ready/.test(document.body.innerText), null, { timeout: 120000 });
};

// 1. Onboarding with store import → free photos → Growth (simulated transfer).
await page.goto(`${BASE}/start/shop`);
await page.getByLabel('Email').fill(`e2e-listing-${Date.now()}@example.com`);
await page.getByLabel('First name').fill('Lan');
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('A few things before we start').waitFor();
await page.locator('input[type=checkbox]').nth(1).check({ force: true }); // AI labels
await page.locator('input[type=checkbox]').nth(2).check({ force: true }); // terms (no face consent: Studio model)
await page.getByRole('button', { name: 'Agree and continue' }).click();
await page.getByText('Who wears your products?').waitFor();
await page.getByRole('button', { name: /Studio model/ }).click();
await page.getByRole('radio').first().click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('Pick your scene').waitFor();
await page.getByRole('radio').nth(1).click();
await page.getByLabel('Your TikTok Shop link').fill(STORE);
await page.getByText('I own or manage this shop.').click();
await page.getByRole('button', { name: 'Import my store' }).click();
await page.waitForFunction(() => { const r = document.querySelector('[aria-label="Product for your free photos"] [role=radio]'); return r && !r.hasAttribute('disabled'); }, null, { timeout: 60000 });
await page.getByRole('radiogroup', { name: 'Product for your free photos' }).getByRole('radio').first().click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Create my free photos' }).click();
await page.waitForFunction(() => document.querySelectorAll('img[alt="Your free photo"]').length === 3, null, { timeout: 90000 });
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('Keep creating every month').waitFor({ timeout: 20000 });
await page.getByRole('button', { name: 'Choose Growth' }).click();
await page.getByText('Transfer memo').waitFor();
await page.getByRole('button', { name: /Simulate transfer/ }).click();
await page.getByText('Payment received').waitFor({ timeout: 20000 });
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForURL(/\/app\/shop/, { timeout: 20000 });
step('onboarded with a store, free photos and Growth');

// 2. Listing Post Kit: written once, still there after reload.
await openNewestBatch();
await page.getByRole('button', { name: 'Write Post Kit' }).click();
const dialog = page.getByRole('dialog', { name: 'Listing Post Kit' });
await dialog.getByText('Product description').waitFor({ timeout: 30000 });
const hook = await dialog.locator('section[aria-label="Post Kit"] p').nth(1).innerText();
await shot('1-post-kit');
await dialog.getByRole('button', { name: 'Close dialog' }).click();
await page.reload();
await page.waitForFunction(() => /(\d+) of \1 ready/.test(document.body.innerText), null, { timeout: 60000 });
await page.getByRole('button', { name: 'Post Kit', exact: true }).click();
await page.getByRole('dialog', { name: 'Listing Post Kit' }).getByText(hook).waitFor({ timeout: 10000 });
await page.getByRole('dialog', { name: 'Listing Post Kit' }).getByRole('button', { name: 'Close dialog' }).click();
step('listing Post Kit is kept after reload');

// 3. "Create more photos" inside the product row; the new batch row shows the earlier photos.
// The product row (its header has the Zip button); its text changes once more photos start.
const row = page.locator('section').filter({ has: page.getByRole('button', { name: 'Zip' }) }).first();
await row.getByText('TikTok listings with 5 to 9 photos sell better', { exact: false }).waitFor();
await row.getByRole('button', { name: /Create \d+ more/ }).click();
await row.getByText('New angles are being created for this product.').waitFor({ timeout: 20000 });
await shot('2-more-started');
const firstBatchUrl = page.url();
await row.getByRole('link', { name: /Open/ }).click();
await page.waitForURL((url) => url.href !== firstBatchUrl, { timeout: 20000 });
await page.getByText(/^More photos ·/).waitFor({ timeout: 20000 });
await page.waitForFunction(() => /(\d+) of \1 ready/.test(document.body.innerText), null, { timeout: 120000 });
const earlier = await page.getByText('Earlier', { exact: true }).count();
assert(earlier === 3, `expected 3 earlier photos in the row, got ${earlier}`);
await shot('3-more-batch');
step('more photos created from the row; the row shows the 3 earlier photos');

// 4. TikTok library: Remove shows the photo once under "Not in the pack", Add puts it back; create a cover.
await page.goto(`${BASE}/app/shop/library`);
await page.locator('a[href^="/app/shop/library/"]').first().click();
await page.getByText(/Listing photos · \d\/9 in upload order/).waitFor({ timeout: 20000 });
const slotsBefore = await page.locator('figure img[alt^="Slot "]').count();
await page.getByRole('button', { name: 'Remove slot 1 from the pack' }).click();
await page.getByText('Not in the pack · 1').waitFor({ timeout: 15000 });
assert(await page.getByRole('button', { name: 'Add to pack' }).count() === 1, 'removed photo should show once');
await shot('4-removed');
await page.getByRole('button', { name: 'Add to pack' }).click();
await page.waitForFunction((n) => document.querySelectorAll('figure img[alt^="Slot "]').length === n, slotsBefore, { timeout: 15000 });
step('Remove / Add to pack without duplicates');
await page.getByRole('button', { name: 'Create 9:16 cover' }).click();
await page.getByText('Creating your cover…').waitFor({ timeout: 15000 });
const packUrl = page.url();
await openNewestBatch(); // mock generation advances while a batch page polls
await page.goto(packUrl);
await page.getByRole('radiogroup', { name: 'Video cover' }).getByRole('radio').first().waitFor({ timeout: 30000 });
await shot('5-cover');
step('9:16 cover created from the library');

// 5. Studio Models: add "You" as a model with your photos, then archive a scene.
await page.goto(`${BASE}/app/shop/sets/new`);
await page.getByRole('button', { name: /Use my photos/ }).click();
await page.getByRole('region', { name: 'Photos of you' }).getByRole('button', { name: /Add photos|See and edit/ }).click();
const photos = page.getByRole('dialog', { name: 'Change your photos' });
const inputs = photos.locator('input[type=file]');
await inputs.nth(0).setInputFiles(`${ROOT}/onboarding/selfie-good.png`);
await inputs.nth(2).setInputFiles(`${ROOT}/onboarding/selfie-good.png`);
await photos.getByText('These are photos of me').click();
await photos.getByRole('button', { name: 'Save photos' }).click();
await photos.waitFor({ state: 'detached', timeout: 20000 });
await page.getByRole('region', { name: 'Photos of you' }).locator('img').nth(1).waitFor({ timeout: 10000 });
step('photos of you added with the onboarding upload step');
await page.getByRole('radiogroup', { name: 'Choose a look' }).getByRole('radio', { disabled: false }).first().click();
await page.getByRole('button', { name: 'Add model', exact: true }).click();
await page.getByRole('heading', { name: 'You', exact: true }).waitFor({ timeout: 15000 });
step('added You as a model');
const scenesBefore = await page.getByRole('link', { name: /^Edit / }).count();
await page.getByRole('link', { name: /^Edit / }).first().click();
await page.getByRole('button', { name: 'Archive scene' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();
await page.waitForURL(/\/sets$/, { timeout: 15000 });
await page.waitForFunction((n) => document.querySelectorAll('a[aria-label^="Edit "]').length === n - 1, scenesBefore, { timeout: 15000 });
await shot('6-models');
step('archived a scene');

// 6. Products: archive the selected products, then bring one back.
await page.goto(`${BASE}/app/shop/products`);
await page.getByRole('button', { name: /^Select / }).first().click();
await page.getByRole('button', { name: 'Archive', exact: true }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();
await page.getByText(/1 product archived/).waitFor({ timeout: 20000 });
await page.getByRole('button', { name: 'Archived' }).click();
await page.getByText('Archived products stay out of new drops').waitFor({ timeout: 20000 });
const archivedCards = page.getByRole('button', { name: /^Select / });
await archivedCards.first().waitFor({ timeout: 20000 });
assert(await archivedCards.count() === 1, `the archived list should hold 1 product, has ${await archivedCards.count()}`);
assert(await page.getByRole('button', { name: 'Archived' }).getAttribute('aria-pressed') === 'true', 'the Archived chip should look selected');
await page.getByText('Archived', { exact: true }).nth(1).waitFor({ timeout: 10000 }); // the card says Archived
await shot('7-archived');
await page.getByRole('button', { name: /^Select / }).first().click();
await page.getByRole('button', { name: 'Bring back' }).click();
await page.getByRole('dialog', { name: /Bring .* back\?/ }).getByRole('button', { name: 'Bring back' }).click();
await page.getByText(/1 product back in your list/).waitFor({ timeout: 20000 });
step('archived a product from the Products page and brought it back');

// 7. A phone-sized photo is shrunk in the browser before it is uploaded.
const bigPhoto = process.env.E2E_BIG_PHOTO;
if (bigPhoto) {
  const { statSync } = await import('node:fs');
  const original = statSync(bigPhoto).size;
  let uploadBytes = 0;
  // Playwright can't read a multipart body, so the request's own content-length is used.
  page.on('request', async (r) => { if (r.url().includes('/api/app/products/bulk')) uploadBytes = Number((await r.allHeaders())['content-length'] ?? 0); });
  await page.goto(`${BASE}/app/shop/products`);
  await page.getByRole('button', { name: 'Add products' }).first().click();
  await page.locator('input[type=file]').first().setInputFiles(bigPhoto);
  await page.getByRole('textbox', { name: /Product 1 name/ }).waitFor({ timeout: 20000 });
  await page.getByRole('combobox', { name: /Product 1 category/ }).selectOption('dress');
  await page.getByRole('button', { name: /^Save 1 product/ }).click();
  await page.getByText(/1 product added/).waitFor({ timeout: 30000 });
  console.log(`  original ${Math.round(original / 1024)} KB → uploaded ${Math.round(uploadBytes / 1024)} KB`);
  assert(uploadBytes > 0 && uploadBytes < 4.5 * 1024 * 1024, `the upload must stay under 4.5 MB, was ${uploadBytes}`);
  assert(uploadBytes < original, 'the photo should be smaller after the browser shrinks it');
  step('a big photo is shrunk before upload');

  // A too-small photo and a missing category are flagged before Save, and a row can be removed.
  const tiny = process.env.E2E_TINY_PHOTO;
  if (tiny) {
    await page.getByRole('button', { name: 'Add products' }).first().click();
    await page.locator('input[type=file]').first().setInputFiles([bigPhoto, tiny]);
    await page.getByText(/This photo is too small/).waitFor({ timeout: 20000 });
    await page.getByText(/2 products still need something/).waitFor({ timeout: 10000 });
    const saveButton = page.getByRole('button', { name: /^Save 2 products/ });
    assert(await saveButton.isDisabled(), 'Save must stay off while a row is not ready');
    await shot('9-row-errors');
    await page.getByRole('button', { name: /^Remove / }).nth(1).click(); // drop the too-small photo
    await page.getByRole('combobox', { name: /Product 1 category/ }).selectOption('dress');
    const readySave = page.getByRole('button', { name: /^Save 1 product/ });
    await readySave.waitFor({ timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('[role=alert]')?.textContent?.includes('still need'), null, { timeout: 10000 });
    assert(await readySave.isEnabled(), 'Save must work once every row is ready');
    await readySave.click();
    await page.getByText(/1 product added/).waitFor({ timeout: 30000 });
    step('bad rows are flagged in red, can be removed, and Save waits for them');
  }
}

// 8. Create drop offers the 9:16 cover.
await page.goto(`${BASE}/app/shop/create`);
await page.getByText('Add a 9:16 video cover for each product').waitFor({ timeout: 20000 });
await shot('8-create');
step('create drop shows the cover option');

await browser.close();
console.log('E2E shop listing OK');
