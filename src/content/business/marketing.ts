/**
 * Marketing copy for the business surfaces (US English). Spec: 01-product-spec.md §6, 03-ux-ui.md §5.
 * Image paths must exist in public/images/manifest.json — components guard with hasManifestImage().
 */

const IMG = '/images/business';

export type FaqItem = { q: string; a: string };

export const BRAND = {
  steps: [
    { title: 'Send three selfies', body: 'Look at the camera. Then turn a little left, then a little right. Use good light. No sunglasses.', image: `${IMG}/us/brand/step-selfies.png` },
    { title: 'Make your style', body: 'Pick a place, your clothes and your brand colors. This is your look.', image: `${IMG}/us/brand/sets/modern-office.png` },
    { title: 'Get your photos and videos each month', body: 'Pick this month’s theme or one of your listings. Photos are ready in minutes. Our team sends your UGC videos.', image: `${IMG}/us/realtor-hero.png` },
  ],
  listings: {
    /** Real listing photo in, the same room with the agent in it out. Made with the listing-mode edit model. */
    slider: [
      { id: 'living', label: 'Living room', before: `${IMG}/us/listing/living-before.png`, after: `${IMG}/us/listing/living-after.png` },
      { id: 'kitchen', label: 'Kitchen', before: `${IMG}/us/listing/kitchen-before.png`, after: `${IMG}/us/listing/kitchen-after.png` },
      { id: 'porch', label: 'Front yard', before: `${IMG}/us/listing/porch-before.png`, after: `${IMG}/us/listing/porch-after.png` },
    ],
    points: [
      'Paste your Zillow link. We bring in the photos, price, beds and baths.',
      'Pick the rooms you want to be in. We put you inside those real rooms.',
      'We never add a room that is not there, and never change the home.',
      'Your caption can use the price, beds and baths from the listing.',
    ],
    moments: ['Coming soon', 'Just listed', 'Open house', 'Under contract', 'Just sold'],
  },
  faq: [
    { q: 'Can’t I just use ChatGPT?', a: 'You can make one photo. But your face changes a little each time, you still have to write every post, and it will not make your weekly videos. Next5 keeps your face the same every month, makes all your photos at once, writes the hook, caption and hashtags, and our team makes your UGC videos.' },
    { q: 'What are UGC videos?', a: 'Short videos for Reels, TikTok and Shorts, in the style people film on their phones. Our team makes them for you each month: a hook, a short script and captions on screen. Starter gets 1 a month, Growth gets 4 and Agency gets 40.' },
    { q: 'Do I have to film anything?', a: 'No. Our team makes the videos and sends them to you. You post them, like your photos.' },
    { q: 'I’m a realtor. Can I use my Zillow listing?', a: 'Yes. Paste your Zillow link. We bring in the photos and the price, beds and baths. You pick the photos you want to be in, and we put you inside those real rooms. We never add a room that is not there. You must represent the property.' },
    { q: 'What is the Scroll-Stop Score?', a: 'Every photo gets a score from 0 to 100. AI checks six things that make people stop scrolling, like light, a clear face and how it looks small. You also get one tip to post it better.' },
    { q: 'Do I have to plan my posts?', a: 'No. Pick the days you want to post. We put your best photo on each day, ready to go. Open one, save the photo, copy the caption. About twenty seconds.' },
    { q: 'Can you post for me?', a: 'Not yet. Instagram and TikTok only let apps post in ways that would slow you down. So we do everything up to the last step: the photo and the words are ready, and you tap post.' },
    { q: 'Can I upload my own photos of a house?', a: 'Yes. Upload photos of a home you represent, and your next photos put you inside those rooms. One upload turns into a post.' },
    { q: 'What is the Beat-your-feed promise?', a: 'Post 12 Next5 photos in 30 days. Then compare them with your last 12 posts in your own stats. If they did not do better, tell us in the app and your next month is free. The app counts your 12 posts for you.' },
    { q: 'Will it look like me?', a: 'We use your three selfies for every photo. We keep your face, skin and hair the same. If a photo looks off, redo it for free, two times.' },
    { q: 'What do I need to send?', a: 'Three new selfies in good light. One looking at the camera, one turned a little left, one turned a little right. No sunglasses or hats. Just you in the photo.' },
    { q: 'Who owns the photos and videos?', a: 'You do. Use them on social media and your website. Use them on listing sites, business cards and ads.' },
    { q: 'Can I use them in ads?', a: 'Yes. Just do not use them to say things that are not true, like fake awards or fake sales. We never make those.' },
    { q: 'How do I pay?', a: 'You pay up front for 1, 3 or 6 months. New photos come each month. Nothing renews on its own.' },
    { q: 'What happens when my plan ends?', a: 'You can still download your photos for 90 days. Renew any time to make more.' },
    { q: 'Is my face safe with you?', a: 'We keep your selfies private. We only use them to make your photos, and never to train AI. Delete them any time in Settings.' },
    { q: 'Do I have to say my photos are AI?', a: 'Instagram and TikTok ask you to label AI photos of real people. Some states, like California, also ask agents to say when a listing photo was changed. Every file already has a hidden label. You can add one people can see, too.' },
  ] satisfies FaqItem[],
};

