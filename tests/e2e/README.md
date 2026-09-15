# End-to-end tests (Playwright + local Chrome)

Mock-mode browser runs of the business product. They use the locally installed Google Chrome (`channel: 'chrome'`).

1. Local database: `next5_dev` (see `docs/business-studios/phases/phase-01-data-credits.md` notes), seeded with `npm run db:seed:business`.
2. Start the app with the business flag, mock generation and the local DB (the scenarios below use simulated payments, the local default):
   ```bash
   NEXT5_BUSINESS_ENABLED=true NEXT5_MOCK_GENERATION=true \
   DATABASE_URL=postgres://$USER@localhost:5432/next5_dev npx next dev -p 3100
   ```
3. Run a scenario (screenshots go to `.data/e2e/`):
   ```bash
   node tests/e2e/brand.mjs          # Brand onboarding → trial → Pro checkout (simulated) → dashboard
   node tests/e2e/shop.mjs           # Shop onboarding on 390 px → Studio model → product → trial
   node tests/e2e/brand-create.mjs   # top-up → create 8 × 2 formats → batch → lightbox → redo → library
   node tests/e2e/shop-app.mjs       # bulk add products → create → compare view → redo → zip
   node tests/e2e/studios.mjs        # two studios: legacy redirects, Add Shop Studio, switcher, batch deep link
   node tests/e2e/shop-store.mjs     # needs NEXT5_SHOP_IMPORT_MOCK=true: store import onboarding → trial → TikTok library pack → zip
   ```
   Onboarding creates accounts from your IP; the account rate limit is 5 per hour.
4. Early-access checkout (the production default while payments are not live): restart the server with
   `NEXT5_MOCK_PAYMENTS=false` and run `npm run test:e2e:early` — checks `/` is the business home, `/#routes` forwards to
   `/photos`, a plan choice records a request (no bank details, no simulate button) and admin activation turns it on.
