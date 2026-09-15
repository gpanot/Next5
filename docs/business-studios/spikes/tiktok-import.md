# Spike P15.0 — TikTok Shop catalog import via Apify (2026-09-15)

Budget: $5 Apify free credit. Spent in the spike: **$0.44** (search 16 + product 3 + 2 store runs).

## Test stores (US, apparel, public)
| Store | URL | On sale | Total sold | Followers | Fit |
|---|---|---|---|---|---|
| flux hoodies | https://shop.tiktok.com/us/store/flux-hoodies/8652615273314554588 | 193 | 16.9K | 654 | Missing middle ✅ |
| Floerns store | https://shop.tiktok.com/us/store/floerns-store/7495753394246224362 | 495 | 219K | 44.6K | Top of the band |
| Sassy Luos | https://shop.tiktok.com/us/store/sassy-luos/8655593863920522003 | 11 | 3.6K | 157 | Small seller |

## Actors compared (same store, flux hoodies)
| Actor | Mode | Time | Rows | Images/product | Variants | Price |
|---|---|---|---|---|---|---|
| **`pro100chok/tiktok-shop-scraper-usage`** ✅ | `scrapeType: store` | 22 s for 40 | 40 products + 1 store row | 1 main (listed twice on two CDN hosts) | no (store mode) | $0.002 / row |
| `pro100chok/…` | `scrapeType: product` | ~20 s for 3 | full detail | **up to 9** | **yes** (name "Color, Size", price, stock, `imageUrl` usually null) | $0.002 / row |
| `webdatalabs/tiktok-shop-scraper` | `mode: shop` | 58 s for 20 | 20 | 1 | no | ~$0.01 / product + start |

**Choice: pro100chok.** Two-step import: (1) `store` for the whole catalog (cheap list), (2) `product` detail for products the seller selects or the top N (9 images, variants, category, specs such as fabric composition). 500-product store ≈ $1 list + $1 details.

## Output shapes (keep as test fixtures: `.data/spike/*.json`, copy trimmed versions to `tests/fixtures/tiktok/`)
- Store row: `type:"store"`, `sellerId`, `shopName`, `shopUrl`, `shopLogo`, `soldCount`, `reviewCount`, `shopRating`, on-sale count.
- Store product: `type:"store_product"`, `productId`, `title`, `productUrl`, `imageUrls[]`, `currentPrice`, `originalPrice`, `currency`, `salesVolume`, `rating`, `reviewCount`, `sellerId`, `shopName`.
- Product detail: plus `description`, `category` ("Womenswear & Underwear > Women's Dresses > Casual Dresses"), `variants[] {variantId, name, price, stockStatus, stockQuantity, imageUrl}`, `specifications{}`, `exactSoldCount`, `soldLast30Days`, `shopOnSaleProducts`, `videoUrls[]`.
- Search product (for finding stores): has `sellerName` but **no store URL**; product detail has `shopUrl`.

## Findings that change the build
1. **Images download fine** server-side (ttcdn-us, `image/webp`, 1350×1800, no referer needed). Convert webp → jpeg with sharp before storing in R2.
2. **Listing images are often already on-model and carry graphics** (color swatches, "6 colors", text). The seller must pick the reference image (default: the cleanest image, not blindly image #1). The Shop prompt must say to ignore overlaid text/graphics, and a "clean product photo" upload stays available.
3. **Variants rarely have their own images** — colorway names only ("olive green, M"). Generating other colorways from a name is a garment-accuracy risk: V1 generates colorways **only** when a variant image exists or the seller uploads one; otherwise offer "main color only".
4. Sizes are part of the variant name ("Apricot, L") — split on the last comma into color/size; group by color.
5. `salesVolume` is cumulative sold count → good enough for before/after snapshots (not per-period).
6. Store URL formats seen: `https://shop.tiktok.com/us/store/{slug}/{sellerId}`; product: `https://shop.tiktok.com/us/pdp/{slug}/{productId}`. Also accept `https://www.tiktok.com/shop/pdp/...` (from actor prefill).
7. Terms of service: public data only; require the "I own or manage this shop" attestation; V1 bridge until the official API.

## Still needed
- A **Seller Center product export** file (Guillaume doesn't have a shop yet — build the parser against TikTok's documented bulk-edit template columns and verify with the first real seller).