export const SHOP = {
  slider: [
    { id: 'dress', label: 'Dress', before: `${IMG}/shop/slider/dress-before.png`, after: `${IMG}/us/shop-dress-after.png` },
    { id: 'set', label: 'Set', before: `${IMG}/shop/slider/set-before.png`, after: `${IMG}/us/shop-set-after.png` },
    { id: 'bag', label: 'Bag', before: `${IMG}/shop/slider/bag-before.png`, after: `${IMG}/us/shop-bag-after.png` },
  ],
  steps: [
    { title: 'Paste your shop link', body: 'We bring in your products, prices and sales in about a minute. No TikTok login needed.', image: `${IMG}/shop/step-upload.png` },
    { title: 'Pick a look and a model', body: 'Wear it yourself or pick one of our models. Every product comes out in your shop’s style.', image: `${IMG}/us/shop/looks/beige-wall.png` },
    { title: 'Get listing packs and videos', body: 'Each week we pick your new stock. You get up to 9 photos per product in TikTok’s upload order, plus a video cover. Our team sends your UGC videos each month.', image: `${IMG}/us/shop-dress-after.png` },
  ],
  marketplaces: [
    { label: 'Shop listing', format: 'square_1_1' as const, image: `${IMG}/us/shop/looks/clean-white.png` },
    { label: 'Video cover', format: 'story_9_16' as const, image: `${IMG}/us/shop/looks/street-urban.png` },
    { label: 'Instagram post', format: 'portrait_4_5' as const, image: `${IMG}/us/shop/looks/cafe-lifestyle.png` },
  ],
  faq: [
    { q: 'Can you bring in my TikTok Shop?', a: 'Yes. Paste your shop link and we bring in your products, prices and sales. You can also upload the product export from TikTok Seller Center. You must own or manage the shop.' },
    { q: 'How do weekly drops work?', a: 'Pick a day. Each week we find your new products and best sellers that still need photos, and email you a drop. You check it and create the photos in one click. Nothing is made until you say so.' },
    { q: 'What is a listing pack?', a: 'Up to 9 photos for one product, in the order TikTok Shop shows them, plus a 9:16 video cover and the description. Download it as one zip and upload.' },
    { q: 'Can’t I just use ChatGPT?', a: 'ChatGPT often changes the color, print or length of your product. That leads to returns. Next5 keeps your real product, uses the same models every time, writes the hook, description and hashtags for every photo, and our team makes your UGC videos.' },
    { q: 'What are UGC videos?', a: 'Short videos of your products for TikTok, Reels and Shorts, in the style shoppers film on their phones. Our team makes them for you each month: a hook, a short script and captions on screen. Starter gets 1 a month. Growth and Scale get 4.' },
    { q: 'Do I have to film anything?', a: 'No. Our team makes the videos from your products and sends them to you. You post them in your shop.' },
    { q: 'What is the Scroll-Stop Score?', a: 'Every photo gets a score from 0 to 100. AI checks six things that make shoppers stop, like a clear product, good light and how it looks as a small photo. You also get a tip, like which photo to use as your cover.' },
    { q: 'What is the Beat-your-feed promise?', a: 'Post 12 Next5 photos in 30 days. Then compare them with your last 12 posts in your own stats. If they did not do better, tell us in the app and your next month is free.' },
    { q: 'What product photos work best?', a: 'One item on a hanger or laid flat. Use a plain, light background and daylight. Add a close-up for prints, buttons or lace.' },
    { q: 'Can I wear the clothes in the photos?', a: 'Yes. Send two selfies and one full-body photo one time. Then every product can be worn by you.' },
    { q: 'Will the colors and prints match?', a: 'We tell the AI to keep the color, print, length and details the same. You see each new photo next to your product photo. If it does not match, redo it for free, two times.' },
    { q: 'What sizes do I get?', a: 'Square (1:1) for listings. Tall (9:16) for TikTok and Stories. 4:5 for Instagram. 3:4 for your website.' },
    { q: 'Can I sell on TikTok Shop with these photos?', a: 'Yes. The photo must match the real item. You must also add the AI label TikTok asks for.' },
    { q: 'How do I pay?', a: 'You pay up front for 1, 3 or 6 months. Buy more photos any time. Nothing renews on its own.' },
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
