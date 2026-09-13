/**
 * Marketing copy for the business surfaces (US English). Spec: 01-product-spec.md §6, 03-ux-ui.md §5.
 * Image paths must exist in public/images/manifest.json — components guard with hasManifestImage().
 */

const IMG = '/images/business';

export type FaqItem = { q: string; a: string };

export const HOME = {
  hero: {
    eyebrow: 'Next5 for business',
    title: 'Photos of you that work as hard as you do.',
    sub: 'On-brand photos for professionals and on-model photos for online shops — every month, without a photoshoot.',
    images: [`${IMG}/home/hero-professional.png`, `${IMG}/home/hero-shop.png`] as const,
  },
  products: [
    {
      href: '/brand',
      eyebrow: 'For professionals',
      title: 'A month of on-brand photos of you.',
      body: 'For realtors, coaches and beauty pros who post every week and are tired of the same five photos.',
      image: `${IMG}/home/card-professional.png`,
      cta: 'See Brand Studio',
      planProduct: 'brand' as const,
    },
    {
      href: '/shop',
      eyebrow: 'For online shops',
      title: 'Every new product, worn and ready to post.',
      body: 'For TikTok Shop, Instagram and Shopee sellers who restock every week and need photos the same day.',
      image: `${IMG}/home/card-shop.png`,
      cta: 'See Shop Studio',
      planProduct: 'shop' as const,
    },
  ],
  steps: [
    { title: 'Upload once', body: 'A few selfies — or pick a Studio model for your products.' },
    { title: 'Pick your look', body: 'Choose a set that matches your brand. It stays the same every month.' },
    { title: 'Post all month', body: 'Get fresh photos in every social and marketplace format.' },
  ],
  faq: [
    { q: 'Will the photos really look like me?', a: 'Yes — we use three of your selfies as the reference for every photo. If one doesn’t look like you, redo it for free, twice per photo.' },
    { q: 'How do I pay?', a: 'By bank transfer QR for 1, 3 or 6 months. Nothing renews automatically; we remind you before your plan ends.' },
    { q: 'Who owns the photos?', a: 'You do. Use them on social media, your website, listings and ads.' },
    { q: 'Are the photos labelled as AI?', a: 'Every file carries an embedded “AI-generated” label, and you can add a small visible tag. Platforms like TikTok and Meta ask you to disclose AI content — we make that easy.' },
    { q: 'What happens to my selfies?', a: 'They are only used to create your photos. Delete them anytime in Settings → Privacy.' },
    { q: 'Looking for a personal photoshoot?', a: 'Next5 Photos creates five directed photos for your personal Instagram — see next5 photos.' },
  ] satisfies FaqItem[],
};

