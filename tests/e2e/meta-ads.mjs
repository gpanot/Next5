// Admin "Perfect Ads": URL in → Exa profile → treg competitor ads → Hormozi picks → copy → Nano Banana image → composite, in the real UI.
// Needs the dev server, E2E_ADMIN_SECRET (the local ADMIN_SECRET) and real EXA / TREG / OPENAI / REAPI keys.
// Runs 1 ad by default (about $0.12: Nano Banana Pro is $0.03 per image on reAPI). E2E_META_ADS_URL and E2E_META_ADS_COUNT (1 | 2 | 5 | 15) change the run.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const SECRET = process.env.E2E_ADMIN_SECRET;
const SITE = process.env.E2E_META_ADS_URL ?? 'joinfleek.com';
const COUNT = process.env.E2E_META_ADS_COUNT ?? '1';
if (!SECRET) throw new Error('set E2E_ADMIN_SECRET');

const auth = await fetch(`${BASE}/api/admin/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: SECRET }) });
const { token } = await auth.json();
if (!token) throw new Error('admin login failed');

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const step = (msg) => console.log('✓', msg);
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

await page.goto(`${BASE}/admin`);
await page.evaluate((t) => window.localStorage.setItem('admin_token', t), token);
await page.reload();
await page.getByRole('button', { name: 'Open menu' }).click();
await page.getByRole('button', { name: 'Perfect Ads' }).click();
await page.getByText('Get 500 winning').waitFor({ timeout: 20000 });
await page.screenshot({ path: `${OUT}/meta-ads-1-start.png` });
step('the tab opens on the start screen');

await page.getByPlaceholder('yourbrand.com').fill(SITE);
await page.getByLabel('How many ads').selectOption(COUNT);
const created = page.waitForResponse((r) => r.url().endsWith('/api/admin/meta-ads/runs') && r.request().method() === 'POST');
await page.getByRole('button', { name: /Get perfect ads/ }).click();
const { runId } = await (await created).json();
assert(runId, 'the run should be created');
step(`run ${runId} started for ${SITE} with ${COUNT} ad(s)`);

const fetchRun = async () => (await (await fetch(`${BASE}/api/admin/meta-ads/runs/${runId}`, { headers: { Authorization: `Bearer ${token}` } })).json()).run;
const shots = new Set();
const t0 = Date.now();
let run = await fetchRun();
while (!['COMPLETED', 'FAILED'].includes(run.status) && Date.now() - t0 < 300_000) {
  if (!shots.has(run.status)) {
    shots.add(run.status);
    await page.screenshot({ path: `${OUT}/meta-ads-2-${run.status.toLowerCase()}.png`, fullPage: true });
    step(`${run.status} at ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  await new Promise((r) => setTimeout(r, 1500));
  run = await fetchRun();
}
writeFileSync(`${OUT}/meta-ads-run.json`, JSON.stringify(run, null, 2));
assert(run.status === 'COMPLETED', `run ended ${run.status} at step ${run.failedStep}: ${run.error}`);
step(`run completed in ${Math.round((Date.now() - t0) / 1000)}s; timings ${JSON.stringify(run.stepTimings)}`);

