/**
 * Marketing copy for the business surfaces (US English). Spec: 01-product-spec.md §6, 03-ux-ui.md §5.
 * Image paths must exist in public/images/manifest.json — components guard with hasManifestImage().
 */

const IMG = '/images/business';

export type FaqItem = { q: string; a: string };

export type ComparisonRow = { label: string; old: string; next5: string };

export const HOME = {
  hero: {
    eyebrow: 'Try it free · No card needed',
    title: 'Fresh photos every month. No photo shoot.',
    sub: 'Send us a few selfies or a photo of what you sell. Get pro photos back in minutes. Your first 3 photos are free.',
    note: '3 free photos. No card. About 5 minutes.',
    brandImage: `${IMG}/home/hero-professional.png`,
    shopBefore: `${IMG}/shop/slider/dress-before.png`,
    shopAfter: `${IMG}/shop/slider/dress-after.png`,
  },
  proof: {
    eyebrow: 'See it work',
    title: 'You take a quick photo. We make it look pro.',
    sub: 'Slide across the photo. On the left is a plain product photo. On the right is what Next5 made from it.',
    points: [
      'Same color, same print, same length.',
      'Worn by you or one of our models.',
      'Ready to post in minutes.',
    ],
  },
  comparison: {
    eyebrow: 'The math',
    title: 'A photo shoot costs a lot. Next5 costs a little.',
    oldLabel: 'A photo shoot',
    next5Label: 'Next5',
    rows: [
      { label: 'Price', old: '$1,200 or more', next5: 'From $15 a month' },
      { label: 'Your time', old: 'A full day', next5: 'About 5 minutes' },
      { label: 'Wait', old: 'Days or weeks for edits', next5: 'Photos in minutes' },
      { label: 'New photos', old: 'Once or twice a year', next5: 'Every month' },
    ] satisfies ComparisonRow[],
  },
  products: [
    {
      href: '/brand',
      eyebrow: 'If you sell a service',
      title: 'Photos of you, every month.',
      body: 'For realtors, coaches and beauty pros. Stop posting the same five photos.',
      image: `${IMG}/brand/sets/modern-office.png`,
      cta: 'See Brand Studio',
      planProduct: 'brand' as const,
    },
    {
      href: '/shop',
      eyebrow: 'If you sell products online',
      title: 'Your products, worn by a model.',
      body: 'For TikTok Shop, Instagram and Shopee sellers. Post new stock the same day it comes in.',
      image: `${IMG}/shop/slider/set-after.png`,
      cta: 'See Shop Studio',
      planProduct: 'shop' as const,
    },
  ],
  steps: [
    { title: 'Send your photos', body: 'A few selfies, or a photo of your product.' },
    { title: 'Pick a look', body: 'Choose a place and a style. It stays the same every month.' },
    { title: 'Post all month', body: 'Get photos sized for Instagram, TikTok and your shop.' },
  ],
  promise: {
    eyebrow: 'Our promise',
    title: 'It looks right, or we fix it for free.',
    sub: 'If a photo does not look like you, or like your product, tap Redo. We make it again for free, two times per photo. If a photo fails, you get your photo credit back.',
  },
  guarantees: [
    { title: 'Free to try', body: '3 free photos. No card needed.' },
    { title: 'Free redos', body: 'Two free redos for every photo.' },
    { title: 'No surprise bills', body: 'You pay first. Nothing renews on its own.' },
    { title: 'Your photos are yours', body: 'Use them anywhere. Delete your selfies any time.' },
  ],
  final: {
    title: 'Stop posting the same old photos.',
    body: 'Get 3 free photos today. Paid plans are opening to a small group first.',
    brand: { href: '/start/brand', cta: 'Start free for my business' },
    shop: { href: '/start/shop', cta: 'Start free for my shop' },
  },
  faq: [
    { q: 'Will the photos look like me?', a: 'Yes. We use your selfies for every photo. If one looks off, redo it for free. You get two free redos per photo.' },
    { q: 'Will my product look right?', a: 'We keep the color, print and length the same. You see your photo next to the new one. If it does not match, redo it for free.' },
    { q: 'How much does it cost?', a: 'Plans start at $15 a month for shops and $19 a month for people who sell a service. Your first 3 photos are free.' },
    { q: 'How fast do I get my photos?', a: 'Most photos are ready in a few minutes. We email you when a big batch is done.' },
    { q: 'How do I pay?', a: 'You pay by bank transfer for 1, 3 or 6 months. Nothing renews on its own. We remind you before your plan ends.' },
    { q: 'Who owns the photos?', a: 'You do. Use them on social media, your website, your listings and your ads.' },
    { q: 'Do the photos say they are made with AI?', a: 'Yes. Each file has a hidden AI label inside it. You can also add a small label people can see. TikTok and Meta ask for this.' },
    { q: 'What happens to my selfies?', a: 'We only use them to make your photos. You can delete them any time in Settings.' },
  ] satisfies FaqItem[],
};

