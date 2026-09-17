# Spike P21.0 — Zillow listing import via Apify (2026-09-16)

Budget: Apify free tier. Spent in the spike: **under $0.10** (6 detail runs, 12 search results, 3 failed search starts).
Raw outputs, downloaded photos and a contact sheet were kept in the session scratchpad; copy trimmed versions to
`tests/fixtures/zillow/` when the build starts.

## Actors
| Actor | Input | Use |
|---|---|---|
| **`maxcopell/zillow-detail-scraper`** ✅ | `startUrls: [{ url }]` (a `homedetails/…_zpid/` link) or `addresses[]`; `propertyStatus` FOR_SALE / RECENTLY_SOLD / FOR_RENT | One listing → full data + photo gallery |
| `maxcopell/zillow-scraper` | `searchUrls` — must contain `searchQueryState`, plain city URLs fail ("No searchQueryState in URL") | Search results only. Not needed for the product; used here to find test listings |

Pricing: pay per result. Detail = **$0.0036 / listing** on the FREE tier (down to $0.0017 on GOLD).

## Test listings
| Listing | Status | Time | Photos | Largest real size | Agent + license | MLS |
|---|---|---|---|---|---|---|
| 2720 Carolyn Dr SE, Smyrna GA | for sale | 8 s | 20 | **800×532** | David Pruett · 394756 | GAMLS |
| 11113 Lost Maples Trl, Austin TX | for sale | 5 s | 30 | 1536×1024 | TREC # | HAR |
| 7314 E Fillmore St, Scottsdale AZ | sold | 7 s | 63 | 1536×1024 | yes | ARMLS |
| 1631 Tryon Rd NE, Atlanta GA | coming soon | 5 s | 45 | 1024×681 | yes | FMLS GA |
| 826 Greenway Dr, Beverly Hills CA | for sale ($5M+) | 5 s | 27 | 1280×720 | DRE # | CLAW |

`propertyStatus: FOR_SALE` was sent for all of them; the sold listing still came back correctly.

## Output shape (fields we use)
`zpid`, `propertyUrl`, `listingStatus` (`forSale` / `sold`), `listingType { isComingSoon, isOpenHouse, isPending, … }`,
`listingAddress { street, city, state, zipCode, full }`, `listingPrice { amount, formatted }`, `bedrooms`, `bathrooms`,
`livingArea`, `yearBuilt`, `homeType`, `description`, `daysOnZillow`, `onMarketDate`, `photoCount`,
`listingPhotos[] { url }`, `mainImage { thumbnail, hiRes }`, `agent { name, licenseNumber }`, `broker { name }`, `mls { id, name }`.

## Findings that change the build
1. **Photo size depends on the MLS feed.** `listingPhotos[].url` uses the `uncropped_scaled_within_1536_1152` suffix and
   returns the largest real size (800 to 1536 wide). The `p_f` suffix returns 1024 wide but is only an upscale when the
   original is smaller. Other suffixes: `p_c` 316px (use for thumbnails and tagging), `cc_ft_768` 768px.
   Photos download server-side with no referer.
2. **MLS marks are burned in.** GAMLS puts a "GEORGIA MLS" logo bottom-left on every photo; ARMLS puts "© 2026 ARMLS".
   We must not crop or remove them (copyright management information). Offer "Replace with your original" instead.
3. **Some rooms are already virtually staged** (2720: living room, sunroom, bedrooms). Not detectable reliably.
4. **Only about 8 of 20 photos are usable** for placing the agent in the scene. The rest are drone shots (one with a map
   pin), bathrooms and close-ups. Tagging and preselecting is needed.
5. **Concurrency.** A 5th parallel run failed with `actor-memory-limit-exceeded` (16 GB account cap ≈ 4 runs at once).
   Import must start an async run and poll, and retry when the cap is hit.
6. Sold and coming-soon listings both import, so an agent can make content before and after the sale.