assert(run.profile?.brandName && run.profile.searchKeywords.length > 0, 'step 1 should save a profile with search keywords');
assert(run.competitors?.ads.length > 0, 'step 2 should save competitor ads');
const h = run.hormozi;
const studied = [...run.competitors.ads, ...run.competitors.ownAds];
assert(run.competitors.ads.every((a) => a.evidence && typeof a.evidence.winnerScore === 'number'), 'step 2 should give every studied ad winner evidence');
assert(run.competitors.advertisers.length > 0, 'step 2 should read at least one advertiser history');
assert(h?.ratings.length >= run.competitors.ads.length, 'step 3 should grade every studied competitor ad');
assert(h.scoring?.version, 'step 3 should record the scoring version');
step(`evidence: ${run.competitors.advertisers.map((a) => `${a.pageName}${a.own ? ' (you)' : ''} ${a.active}/${a.stopped} kill~${a.killMedianDays ?? '?'}d`).join(', ')}`);
step(`scoring: ${h.scoring.provenCount} proven, rubric vs market rho ${h.scoring.agreement.rho} (n=${h.scoring.agreement.n}), ${h.ratings.filter((r) => r.creative).length} images read`);
assert(h.picks.length >= 1 && h.picks.every((p) => studied.some((c) => c.id === p.adId)), 'step 3 picks should be real competitor ads');
assert(h.levers.length > 0 && h.levers.every((l) => l.quote), 'step 3 brand levers should each carry a site quote');
assert(h.plays.length > 0 && h.plays.every((p) => h.picks.some((k) => k.adId === p.fromAdId) && h.levers.some((l) => l.id === p.leverId)), 'every play should trace to a pick and a lever');
assert(run.copy?.ads.length === Number(COUNT), `step 4 should write exactly ${COUNT} ads`);
assert(run.ads.every((a) => a.play && h.picks.some((k) => k.adId === a.inspiredByAdId)), 'every ad should name its play and the pick it came from');
for (const n of [1, 2, 3, 4, 5]) assert(run.stepCosts[n]?.usdMicros > 0, `step ${n} should record a cost`);
const sum = Object.values(run.stepCosts).reduce((t, c) => t + c.usdMicros, 0);
assert(run.totalCostMicros === sum, 'the total should equal the sum of the steps');
step(`costs: ${[1, 2, 3, 4, 5].map((n) => `${n}=$${(run.stepCosts[n].usdMicros / 1e6).toFixed(4)}`).join(' ')} · total $${(sum / 1e6).toFixed(4)}`);
assert(run.ads.length === Number(COUNT) && run.ads.every((a) => a.status === 'ready' && a.rawImageUrl && a.finalUrl), 'steps 4-5 should finish every ad');
assert(run.competitors.patterns.length > 0, 'step 2 should name what the kept competitor ads share');
const LIMITS = { headline: 40, primaryText: 125, primaryTextAlt: 125, overlayText: 32 };
for (const ad of run.ads) for (const [field, max] of Object.entries(LIMITS)) assert(ad[field].length <= max, `${field} is ${ad[field].length} chars, max ${max}: ${ad[field]}`);
step('every step saved its checkpoint');

await page.getByText(/ads? ready for/).waitFor({ timeout: 20000 });
await page.screenshot({ path: `${OUT}/meta-ads-3-done.png`, fullPage: true });
const image = await (await fetch(new URL(run.ads[0].finalUrl, BASE))).arrayBuffer();
writeFileSync(`${OUT}/meta-ads-ad-1.jpg`, Buffer.from(image));
step(`the dashboard shows the finished ads (first ad ${Math.round(image.byteLength / 1024)} KB)`);

await page.getByRole('button', { name: /Inspired by/ }).click();
const libraryLinks = await page.locator('a', { hasText: 'View in Ad Library' }).evaluateAll((as) => as.map((el) => el.href));
assert(libraryLinks.length === run.competitors.ads.length && libraryLinks.every((href) => href.startsWith('https://www.facebook.com/ads/library?id=')), 'the expanded strip should link every competitor ad to the Ad Library');
await page.getByRole('button', { name: /Hide/ }).click();
step(`"Inspired by" expands to ${libraryLinks.length} competitor ads, each linked to the Ad Library`);

await page.getByRole('button', { name: /Alex Hormozi picks/ }).click();
await page.getByText('Playbook for your ads').waitFor();
await page.getByText('Pick #1').scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/meta-ads-3b-hormozi.png`, fullPage: true });
step(`the Hormozi panel shows ${run.hormozi.picks.length} pick(s) and ${run.hormozi.plays.length} plays`);

await page.locator('main button.group').first().click();
await page.getByText('Primary text').waitFor();
await page.screenshot({ path: `${OUT}/meta-ads-4-inspector.png`, fullPage: true });
await page.getByRole('button', { name: 'Close ad' }).click();
step('the ad inspector opens with the copy');

await page.getByRole('button', { name: /Get 500 \/ month/ }).click();
await page.getByText('How many ads do you want?').waitFor();
await page.screenshot({ path: `${OUT}/meta-ads-5-get-more.png` });
step('"Get 500 / month" opens the 1 / 2 / 5 picker');

await browser.close();
console.log('\nmeta-ads e2e passed');
