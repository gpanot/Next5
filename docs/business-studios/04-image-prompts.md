# 04 — Image Prompts

Every photo used on the new business surfaces. **Generate before the phase that references it**
(P3 marketing, P4 onboarding, P8 Studio models). Rules:

1. Generate with the project's `web-imagery` skill (or equivalent), which writes the file under
   `public/images/…` and records it in `public/images/manifest.json` (prompt, model, size, alt).
2. **Never reference a path in code before its manifest entry exists.**
3. Prompt = **STYLE block** (below) + the image prompt. Do not add text, logos or watermarks.
4. Output: web-optimised JPEG (the skill's PNG output is fine if the skill requires it — keep the
   extension in code identical to the manifest key).
5. Cast: adult Vietnamese / Southeast-Asian women unless stated (launch market), in
   **internationally neutral** settings — no Saigon landmarks, no Vietnamese signage.
6. Review every result for: extra fingers/hands, garbled text, logos, uncanny faces. Regenerate if any.

### STYLE block (prepend to every prompt)

> Premium commercial lifestyle photography, natural and believable. Soft directional daylight.
> Warm neutral palette — warm white, sand, light oak, soft taupe — with restrained terracotta
> accents. True-to-life skin texture, no plastic retouching. Full-frame camera look, shallow depth
> of field, clean uncluttered composition. No text, no logos, no brand names, no watermarks, no
> signage.

### Sizes

| Key | Pixels | Ratio |
|---|---|---|
| `P45` | 1200×1500 | 4:5 portrait |
| `L43` | 1200×900 | 4:3 landscape |
| `SQ` | 1024×1024 | 1:1 |
| `P23` | 1024×1536 | 2:3 full body |
| `SQ-S` | 800×800 | 1:1 small (guides) |

---

## A. Home `/` (P3)

### A1 `public/images/business/home/hero-professional.png` · P45
- **Used in:** Home hero (left image), Home "For professionals" card fallback
- **Alt:** Real estate agent smiling in the doorway of a bright modern apartment
- **Prompt:** A Vietnamese woman in her late 30s, a confident real estate agent, standing in the open doorway of a bright modern apartment, cream tailored blazer over a white top, holding a slim tablet at her side, warm genuine smile toward camera, light oak floors and a soft sofa blurred behind her, late-morning window light from the left, 85mm lens, waist-up framing with space above her head.

### A2 `public/images/business/home/hero-shop.png` · P45
- **Used in:** Home hero (right image)
- **Alt:** Woman wearing a beige linen two-piece set against a warm plaster wall
- **Prompt:** A Vietnamese woman in her mid 20s modelling a beige linen two-piece set (short-sleeve button shirt and wide-leg trousers), standing relaxed against a warm textured plaster wall, soft window shadows falling diagonally across the wall, one hand lightly in her pocket, calm confident expression, full body visible from head to shoes with small margin, 50mm lens, boutique Instagram aesthetic.

### A3 `public/images/business/home/card-professional.png` · L43
- **Used in:** Home product card "For professionals"
- **Alt:** Business coach laughing while working on a laptop in a sunlit café
- **Prompt:** A Vietnamese woman in her early 30s, a business coach, sitting at a light wood café table with an open laptop and a ceramic coffee cup, mid-laugh looking slightly off camera, smart casual sage-green knit top, large window with soft daylight behind her, plants softly blurred, horizontal composition with the subject on the left third.

### A4 `public/images/business/home/card-shop.png` · L43
- **Used in:** Home product card "For online shops"
- **Alt:** Online shop owner arranging clothes on a rail in her bright home studio
- **Prompt:** A Vietnamese woman in her late 20s, owner of a small online clothing shop, arranging neutral-toned garments on a minimalist metal clothing rail in a bright apartment home studio, a smartphone on a small tripod and a stack of kraft shipping boxes nearby, soft daylight, candid focused expression, horizontal composition, tidy and aspirational.

---

## B. Brand `/brand` (P3)