export const BRAND = {
  hero: {
    eyebrow: 'Brand Studio',
    title: 'New photos of you every month. No photo shoot.',
    sub: 'Send three selfies one time. Pick your look. Get new pro photos every month for your posts, listings and profile.',
    cta: 'Start free: get 3 photos',
    image: `${IMG}/brand/hero-main.png`,
  },
  comparison: {
    title: 'A photo shoot takes a day. Then your photos get old.',
    rows: [
      { label: 'Cost', old: '$1,200 or more per shoot', next5: 'From $19 a month' },
      { label: 'How often', old: 'Once or twice a year', next5: 'New photos every month' },
      { label: 'Time', old: 'A full day to get ready and pose', next5: 'About 5 minutes' },
      { label: 'Variety', old: 'The same 30 photos, again and again', next5: 'A new theme every month' },
    ] satisfies ComparisonRow[],
  },
  steps: [
    { title: 'Send three selfies', body: 'Look at the camera. Then turn a little left, then a little right. Use good light. No sunglasses.', image: `${IMG}/brand/step-selfies.png` },
    { title: 'Make your set', body: 'Pick a place, your clothes and your brand colors. This is your look.', image: `${IMG}/brand/sets/modern-office.png` },
    { title: 'Get your photos each month', body: 'Pick this month’s theme and how many photos you want. They are ready in minutes.', image: `${IMG}/brand/themes/just-listed.png` },
  ],
  industries: [
    { id: 'real-estate', label: 'Real estate', image: `${IMG}/brand/industries/real-estate.png`, points: ['Posts for new homes and open houses', '“Meet your agent” profile photos', 'Market posts that make you look like the expert'] },
    { id: 'coaching', label: 'Coaching', image: `${IMG}/brand/industries/coaching.png`, points: ['Posts for launches and live classes', 'Warm profile photos people trust', 'New behind-the-scenes photos each week'] },
    { id: 'beauty', label: 'Beauty & wellness', image: `${IMG}/brand/industries/beauty-wellness.png`, points: ['Owner photos for your salon or spa', 'Holiday deals without a photo shoot', 'The same look on every booking site'] },
    { id: 'fitness', label: 'Fitness', image: `${IMG}/brand/industries/fitness.png`, points: ['Posts for new classes and programs', 'Bright, fun profile and cover photos', 'New photos for every challenge'] },
    { id: 'finance', label: 'Finance & insurance', image: `${IMG}/brand/industries/finance.png`, points: ['LinkedIn and Facebook photos people trust', 'Photos of you meeting with clients', 'New Year and Lunar New Year cards'] },
  ],
  formatsImage: `${IMG}/brand/formats-master.png`,
  guarantees: [
    { title: 'Looks like you', body: 'Redo any photo for free, two times.' },
    { title: 'No auto-charge', body: 'You pay first. Renew only if you want.' },
    { title: 'Your face, your choice', body: 'Delete your selfies any time.' },
    { title: 'AI label built in', body: 'Every file has the AI label that apps ask for.' },
  ],
  faq: [
    { q: 'Will it look like me?', a: 'We use your three selfies for every photo. We keep your face, skin and hair the same. If a photo looks off, redo it for free, two times.' },
    { q: 'What do I need to send?', a: 'Three new selfies in good light. One looking at the camera, one turned a little left, one turned a little right. No sunglasses or hats. Just you in the photo.' },
    { q: 'Who owns the photos?', a: 'You do. Use them on social media and your website. Use them on listing sites, business cards and ads.' },
    { q: 'Can I use them in ads?', a: 'Yes. Just do not use them to say things that are not true, like fake awards or fake sales. We never make those.' },
    { q: 'How do I pay?', a: 'Pay by bank transfer for 1, 3 or 6 months. New photo credits come each month. Nothing renews on its own.' },
    { q: 'What happens when my plan ends?', a: 'You can still download your photos for 90 days. Renew any time to make more.' },
    { q: 'Is my face safe with you?', a: 'We keep your selfies private. We only use them to make your photos, and never to train AI. Delete them any time in Settings.' },
    { q: 'Do I have to say my photos are AI?', a: 'Many apps, and the law in Vietnam, ask you to label AI photos of real people. Every file already has a hidden label. You can add one people can see, too.' },
  ] satisfies FaqItem[],
};

