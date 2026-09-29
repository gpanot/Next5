/** Draft legal copy (pending review). Spec: 01-product-spec.md §5, phase-11-launch.md §11.1. */

import type { LegalSection } from '../../components/marketing/legal/LegalPage';

export const LEGAL_UPDATED = 'Sep 29, 2026';

export const TERMS: readonly LegalSection[] = [
  { heading: 'The service', body: ['Next5 Brand and Next5 Shop create AI-generated photos from reference photos you provide (your selfies, or photos of your products) or from Next5 Studio models. Photos are delivered in your online workspace.', 'Next5 can also turn the public text of your website into photo slideshows for TikTok, with AI-generated background photos, and post them to your connected TikTok account.'] },
  {
    heading: 'Connected accounts and posting',
    body: [
      'You can connect your TikTok or Instagram account in Settings → Integrations. Next5 only posts content that you (or someone you authorised in your workspace) reviewed and approved, with the privacy setting you chose, at the time you chose. You can cancel a scheduled post before it is sent, and disconnect your account at any time.',
      'When you post through Next5 you must follow the platform’s own rules, including TikTok’s Terms of Service, Community Guidelines, Music Usage Confirmation and, for paid partnerships, Branded Content Policy. You are responsible for the content you approve and for disclosing commercial content. The platform may delay, limit or reject posts; Next5 does not control that.',
    ],
  },
  { heading: 'Plans and photo credits', body: ['Plans are prepaid monthly or yearly and add a monthly allowance of photo credits on the same date each month. One credit creates one photo in one format; high-res photos use two credits.', 'Monthly plan credits expire at the end of each monthly cycle. Top-up credits expire 12 months after purchase. Nothing renews automatically — you choose whether to renew.'] },
  { heading: 'Redos and refunds', body: ['Every photo can be redone for free twice. Credits for photos we fail to create are returned automatically.', 'Payments are not refundable once credits have been added, except for payment errors such as a duplicate or incorrect transfer, which we correct on request.'] },
  { heading: 'Acceptable use', body: ['Only upload photos of yourself, or of people who have given you their written permission. Do not use Next5 to impersonate anyone, to create misleading claims (for example awards, sales or qualifications you don’t have), or to misrepresent products you sell.', 'You are responsible for labelling AI-generated images where platforms or laws require it.'] },
  { heading: 'Ownership', body: ['You own the photos you create with Next5 and may use them commercially, subject to these terms and the terms of our image-generation providers. Studio model likenesses may only be used to present your own products.'] },
  { heading: 'Liability', body: ['Next5 is provided as is. To the extent allowed by law, our total liability is limited to the amount you paid in the three months before a claim.'] },
];

export const PRIVACY: readonly LegalSection[] = [
  { heading: 'What we collect', body: ['Your email, name, business name and handle; the photos you upload (selfies, full-body photos, product photos); the photos we create; payment references and amounts; and basic technical data such as IP address for security and consent records.'] },
  { heading: 'Why we use it', body: ['To create and deliver your photos, run your account and plan, prevent abuse, send service emails (receipts, renewal reminders, photos ready) and improve quality — for example by reviewing photos you asked us to redo.'] },
  {
    heading: 'Connected TikTok and Instagram accounts',
    body: [
      'When you connect TikTok, TikTok shares with us, with your permission: your account’s basic profile (a user ID, display name, username and profile picture) and an access token that lets Next5 publish posts you approve (scopes user.info.basic and video.publish). Before each post we also ask TikTok which privacy options and comment settings your account allows, so we can show them to you.',
      'We use this only to show which account will post, to publish the posts you approved, and to check whether each post went live. We do not read your videos, followers, messages or analytics, we never post anything you did not approve, and we never sell or share this data. Access tokens are stored encrypted.',
      'We keep your TikTok profile details and tokens until you disconnect. Disconnect in Settings → Integrations, or remove Next5 in the TikTok app (Settings and privacy → Security → Manage app permissions); we then delete the tokens. We keep a record of posts already sent (time, status and link) with your account history.',
    ],
  },
  { heading: 'Who processes it', body: ['WaveSpeed and reAPI (image generation), OpenAI (captions and slideshow text), Exa (reading the public pages of your website), Cloudflare R2 (storage), Railway (database), Vercel (hosting), Maileroo (email), TikTok and Meta (only when you connect and post) and our payment provider. Each only receives what it needs for its task.'] },
  { heading: 'How long we keep it', body: ['Selfies and full-body photos: until you delete them. Product photos: 12 months after last use. Created photos and slideshows: while your account is active and for 90 days after your plan ends. TikTok and Instagram tokens: until you disconnect.'] },
  { heading: 'Your choices', body: ['Delete your face data anytime in Settings → Privacy. Disconnect TikTok or Instagram anytime in Settings → Integrations. Email us to receive a copy of your data or to delete your account; we respond within 7 days.'] },
];

export const AI_AND_FACE_DATA: readonly LegalSection[] = [
  { heading: 'How your face photos are used', body: ['Your selfies are sent to our image-generation provider only when you create photos, as the reference that keeps your likeness. They are never used to train Next5 models, never sold and never shared with other customers.'] },
  { heading: 'Consent', body: ['We ask for your explicit consent before you upload photos of yourself and record when you gave it. You can withdraw it by deleting your face data in Settings → Privacy; photos you already created stay in your library.'] },
  { heading: 'AI labels', body: ['Every photo carries an embedded “AI-generated” label (IPTC digital source type). You can also add a small visible AI tag. Platforms such as TikTok and Meta ask you to label realistic AI-generated content when you post it, and U.S. rules on advertising (including FTC guidance) apply to AI images used to promote a business.'] },
  { heading: 'Studio models', body: ['Next5 Studio models are synthetic people created by Next5. They do not depict real individuals.'] },
];