### B1 `public/images/business/brand/hero-main.png` · P45
- **Used in:** Brand hero
- **Alt:** Real estate agent leaning on a kitchen island in a staged home
- **Prompt:** A Vietnamese woman around 40, polished real estate agent, leaning lightly on a white marble kitchen island in a bright staged modern home, navy blazer and silk camel blouse, arms relaxed, approachable confident smile, pendant lights and light oak cabinetry softly blurred, soft daylight from large windows, 85mm, three-quarter framing.

### B2 `public/images/business/brand/step-selfies.png` · L43
- **Used in:** Brand "How it works" step 1
- **Alt:** Three casual smartphone selfies of the same woman from slightly different angles
- **Prompt:** A clean flat composition of three smartphone selfie photos of the same Vietnamese woman in her 30s, laid side by side on a warm off-white surface with soft shadows like printed photos: one facing the camera, one turned slightly left, one turned slightly right; plain light wall behind her in each, natural indoor daylight, hair tucked behind ears, no sunglasses, relaxed neutral smile, consistent identity across all three.

### B3–B8 Set template covers · P45 · Used in: Brand sets gallery, set builder, `SetTemplate.coverImage`

| # | Path | Alt | Prompt |
|---|---|---|---|
| B3 | `public/images/business/brand/sets/modern-office.png` | Professional woman in a bright glass-walled office | A Vietnamese woman in her early 40s, finance professional, standing beside a glass meeting-room wall in a bright modern office with light oak desks, charcoal blazer, holding a notebook, subtle confident smile, soft daylight, city skyline softly blurred through windows, 85mm, three-quarter framing. |
| B4 | `public/images/business/brand/sets/listing-interior.png` | Agent in a staged luxury living room | A Vietnamese woman in her mid 30s, real estate agent, sitting on the arm of a cream sofa in a spacious staged living room with tall windows, linen curtains and a sculptural lamp, ivory blazer and trousers, welcoming open posture, soft afternoon light, architectural lines, 50mm. |
| B5 | `public/images/business/brand/sets/neighborhood-cafe.png` | Consultant at a café table by the window | A Vietnamese woman in her early 30s, consultant, at a small café window table with a laptop and notebook, cream cardigan over a white tee, looking up from her work toward camera with a warm smile, morning window light, warm wood and plants softly blurred, 50mm. |
| B6 | `public/images/business/brand/sets/studio-backdrop.png` | Classic professional portrait on a warm grey backdrop | A classic professional portrait of a Vietnamese woman in her late 30s against a seamless warm grey studio backdrop, black tailored blazer, hair neatly styled, soft large key light from the left with gentle fill, confident approachable expression, chest-up framing, 85mm, crisp and timeless. |
| B7 | `public/images/business/brand/sets/urban-outdoor.png` | Woman walking on a modern street at golden hour | A Vietnamese woman in her early 30s walking toward camera on a clean modern city sidewalk with glass and concrete façades, camel trench coat over a white top, phone in hand, natural mid-stride, golden-hour side light, background softly blurred, no readable signs, 85mm. |
| B8 | `public/images/business/brand/sets/home-office.png` | Coach at a home office desk with bookshelves | A Vietnamese woman in her mid 40s, life coach, seated at a tidy home office desk with bookshelves and green plants behind her, soft blush blouse, hands loosely clasped, calm reassuring smile toward camera, soft window light, cosy but professional, 50mm. |

### B9–B16 Theme covers · P45 · Used in: Brand themes scroller, create flow, `Theme.coverImage`