export const SHOP = {
  hero: {
    eyebrow: 'Shop Studio',
    title: 'New stock this morning. Photos of it worn by lunch.',
    sub: 'Take a photo of your product on a hanger or laid flat. We show it worn by you or one of our models. Every photo fits TikTok Shop, Shopee and Instagram.',
    cta: 'Try it free with one product',
  },
  slider: [
    { id: 'dress', label: 'Dress', before: `${IMG}/shop/slider/dress-before.png`, after: `${IMG}/shop/slider/dress-after.png` },
    { id: 'set', label: 'Set', before: `${IMG}/shop/slider/set-before.png`, after: `${IMG}/shop/slider/set-after.png` },
    { id: 'bag', label: 'Bag', before: `${IMG}/shop/slider/bag-before.png`, after: `${IMG}/shop/slider/bag-after.png` },
  ],
  costImage: `${IMG}/shop/seller-at-work.png`,
  steps: [
    { title: 'Send product photos', body: 'Take a clear photo from the front on a plain background. Add back and close-up photos for better results.', image: `${IMG}/shop/step-upload.png` },
    { title: 'Pick a model and a look', body: 'Wear it yourself or pick one of our models. Pick a look that fits your shop.', image: `${IMG}/shop/looks/beige-wall.png` },
    { title: 'Download every size', body: 'Square for listings, tall for TikTok, 4:5 for Instagram. Each file is named with your product code.', image: `${IMG}/shop/slider/dress-after.png` },
  ],
  marketplaces: [
    { label: 'Shop listing', format: 'square_1_1' as const, image: `${IMG}/shop/looks/clean-white.png` },
    { label: 'Video cover', format: 'story_9_16' as const, image: `${IMG}/shop/looks/street-urban.png` },
    { label: 'Instagram post', format: 'portrait_4_5' as const, image: `${IMG}/shop/looks/cafe-lifestyle.png` },
  ],
  posting: [
    'Turn on the AI label when you post on TikTok Shop.',
    'Your photo must match the real product: the color, print and length.',
    'Keep real customer photos real. Use Next5 for your shop and ad photos.',
  ],
  faq: [
    { q: 'What product photos work best?', a: 'One item on a hanger or laid flat. Use a plain, light background and daylight. Add a close-up for prints, buttons or lace.' },
    { q: 'Can I wear the clothes in the photos?', a: 'Yes. Send two selfies and one full-body photo one time. Then every product can be worn by you.' },
    { q: 'Will the colors and prints match?', a: 'We tell the AI to keep the color, print, length and details the same. You see each new photo next to your product photo. If it does not match, redo it for free, two times.' },
    { q: 'What sizes do I get?', a: 'Square (1:1) for listings. Tall (9:16) for TikTok and Stories. 4:5 for Instagram. 3:4 for your website.' },
    { q: 'Can I sell on TikTok Shop with these photos?', a: 'Yes. The photo must match the real item. You must also add the AI label TikTok asks for.' },
    { q: 'How do I pay?', a: 'Pay by bank transfer for 1, 3 or 6 months. Buy more photos any time. Nothing renews on its own.' },
    { q: 'Can I add a lot of products at once?', a: 'Yes. Add up to 20 products at a time. Then make photos for up to 40 products in one go.' },
    { q: 'What happens to my photos?', a: 'We keep product photos for 12 months after you last use them. We keep your selfies until you delete them. You can download everything any time.' },
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