export const BRAND = {
  hero: {
    eyebrow: 'Brand Studio',
    title: 'A month of on-brand photos of you. Without the photoshoot.',
    sub: 'Upload three selfies once. Pick your set. Get a fresh drop of professional photos every month — for listings, posts and your profile.',
    cta: 'Start free — get 3 photos',
    image: `${IMG}/brand/hero-main.png`,
  },
  comparison: {
    title: 'The old way costs a day and looks the same for a year.',
    rows: [
      { label: 'Cost', old: '$1,200+ per shoot', next5: 'From $19 a month' },
      { label: 'How often', old: 'Once or twice a year', next5: 'New photos every month' },
      { label: 'Time', old: 'A day of prep, travel and posing', next5: 'Five minutes to create a batch' },
      { label: 'Variety', old: 'The same 30 photos, recycled', next5: 'A new theme every month' },
    ],
  },
  steps: [
    { title: 'Upload three selfies', body: 'Front, slight left, slight right. Good light, no sunglasses.', image: `${IMG}/brand/step-selfies.png` },
    { title: 'Build your set', body: 'Pick a location, wardrobe and your brand colours. It becomes your signature look.', image: `${IMG}/brand/sets/modern-office.png` },
    { title: 'Get your monthly drop', body: 'Choose this month’s theme and how many photos you need. Ready in minutes.', image: `${IMG}/brand/themes/just-listed.png` },
  ],
  industries: [
    { id: 'real-estate', label: 'Real estate', image: `${IMG}/brand/industries/real-estate.png`, points: ['Just-listed and open-house posts', '“Meet your agent” profile photos', 'Market updates that look like expertise'] },
    { id: 'coaching', label: 'Coaching', image: `${IMG}/brand/industries/coaching.png`, points: ['Launch and webinar promos', 'Warm, trustworthy profile photos', 'Behind-the-scenes content every week'] },
    { id: 'beauty', label: 'Beauty & wellness', image: `${IMG}/brand/industries/beauty-wellness.png`, points: ['Owner portraits for your salon or spa', 'Seasonal promos without a shoot', 'Consistent photos across booking sites'] },
    { id: 'fitness', label: 'Fitness', image: `${IMG}/brand/industries/fitness.png`, points: ['Class and program announcements', 'Energetic profile and cover photos', 'New content for every challenge'] },
    { id: 'finance', label: 'Finance & insurance', image: `${IMG}/brand/industries/finance.png`, points: ['Credible LinkedIn and Facebook photos', 'Client-meeting scenes that build trust', 'Year-end and Lunar New Year greetings'] },
  ],
  formatsImage: `${IMG}/brand/formats-master.png`,
  guarantees: [
    { title: 'Looks like you', body: 'Redo any photo for free, twice.' },
    { title: 'No auto-charge', body: 'Prepaid plans. Renew only when you want.' },
    { title: 'Your face, your call', body: 'Delete your selfies anytime.' },
    { title: 'AI label built in', body: 'Every file is labelled for platform rules.' },
  ],
  faq: [
    { q: 'Will it look like me?', a: 'We use your three selfies as the reference for every photo and keep your face, skin tone and hair unchanged. Anything off? Redo it free, twice per photo.' },
    { q: 'What do I need to upload?', a: 'Three recent selfies in good light: one facing the camera, one turned slightly left, one slightly right. No sunglasses or hats, just you in the frame.' },
    { q: 'Who owns the photos?', a: 'You do. Use them on social media, your website, listing portals, business cards and ads.' },
    { q: 'Can I use them in ads?', a: 'Yes. Don’t use them to claim things that aren’t true — no fake awards, sales or credentials. We never generate those.' },
    { q: 'How do I pay?', a: 'Scan a bank transfer QR for 1, 3 or 6 months. Credits arrive monthly. Nothing renews automatically.' },
    { q: 'What happens when my plan ends?', a: 'Your library stays available to download for 90 days. Renew anytime to keep creating.' },
    { q: 'Is my face data safe?', a: 'Your selfies are stored privately, used only to create your photos and never used to train models. Delete them anytime in Settings → Privacy.' },
    { q: 'Do I have to label photos as AI?', a: 'Many platforms and Vietnam’s AI law ask that AI images of real people are labelled. Every file carries an embedded label, and you can add a visible tag.' },
  ] satisfies FaqItem[],
};