| # | Path | Alt | Prompt |
|---|---|---|---|
| B9 | `public/images/business/brand/themes/just-listed.png` | Agent welcoming at the front door of a modern home | A Vietnamese woman in her 30s, real estate agent, standing at the open front door of a modern home with a light wood door and potted olive tree, arm gesturing inward in welcome, cream blazer, bright smile, soft morning daylight, no house numbers, 50mm. |
| B10 | `public/images/business/brand/themes/market-update.png` | Agent explaining beside a blank screen | A Vietnamese woman in her early 40s, property consultant, standing beside a large blank light-grey wall-mounted screen in a minimal meeting room, pointing toward the empty screen while looking at camera, navy blazer, expert and friendly, soft daylight, screen completely blank. |
| B11 | `public/images/business/brand/themes/client-meeting.png` | Advisor talking with a client across a table | A Vietnamese woman in her late 30s, advisor, seated at a light oak table explaining something with an open notebook, a client seen only from behind and out of focus in the foreground, warm attentive expression, bright office lounge, soft daylight, 50mm. |
| B12 | `public/images/business/brand/themes/behind-the-scenes.png` | Professional on a phone call walking with a coffee | A Vietnamese woman in her early 30s walking along a bright modern building corridor on a phone call, takeaway coffee cup without logo in the other hand, beige blazer, candid laugh, natural motion, soft daylight, background softly blurred. |
| B13 | `public/images/business/brand/themes/open-house.png` | Agent arranging flowers in a staged dining room | A Vietnamese woman in her mid 30s, real estate agent, placing a vase of white flowers on a dining table in a bright staged home before an open house, ivory knit top and tailored trousers, gentle smile, sunlight through sheer curtains, 50mm. |
| B14 | `public/images/business/brand/themes/new-year-goals.png` | Woman writing in a planner by a sunrise window | A Vietnamese woman in her 30s writing in a linen-covered planner at a desk beside a large window at sunrise, warm golden light, cream turtleneck, focused hopeful expression, minimal workspace with a ceramic mug, calm fresh-start mood. |
| B15 | `public/images/business/brand/themes/holiday-greetings.png` | Woman in a cosy festive living room | A Vietnamese woman in her late 30s in a softly decorated festive living room with warm string-light bokeh and plainly wrapped gifts in kraft paper, burgundy knit sweater, waving warmly at camera, cosy evening lamp light, tasteful not kitsch, no religious symbols. |
| B16 | `public/images/business/brand/themes/tet-greetings.png` | Woman in a modern áo dài beside peach blossoms | A Vietnamese woman in her early 30s wearing an elegant modern red silk áo dài, standing in a bright contemporary living room beside a vase of pink peach blossom branches, holding a plain red envelope with no characters, graceful warm smile, soft daylight, refined and modern Lunar New Year mood. |

### B17–B21 Industry tabs · L43 · Used in: Brand "Made for your industry"

| # | Path | Alt | Prompt |
|---|---|---|---|
| B17 | `public/images/business/brand/industries/real-estate.png` | Real estate agent touring a bright apartment | A Vietnamese woman in her 30s, real estate agent, walking through a bright empty modern apartment with floor-to-ceiling windows, gesturing toward the view, cream blazer, horizontal composition, soft daylight. |
| B18 | `public/images/business/brand/industries/coaching.png` | Coach speaking warmly in a small workshop room | A Vietnamese woman in her early 40s, business coach, speaking to a small unseen group while standing beside a flip chart with a blank sheet, sage blazer, open expressive hand gesture, bright workshop room, horizontal composition. |
| B19 | `public/images/business/brand/industries/beauty-wellness.png` | Spa owner in a calm treatment room | A Vietnamese woman in her early 30s, spa owner and esthetician, standing in a serene treatment room with a neatly made treatment bed, rolled towels and soft candles, wearing a clean sand-coloured uniform tunic, gentle welcoming smile, warm diffuse light, horizontal composition. |
| B20 | `public/images/business/brand/industries/fitness.png` | Fitness trainer smiling in a bright studio | A Vietnamese woman in her late 20s, personal trainer, in a bright boutique fitness studio with light wood floor and a few kettlebells, wearing matching taupe athletic set, arms crossed, energetic confident smile, soft daylight, horizontal composition, no brand logos. |
| B21 | `public/images/business/brand/industries/finance.png` | Financial advisor at a desk with a laptop | A Vietnamese woman in her early 40s, insurance and financial advisor, seated at a tidy desk with a laptop and a closed folder, charcoal blazer and pearl earrings, trustworthy calm smile, bright modern office, horizontal composition, screen not visible. |

