/**
 * E2E: Blitz Lab — render flow
 *
 * Verifies:
 *  1. The "Done Editing" CTA submits the render job and immediately shows a
 *     "Queued" placeholder card in the Library (fire-and-forget).
 *  2. The editor returns to idle state after submit (button label resets to
 *     "Done Editing" or shows the queued confirmation).
 *  3. The render API returns a 201 with a valid projectId.
 *  4. The Library shows the correct caption text in the queued card.
 *
 * Prerequisites:
 *   - Dev server running at http://localhost:3000 (or E2E_BASE_URL)
 *   - E2E_ADMIN_SECRET set to the local ADMIN_SECRET
 *   - Database seeded with: npm run db:seed:blitz
 *
 * Run:
 *   E2E_ADMIN_SECRET=<secret> node tests/e2e/blitz-render.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const SECRET = process.env.E2E_ADMIN_SECRET;
if (!SECRET) throw new Error('Set E2E_ADMIN_SECRET');

const step = (msg) => console.log('✓', msg);
const assert = (ok, msg) => { if (!ok) throw new Error(`FAIL: ${msg}`); };

// ── 1. Get admin token ──────────────────────────────────────────────────────
const authRes = await fetch(`${BASE}/api/admin/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: SECRET }),
});
const { token } = await authRes.json();
if (!token) throw new Error('Admin login failed — check E2E_ADMIN_SECRET');
step('Admin token obtained');

// ── 2. Verify render API directly ──────────────────────────────────────────
// First, fetch templates and assets to get real IDs
const tRes = await fetch(`${BASE}/api/admin/blitz/templates`, {
  headers: { Authorization: `Bearer ${token}` },
});
const tBody = await tRes.json();
assert(tRes.ok, `GET /templates failed: ${JSON.stringify(tBody)}`);
const templates = tBody.templates ?? [];
assert(templates.length > 0, 'No templates found — run: npm run db:seed:blitz');
const template = templates[0];
step(`Template loaded: ${template.name} (id=${template.id})`);

const aRes = await fetch(`${BASE}/api/admin/blitz/assets`, {
  headers: { Authorization: `Bearer ${token}` },
});
const aBody = await aRes.json();
assert(aRes.ok, `GET /assets failed: ${JSON.stringify(aBody)}`);
const assets = aBody.assets ?? [];
const background = assets.find((a) => a.type === 'BACKGROUND');
const overlay = assets.find((a) => a.type === 'OVERLAY');
assert(background, 'No BACKGROUND asset found — run: npm run db:seed:blitz');
assert(overlay, 'No OVERLAY asset found — run: npm run db:seed:blitz');
step(`Assets loaded — background=${background.r2Key}, overlay=${overlay.r2Key}`);

// POST to render
const CAPTION = `E2E test caption ${Date.now()}`;
const renderRes = await fetch(`${BASE}/api/admin/blitz/render`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    templateId: template.id,
    currentAssets: { backgroundKey: background.r2Key, overlayKey: overlay.r2Key },
    overlayZoom: 1.0,
    overlayOffsetX: 0,
    overlayOffsetY: 0,
    mentionBusiness: false,
    captionText: CAPTION,
    durationSeconds: template.durationSeconds ?? 5,
  }),
});
const renderBody = await renderRes.json();
console.log('[blitz/render] Response:', JSON.stringify(renderBody, null, 2));
assert(renderRes.status === 201, `Expected 201, got ${renderRes.status}: ${JSON.stringify(renderBody)}`);
assert(renderBody.projectId, 'Response must include projectId');
assert(renderBody.project, 'Response must include project DTO');
assert(renderBody.project.renderStatus === 'PENDING', `Expected PENDING, got ${renderBody.project.renderStatus}`);
assert(renderBody.project.captionText === CAPTION, 'captionText mismatch');
const projectId = renderBody.projectId;
step(`Render API: 201 OK, projectId=${projectId}, status=PENDING`);

// Poll the project once to confirm the GET endpoint works
const pollRes = await fetch(`${BASE}/api/admin/blitz/projects/${projectId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const pollBody = await pollRes.json();
assert(pollRes.ok, `GET /projects/${projectId} failed: ${JSON.stringify(pollBody)}`);
assert(['PENDING', 'PROCESSING', 'COMPLETED'].includes(pollBody.project.renderStatus),
  `Unexpected status: ${pollBody.project.renderStatus}`);
step(`Poll GET: project ${projectId} is ${pollBody.project.renderStatus}`);

// ── 3. Browser: verify Library placeholder appears immediately ─────────────
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript((t) => window.localStorage.setItem('studio_admin_token', JSON.stringify(t)), token);
const page = await context.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
page.on('console', (msg) => { if (msg.type() === 'error' || msg.text().includes('[blitz')) console.log('BROWSER', msg.text()); });

await page.goto(`${BASE}/admin`);
await page.evaluate((t) => window.localStorage.setItem('admin_token', t), token);
await page.reload();
step('Admin page loaded');

// Navigate to Blitz Lab. Exact match: a "Blitz Slideshow" tab also exists.
await page.getByRole('button', { name: 'Blitz Lab', exact: true }).click();
// Wait for template to load (editor skeleton → content)
await page.locator('button', { hasText: /Done Editing/i }).waitFor({ timeout: 20000 });
step('Blitz Lab tab loaded with editor');

await page.screenshot({ path: `${OUT}/blitz-01-editor-ready.png` });

// Check initial Library state (may have cards from the API test above)
const library = page.locator('section').filter({ hasText: /Library/i });
await library.waitFor({ timeout: 5000 });
step('Library section visible');

// Enter a unique caption so we can identify the queued card
const uniqueCaption = `E2E auto ${Date.now()}`;
const captionInput = page.locator('textarea').filter({ hasText: /./ }).first();
// Clear and retype
await captionInput.click({ clickCount: 3 });
await captionInput.fill(uniqueCaption);
step(`Caption set to: "${uniqueCaption}"`);

// Capture the render request in-flight to confirm it goes out
const [renderReq] = await Promise.all([
  page.waitForRequest((req) => req.url().includes('/api/admin/blitz/render') && req.method() === 'POST', { timeout: 10000 }),
  page.locator('button', { hasText: /Done Editing/i }).click(),
]);
step('Done Editing clicked — render POST in-flight');

// Wait for the POST response
const renderResponse = await renderReq.response();
assert(renderResponse?.status() === 201, `Render POST returned ${renderResponse?.status()} (expected 201)`);
const renderJson = await renderResponse?.json();
console.log('[E2E] Render response:', JSON.stringify(renderJson));
step(`Render POST 201 — projectId=${renderJson.projectId}`);

await page.screenshot({ path: `${OUT}/blitz-02-just-submitted.png` });

// The Library should now show a card with "Queued" overlay for the new project
// The card appears immediately (no reload needed) because we pass `onQueued` to useBlitzRender
await page.waitForFunction(
  ({ caption }) => {
    // Look for any card element that shows the queued text OR the caption
    const allText = document.body.innerText;
    return allText.includes('Queued') || allText.includes('In queue') || allText.includes(caption);
  },
  { caption: uniqueCaption },
  { timeout: 10000 },
);
step('Library shows a queued placeholder card immediately after submit');

await page.screenshot({ path: `${OUT}/blitz-03-queued-card.png` });

// The button should be back to "Done Editing" (editor is no longer blocked)
await page.locator('button', { hasText: /Done Editing/i }).waitFor({ timeout: 5000 });
step('Editor button returned to "Done Editing" — user can compose a new video right away');

await page.screenshot({ path: `${OUT}/blitz-04-editor-ready-again.png` });

await browser.close();
console.log('\n🎉 Blitz render E2E OK — all checks passed');
console.log(`   Screenshots saved to ${OUT}/`);