export const SHOP = {
  hero: {
    eyebrow: 'Shop Studio',
    title: 'New stock this morning. On-model photos by lunch.',
    sub: 'Upload a flat-lay or hanger photo. Get it worn by you or a Studio model, in your shop’s look, sized for TikTok Shop, Shopee and Instagram.',
    cta: 'Try it free with one product',
  },
  slider: [
    { id: 'dress', label: 'Dress', before: `${IMG}/shop/slider/dress-before.png`, after: `${IMG}/shop/slider/dress-after.png` },
    { id: 'set', label: 'Set', before: `${IMG}/shop/slider/set-before.png`, after: `${IMG}/shop/slider/set-after.png` },
    { id: 'bag', label: 'Bag', before: `${IMG}/shop/slider/bag-before.png`, after: `${IMG}/shop/slider/bag-after.png` },
  ],
  costImage: `${IMG}/shop/seller-at-work.png`,
  steps: [
    { title: 'Upload product photos', body: 'A clear front photo on a plain background. Add back and detail photos for better accuracy.', image: `${IMG}/shop/step-upload.png` },
    { title: 'Pick a model and look', body: 'Wear it yourself or choose a Studio model. Pick the look that matches your shop.', image: `${IMG}/shop/looks/beige-wall.png` },
    { title: 'Download every format', body: 'Square for listings, vertical for TikTok, 4:5 for Instagram — named by SKU.', image: `${IMG}/shop/slider/dress-after.png` },
  ],
  marketplaces: [
    { label: 'Marketplace listing', format: 'square_1_1' as const, image: `${IMG}/shop/looks/clean-white.png` },
    { label: 'Video cover', format: 'story_9_16' as const, image: `${IMG}/shop/looks/street-urban.png` },
    { label: 'Instagram feed', format: 'portrait_4_5' as const, image: `${IMG}/shop/looks/cafe-lifestyle.png` },
  ],
  posting: [
    'Turn on the AI-generated label when you post on TikTok Shop.',
    'Photos must match the real product — colour, print and length.',
    'Keep real customer photos real. Use Next5 for your listing and campaign photos.',
  ],
  faq: [
    { q: 'Which product photos work best?', a: 'One item, laid flat or on a hanger, on a plain light background in daylight. Add a detail photo for prints, buttons or lace.' },
    { q: 'Can I use my own face?', a: 'Yes. Upload two selfies and one full-body photo once, and every product can be worn by you.' },
    { q: 'Will colours and prints match?', a: 'We instruct the model to keep colour, print placement, length and details identical, and you compare every photo with your product photo. If a garment doesn’t match, redo it free, twice.' },
    { q: 'Which formats do I get?', a: 'Square 1:1 for listings, 9:16 for TikTok and Stories, 4:5 for Instagram and 3:4 for your website.' },
    { q: 'Can I sell on TikTok Shop with these photos?', a: 'Yes, as long as the photo matches the real item and you add the AI-generated label TikTok asks for.' },
    { q: 'How do I pay?', a: 'By bank transfer QR for 1, 3 or 6 months, with top-ups anytime. Nothing renews automatically.' },
    { q: 'Can I upload many products at once?', a: 'Yes — add up to 20 products in one go, then generate photos for up to 40 products per batch.' },
    { q: 'What happens to my photos and data?', a: 'Product photos are kept for 12 months after last use; your selfies until you delete them. Download everything anytime.' },
  ] satisfies FaqItem[],
};

export const PRICING = {
  title: 'Simple plans. Prepaid. No surprises.',
  sub: 'Pay by bank transfer for 1, 3 or 6 months. Top up anytime. Nothing renews automatically — we remind you before your plan ends.',
  billingSteps: [
    { title: 'Scan and pay', body: 'Pay for 1, 3 or 6 months by bank transfer QR. Longer terms save up to 20%.' },
    { title: 'Photos arrive monthly', body: 'Your monthly photos land on the same day each month. Unused photos expire at the end of the month.' },
    { title: 'Renew when you want', body: 'We email you 7 days before your plan ends. Top-ups last 12 months.' },
  ],
  faq: [
    { q: 'Why prepaid?', a: 'Bank transfer is the simplest way to pay in Vietnam, and it means you are never charged by surprise.' },
    { q: 'What is a photo credit?', a: 'One credit creates one photo in one format. High-res 2K photos use two credits.' },
    { q: 'Do unused photos roll over?', a: 'Monthly plan photos expire at the end of each month. Top-up photos last 12 months.' },
    { q: 'Can I change plans?', a: 'Yes. A new plan starts right away; there is no proration, and you keep this month’s remaining photos until they expire.' },
    { q: 'What if a photo fails?', a: 'Failed photos are refunded automatically, and every photo can be redone for free twice.' },
  ] satisfies FaqItem[],
};