### B22 `public/images/business/brand/formats-master.png` · 2048×2048
- **Used in:** Brand "Every format" section — one master cropped by CSS to 4:5, 9:16, 1:1, 3:4
- **Alt:** Professional woman in a bright office, shown in four social media formats
- **Prompt:** A Vietnamese woman in her mid 30s, professional, standing centred in a bright minimal office with light oak and white walls, camel blazer, hands relaxed, warm smile, subject perfectly centred with generous empty space on all sides so the image can be cropped to vertical, square and portrait formats without cutting the head or hands, soft even daylight.

---

## C. Shop `/shop` (P3) and Studio models (P8)

### C1–C6 Before / after slider · P45 · Used in: Shop hero slider, accuracy promise, marketplace frames

**How to make them:** generate the **before** image with the prompt. Then create the **after**
image with **Next5's own Shop pipeline** (P6 composer, Studio model `model-vy`, look `beige-wall`,
shot `full_body_front`) using the before image as the product reference — this proves the product
works. Only if the pipeline is not ready yet, use the fallback prompt and replace it later.

| # | Path | Alt | Prompt |
|---|---|---|---|
| C1 | `public/images/business/shop/slider/dress-before.png` | Flat-lay photo of a sage green midi slip dress | Top-down flat-lay product photo of a sage green satin midi slip dress with thin straps and a bias cut, laid neatly on a plain warm white cotton sheet, even soft daylight, smartphone product photo quality but tidy, whole garment visible with margin. |
| C2 | `public/images/business/shop/slider/dress-after.png` | Model wearing the same sage green midi slip dress | *(Pipeline output preferred.)* Fallback: a Vietnamese woman in her mid 20s wearing a sage green satin midi slip dress with thin straps and bias cut, standing against a warm plaster wall with soft window shadows, full body, relaxed pose, 50mm. |
| C3 | `public/images/business/shop/slider/set-before.png` | Hanger photo of a cream knit cardigan and skirt set | Product photo of a matching cream ribbed-knit cardigan with pearl buttons and a knit midi skirt on a light wooden hanger against a plain light wall, even daylight, whole set visible. |
| C4 | `public/images/business/shop/slider/set-after.png` | Model wearing the cream knit cardigan and skirt set | *(Pipeline output preferred.)* Fallback: a Vietnamese woman in her late 20s wearing a cream ribbed-knit cardigan with pearl buttons and matching knit midi skirt, café lifestyle setting with soft daylight, full body, candid step. |
| C5 | `public/images/business/shop/slider/bag-before.png` | Product photo of a tan leather shoulder bag | Product photo of a structured tan leather shoulder bag with a short strap and gold clasp, standing upright on a plain light beige surface against a plain wall, soft daylight, no logo. |
| C6 | `public/images/business/shop/slider/bag-after.png` | Model carrying the tan leather shoulder bag | *(Pipeline output preferred.)* Fallback: a Vietnamese woman in her early 30s carrying a structured tan leather shoulder bag with gold clasp on her shoulder, white shirt and black trousers, clean modern street, half body, 85mm, no logos. |

### C7 `public/images/business/shop/step-upload.png` · L43
- **Used in:** Shop "How it works" step 1
- **Alt:** Hands photographing a folded top with a smartphone
- **Prompt:** Overhead view of a woman's hands holding a smartphone above a neatly laid terracotta linen top on a plain white sheet on the floor of a bright room, phone screen facing away from camera, soft daylight, clean composition, horizontal.

### C8 `public/images/business/shop/seller-at-work.png` · L43
- **Used in:** Shop "Cost per product" section
- **Alt:** Shop owner packing orders at a table full of clothes
- **Prompt:** A Vietnamese woman in her late 20s packing orders at a large table in a small bright apartment studio, folded garments, kraft mailer bags and tissue paper, a laptop open showing nothing readable, busy but happy, evening lamp light mixed with window light, horizontal composition.

