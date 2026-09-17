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

/** A real finger: press, hold until the photo lifts, slide to the target, let go. */
const touchDrag = async (page, from, to, { shotName } = {}) => {
  const client = await page.context().newCDPSession(page);
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  await page.waitForTimeout(450);
  for (let i = 1; i <= 14; i += 1) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + ((end.x - start.x) * i) / 14, y: start.y + ((end.y - start.y) * i) / 14 }] });
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(250);
  if (shotName) await shot(page, shotName);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
};

const browser = await chromium.launch({ channel: 'chrome' });
// A phone: this feature is used between client calls, not at a desk.
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
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
const thumbs = page.getByRole('button', { name: /^Open post: / });
await thumbs.first().waitFor({ timeout: 20000 });
const days = await page.getByRole('button', { name: /posts? on \d{4}-\d{2}-\d{2}$/ }).count();
if (days === 0) throw new Error('calendar is empty: auto-fill did not run');
// No score on the calendar: she chose these photos already.
if (await page.getByTitle('Scroll-Stop Score').count()) throw new Error('a score badge is still shown on the calendar');
await shot(page, 'cal-1-month');

// Tapping a day in the month brings that day's row into view.
const firstDay = page.getByRole('button', { name: /posts? on \d{4}-\d{2}-\d{2}$/ }).first();
const date = (await firstDay.getAttribute('aria-label')).match(/\d{4}-\d{2}-\d{2}/)[0];
await firstDay.click();
await page.locator(`#day-${date}`).waitFor();
await page.waitForTimeout(700);
await shot(page, 'cal-1b-day');

// One tap on a photo opens the post.
await page.locator(`#day-${date}`).getByRole('button', { name: /^Open post: / }).first().click();
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

// Remove a photo from its day. It must stay removed after a reload (auto-fill used to put it back).
const before = await thumbs.count();
await page.getByRole('button', { name: /^Remove from / }).first().click();
await page.getByText(/^Removed from /).waitFor({ timeout: 10000 });
await page.waitForFunction((n) => document.querySelectorAll('button[aria-label^="Open post: "]').length === n - 1, before, { timeout: 10000 });
await page.reload();
await thumbs.first().waitFor({ timeout: 20000 });
if ((await thumbs.count()) !== before - 1) throw new Error('a removed photo came back after a reload');

// Add it back — to a day that already has a post, so the day holds two.
const target = page.locator('section[id^="day-"]').filter({ has: page.getByRole('button', { name: /^Open post: / }) }).first();
const targetId = await target.getAttribute('id');
await target.getByRole('button', { name: /^Add photos to / }).click();
const picker = page.getByRole('dialog', { name: /^Add to / });
await picker.waitFor();
await picker.getByRole('button', { name: /^Pick: / }).first().click({ timeout: 15000 });
await page.waitForTimeout(500);
await shot(page, 'cal-3a-picker');
await picker.getByRole('button', { name: 'Add 1 photo' }).click();
await page.getByText(/^Added 1 photo to /).waitFor({ timeout: 10000 });
await page.locator(`#${targetId}`).getByText('2 posts').waitFor({ timeout: 10000 });
await page.locator(`#${targetId}`).scrollIntoViewIfNeeded();
await shot(page, 'cal-3b-two-on-a-day');

// Drag one of that day's photos onto the next day, with a finger.
const rows = page.locator('section[id^="day-"]');
const ids = await rows.evaluateAll((els) => els.map((e) => e.id));
const nextId = ids[ids.indexOf(targetId) + 1];
await page.locator(`#${targetId}`).evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 90 }));
await page.waitForTimeout(300);
const source = page.locator(`#${targetId}`).getByRole('button', { name: /^Open post: / }).last();
const nextBefore = await page.locator(`#${nextId}`).getByRole('button', { name: /^Open post: / }).count();
await touchDrag(page, source, page.locator(`#${nextId}`), { shotName: 'cal-6-dragging' });
await page.getByText(/^Moved to /).waitFor({ timeout: 10000 });
await page.locator(`#${targetId}`).getByText('1 post', { exact: true }).waitFor({ timeout: 10000 });
if ((await page.locator(`#${nextId}`).getByRole('button', { name: /^Open post: / }).count()) !== nextBefore + 1) throw new Error('the photo did not land on the next day');
// The drop must not also open the post.
if (await page.getByRole('dialog').count()) throw new Error('dropping a photo opened it');
await shot(page, 'cal-7-moved');

// Still there after a reload.
await page.reload();
await page.locator(`#${nextId}`).getByRole('button', { name: /^Open post: / }).first().waitFor({ timeout: 20000 });
if ((await page.locator(`#${nextId}`).getByRole('button', { name: /^Open post: / }).count()) !== nextBefore + 1) throw new Error('the move was not saved');

// A quick tap still opens the post (the hold is what starts a drag).
await page.locator(`#${nextId}`).getByRole('button', { name: /^Open post: / }).first().tap();
await page.getByRole('button', { name: 'Save photo' }).waitFor({ timeout: 10000 });
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Save photo' }).waitFor({ state: 'detached', timeout: 10000 });

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
