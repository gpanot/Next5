/**
 * Marketing copy for the business surfaces (US English). Spec: 01-product-spec.md §6, 03-ux-ui.md §5.
 * Image paths must exist in public/images/manifest.json — components guard with hasManifestImage().
 */

const IMG = '/images/business';

export type FaqItem = { q: string; a: string };

export const HOME = {
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
  final: {
    title: 'Stop posting the same old photos.',
    body: 'Get 3 free photos today. Paid plans are opening to a small group first.',
    brand: { href: '/start/brand', cta: 'Start free for my business' },
    shop: { href: '/start/shop', cta: 'Start free for my shop' },
  },
  faq: [
    { q: 'Will the photos look like me?', a: 'Yes. We use your selfies for every photo. If one looks off, redo it for free. You get two free redos per photo.' },
    { q: 'Will my product look right?', a: 'We keep the color, print and length the same. You see your photo next to the new one. If it does not match, redo it for free.' },
    { q: 'Can’t I just use ChatGPT?', a: 'You can make one photo. But your face or your product changes each time, and you still write every post. Next5 keeps you and your product the same, makes 30 photos at once, and writes the hook, caption and hashtags.' },
    { q: 'How much does it cost?', a: 'Brand Studio starts at $29 a month. Shop Studio starts at $49 a month. Your first 3 photos are free.' },
    { q: 'How fast do I get my photos?', a: 'Most photos are ready in a few minutes. We email you when a big batch is done.' },
    { q: 'How do I pay?', a: 'You pay by bank transfer for 1, 3 or 6 months. Nothing renews on its own. We remind you before your plan ends.' },
    { q: 'Who owns the photos?', a: 'You do. Use them on social media, your website, your listings and your ads.' },
    { q: 'Do the photos say they are made with AI?', a: 'Yes. Each file has a hidden AI label inside it. You can also add a small label people can see. TikTok and Meta ask for this.' },
    { q: 'What happens to my selfies?', a: 'We only use them to make your photos. You can delete them any time in Settings.' },
  ] satisfies FaqItem[],
};

export const BRAND = {
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
  faq: [
    { q: 'Can’t I just use ChatGPT?', a: 'You can make one photo. But your face changes a little each time, and you still have to write every post. Next5 keeps your face the same every month, makes all your photos at once, and writes the hook, caption and hashtags.' },
    { q: 'What is the Scroll-Stop Score?', a: 'Every photo gets a score from 0 to 100. AI checks six things that make people stop scrolling, like light, a clear face and how it looks small. You also get one tip to post it better.' },
    { q: 'Do I have to plan my posts?', a: 'No. Pick the days you want to post. We put your best photo on each day, ready to go. Open one, save the photo, copy the caption. About twenty seconds.' },
    { q: 'Can you post for me?', a: 'Not yet. Instagram and TikTok only let apps post in ways that would slow you down. So we do everything up to the last step: the photo and the words are ready, and you tap post.' },
    { q: 'Can I use my own photos of a house or my salon?', a: 'Yes. Add a photo of a listing or your place, and your next photos put you inside it. One upload turns into a post.' },
    { q: 'What is the Beat-your-feed promise?', a: 'Post 12 Next5 photos in 30 days. Then compare them with your last 12 posts in your own stats. If they did not do better, tell us in the app and your next month is free. The app counts your 12 posts for you.' },
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
  slider: [
    { id: 'dress', label: 'Dress', before: `${IMG}/shop/slider/dress-before.png`, after: `${IMG}/shop/slider/dress-after.png` },
    { id: 'set', label: 'Set', before: `${IMG}/shop/slider/set-before.png`, after: `${IMG}/shop/slider/set-after.png` },
    { id: 'bag', label: 'Bag', before: `${IMG}/shop/slider/bag-before.png`, after: `${IMG}/shop/slider/bag-after.png` },
  ],
  steps: [
    { title: 'Paste your shop link', body: 'We bring in your products, prices and sales in about a minute. No TikTok login needed.', image: `${IMG}/shop/step-upload.png` },
    { title: 'Pick a look and a model', body: 'Wear it yourself or pick one of our models. Every product comes out in your shop’s style.', image: `${IMG}/shop/looks/beige-wall.png` },
    { title: 'Get listing packs every week', body: 'Each week we pick your new stock. You get up to 9 photos per product in TikTok’s upload order, plus a video cover.', image: `${IMG}/shop/slider/dress-after.png` },
  ],
  marketplaces: [
    { label: 'Shop listing', format: 'square_1_1' as const, image: `${IMG}/shop/looks/clean-white.png` },
    { label: 'Video cover', format: 'story_9_16' as const, image: `${IMG}/shop/looks/street-urban.png` },
    { label: 'Instagram post', format: 'portrait_4_5' as const, image: `${IMG}/shop/looks/cafe-lifestyle.png` },
  ],
  faq: [
    { q: 'Can you bring in my TikTok Shop?', a: 'Yes. Paste your shop link and we bring in your products, prices and sales. You can also upload the product export from TikTok Seller Center. You must own or manage the shop.' },
    { q: 'How do weekly drops work?', a: 'Pick a day. Each week we find your new products and best sellers that still need photos, and email you a drop. You check it and create the photos in one click. Nothing is made until you say so.' },
    { q: 'What is a listing pack?', a: 'Up to 9 photos for one product, in the order TikTok Shop shows them, plus a 9:16 video cover and the description. Download it as one zip and upload.' },
    { q: 'Can’t I just use ChatGPT?', a: 'ChatGPT often changes the color, print or length of your product. That leads to returns. Next5 keeps your real product, uses the same models every time, and writes the hook, description and hashtags for every photo.' },
    { q: 'What is the Scroll-Stop Score?', a: 'Every photo gets a score from 0 to 100. AI checks six things that make shoppers stop, like a clear product, good light and how it looks as a small photo. You also get a tip, like which photo to use as your cover.' },
    { q: 'What is the Beat-your-feed promise?', a: 'Post 12 Next5 photos in 30 days. Then compare them with your last 12 posts in your own stats. If they did not do better, tell us in the app and your next month is free.' },
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