### C9–C14 Shop look covers · P45 · Used in: Shop looks section, look picker, `SetTemplate.coverImage`

| # | Path | Alt | Prompt |
|---|---|---|---|
| C9 | `public/images/business/shop/looks/clean-white.png` | Model in a white studio wearing a black blazer dress | A Vietnamese woman in her mid 20s wearing a black blazer mini dress, standing straight facing camera on a seamless light-grey white studio background, even soft light, full body head to shoes, marketplace listing style, crisp and clean. |
| C10 | `public/images/business/shop/looks/beige-wall.png` | Model against a warm plaster wall in a cream blouse | A Vietnamese woman in her late 20s wearing a cream puff-sleeve blouse and brown wide-leg trousers, leaning lightly on a warm beige plaster wall with diagonal window shadows, full body, boutique Instagram look. |
| C11 | `public/images/business/shop/looks/cafe-lifestyle.png` | Model in a café wearing a striped shirt | A Vietnamese woman in her early 20s in an oversized blue-and-white striped shirt and denim shorts, standing by a sunny café counter holding an iced drink with no logo, candid smile, bright natural light, full body. |
| C12 | `public/images/business/shop/looks/street-urban.png` | Model walking on a clean city street in a trench coat | A Vietnamese woman in her late 20s walking on a clean modern street with concrete and glass buildings, wearing a khaki trench coat over a white tee and straight jeans, mid-stride, daylight, full body, no readable signs. |
| C13 | `public/images/business/shop/looks/boutique-rack.png` | Model in a minimal boutique wearing a knit dress | A Vietnamese woman in her early 30s in a taupe ribbed knit midi dress standing in a minimal boutique interior, a clothing rail with neutral garments softly blurred behind, warm spot lighting and daylight, full body, elegant. |
| C14 | `public/images/business/shop/looks/resort.png` | Model on a sunny pool terrace in a linen dress | A Vietnamese woman in her mid 20s in a white linen sundress and straw hat on a pale stone pool terrace with palm shadows, bright sunlight, relaxed summer pose, full body, resort catalogue look. |

### C15–C26 Studio models (identity references) · Used in: Shop models section (face images), model picker, and **seeded as `IdentityReference` rows** (both images uploaded to R2 by `scripts/seed-business.ts`)

Shared model prompt rules: plain light-grey seamless background, even soft frontal light, neutral
relaxed expression with a slight smile, hair away from face, minimal makeup, **fitted plain white
crew-neck T-shirt and black straight trousers**, no jewellery, no accessories. All models are
clearly adults. Face image: chest-up, facing camera. Full-body image: standing straight, arms
relaxed at sides, feet visible, facing camera.

| # | Face path (SQ) | Full-body path (P23) | Model | Description to insert |
|---|---|---|---|---|
| C15/C16 | `…/shop/models/model-an-face.jpg` | `…/shop/models/model-an-full.jpg` | **An**, 22 | Vietnamese woman, 22, petite (155 cm), long straight black hair, soft round face |
| C17/C18 | `…/shop/models/model-vy-face.jpg` | `…/shop/models/model-vy-full.jpg` | **Vy**, 26 | Vietnamese woman, 26, tall and slim (170 cm), shoulder-length dark brown hair, defined cheekbones |
| C19/C20 | `…/shop/models/model-thao-face.jpg` | `…/shop/models/model-thao-full.jpg` | **Thảo**, 31 | Vietnamese woman, 31, curvy plus-size figure (US size 14), wavy black hair past shoulders, warm friendly face |
| C21/C22 | `…/shop/models/model-ngoc-face.jpg` | `…/shop/models/model-ngoc-full.jpg` | **Ngọc**, 35 | Vietnamese woman, 35, athletic build, sleek low ponytail, tanned skin |
| C23/C24 | `…/shop/models/model-hana-face.jpg` | `…/shop/models/model-hana-full.jpg` | **Hana**, 28 | Eurasian woman (Vietnamese and European heritage), 28, medium build, light brown wavy bob |
| C25/C26 | `…/shop/models/model-mira-face.jpg` | `…/shop/models/model-mira-full.jpg` | **Mira**, 42 | Vietnamese woman, 42, medium build, elegant short black bob with subtle grey strands, graceful |

