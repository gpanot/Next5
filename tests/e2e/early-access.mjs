// Early-access checkout (production default while payments are not live).
// Needs the dev server started with NEXT5_MOCK_PAYMENTS=false — see tests/e2e/README.md.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? '.data/e2e';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const DB = process.env.E2E_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/next5_dev?sslmode=disable`;
const ADMIN_SECRET = process.env.E2E_ADMIN_SECRET ?? readFileSync('.env.local', 'utf8').match(/^ADMIN_SECRET=(.*)$/m)?.[1]?.replace(/^"|"$/g, '');
const email = `early-${Date.now()}@next5.local`;
const out = execSync(`DATABASE_URL="${DB}" npx tsx --env-file=.env.local scripts/dev-seed-business.ts ${email} brand`).toString();
const link = out.match(/Sign in: (\S+)/)[1];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

// Home: business at /, old consumer hashes forward to /photos.
await page.goto(`${BASE}/#routes`);
await page.waitForURL(/\/photos#routes$/, { timeout: 15000 });
await page.goto(BASE);
await page.getByRole('link', { name: 'I sell a service' }).first().waitFor();
await page.screenshot({ path: `${OUT}/home.png` });

await page.goto(link);
await page.getByText('Recent batches').waitFor({ timeout: 20000 });
await page.goto(`${BASE}/app/billing`);
await page.getByRole('button', { name: /Choose a plan|Renew or change plan/ }).click();
await page.getByRole('button', { name: /^Choose Pro$/ }).click();
await page.getByText('Request received').waitFor({ timeout: 15000 });
if (await page.getByText('Transfer memo').count()) throw new Error('bank details shown for a request');
if (await page.getByRole('button', { name: /Simulate transfer/ }).count()) throw new Error('simulate shown in request mode');
await page.screenshot({ path: `${OUT}/request-received.png` });
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByText('Requested').first().waitFor();

// Admin activates the request.
const { token } = await (await fetch(`${BASE}/api/admin/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: ADMIN_SECRET }) })).json();
const { payments } = await (await fetch(`${BASE}/api/admin/business/payments?state=pending`, { headers: { Authorization: `Bearer ${token}` } })).json();
const row = payments.find((p) => p.email === email);
if (!row || row.provider !== 'request') throw new Error(`request not in admin queue: ${JSON.stringify(row)}`);
const res = await (await fetch(`${BASE}/api/admin/business/payments/${row.id}/mark-paid`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).json();
if (res.outcome !== 'paid') throw new Error(`activation failed: ${JSON.stringify(res)}`);

await page.reload();
await page.getByText('Activated').first().waitFor({ timeout: 15000 });
await page.getByText(/Brand Pro · 3 months/).first().waitFor();
await page.screenshot({ path: `${OUT}/request-activated.png`, fullPage: true });
await browser.close();
console.log('E2E early access OK', email);