(`…` = `public/images/business`.) Alt: "Studio model {Name}, {age}" / "Studio model {Name}, full body".

**Face prompt template:** `Studio identity reference portrait of a {description}. {shared model prompt rules}. Chest-up, facing camera directly, head straight, 85mm, sharp focus on eyes.`
**Full-body prompt template:** `Studio identity reference full-body photo of a {description}. {shared model prompt rules}. Standing straight facing camera, arms relaxed at sides, whole body from head to feet with margin, 50mm.`

---

## D. Onboarding guides (P4) · SQ-S unless noted

| # | Path | Alt | Prompt |
|---|---|---|---|
| D1 | `public/images/business/onboarding/selfie-good.png` | Good selfie: face lit evenly, looking at camera | Casual smartphone selfie of a Vietnamese woman in her 30s facing the camera directly, even soft window light on her face, plain light wall behind, hair behind ears, relaxed neutral smile, face filling the centre of the frame. |
| D2 | `public/images/business/onboarding/selfie-bad-sunglasses.png` | Avoid: sunglasses and hat hiding the face | Casual smartphone selfie of a Vietnamese woman in her 30s outdoors wearing large dark sunglasses and a bucket hat shading her face, harsh midday sun. |
| D3 | `public/images/business/onboarding/selfie-bad-dark.png` | Avoid: dark photo with strong backlight | Smartphone selfie of a Vietnamese woman in her 30s standing in front of a bright window so her face is dark and underexposed, strong backlight, low detail on face. |
| D4 | `public/images/business/onboarding/selfie-bad-group.png` | Avoid: several people in the photo | Casual smartphone group selfie of three young Vietnamese women friends close together laughing at a café, faces partially overlapping. |
| D5 | `public/images/business/onboarding/fullbody-good.png` (P23) | Good full-body photo: whole body visible against a plain wall | Full-body photo (not a mirror selfie) of a Vietnamese woman in her late 20s standing straight against a plain light wall in fitted everyday clothes (white tee, jeans), whole body from head to feet visible, even daylight, taken by a friend at chest height. |
| D6 | `public/images/business/onboarding/product-good-flatlay.png` | Good product photo: flat-lay on a plain sheet | Top-down photo of a single dusty-pink blouse laid flat and smooth on a plain white sheet, sleeves arranged neatly, even soft daylight, whole garment visible with margin. |
| D7 | `public/images/business/onboarding/product-good-hanger.png` | Good product photo: on a hanger against a plain wall | Photo of a single olive-green midi skirt on a wooden hanger hanging against a plain light wall, even daylight, whole garment visible, no other objects. |
| D8 | `public/images/business/onboarding/product-bad-wrinkled.png` | Avoid: crumpled garment in poor light | Top-down photo of a crumpled black T-shirt bunched up on a patterned bedspread in dim yellow lamp light, partly out of frame. |
| D9 | `public/images/business/onboarding/product-bad-multiple.png` | Avoid: several items in one photo | Top-down photo of five different clothing items overlapping on a floor — jeans, two tops, a scarf and a belt — messy, uneven light. |

---

## E. Not generated (build in code)

- **Icons, empty-state illustrations, decorative shapes:** hand-written SVG (`src/components/ui/Icons.tsx`, `src/components/ui/illustrations/`).
- **Phone / marketplace frames, UI mock frames:** HTML/CSS containers holding generated images above.
- **OG images** (`/`, `/brand`, `/shop`, `/pricing`): `next/og` `ImageResponse` composed from the images above + Cormorant headline (P11). Check the Next 16 docs for `opengraph-image.tsx`.
- **Mock-mode outputs:** when `NEXT5_MOCK_GENERATION=true`, batch items resolve to the set/look cover images above (no new images needed).
