/** Draft legal copy (pending review). Spec: 01-product-spec.md §5, phase-11-launch.md §11.1. */

import type { LegalSection } from '../../components/marketing/legal/LegalPage';

export const LEGAL_UPDATED = 'Sep 14, 2026';

export const TERMS: readonly LegalSection[] = [
  { heading: 'The service', body: ['Next5 Brand and Next5 Shop create AI-generated photos from reference photos you provide (your selfies, or photos of your products) or from Next5 Studio models. Photos are delivered in your online workspace.'] },
  { heading: 'Plans and photo credits', body: ['Plans are prepaid monthly or yearly and add a monthly allowance of photo credits on the same date each month. One credit creates one photo in one format; high-res photos use two credits.', 'Monthly plan credits expire at the end of each monthly cycle. Top-up credits expire 12 months after purchase. Nothing renews automatically — you choose whether to renew.'] },
  { heading: 'Redos and refunds', body: ['Every photo can be redone for free twice. Credits for photos we fail to create are returned automatically.', 'Payments are not refundable once credits have been added, except for payment errors such as a duplicate or incorrect transfer, which we correct on request.'] },
  { heading: 'Acceptable use', body: ['Only upload photos of yourself, or of people who have given you their written permission. Do not use Next5 to impersonate anyone, to create misleading claims (for example awards, sales or qualifications you don’t have), or to misrepresent products you sell.', 'You are responsible for labelling AI-generated images where platforms or laws require it.'] },
  { heading: 'Ownership', body: ['You own the photos you create with Next5 and may use them commercially, subject to these terms and the terms of our image-generation providers. Studio model likenesses may only be used to present your own products.'] },
  { heading: 'Liability', body: ['Next5 is provided as is. To the extent allowed by law, our total liability is limited to the amount you paid in the three months before a claim.'] },
];

export const PRIVACY: readonly LegalSection[] = [
  { heading: 'What we collect', body: ['Your email, name, business name and handle; the photos you upload (selfies, full-body photos, product photos); the photos we create; payment references and amounts; and basic technical data such as IP address for security and consent records.'] },
  { heading: 'Why we use it', body: ['To create and deliver your photos, run your account and plan, prevent abuse, send service emails (receipts, renewal reminders, photos ready) and improve quality — for example by reviewing photos you asked us to redo.'] },
  { heading: 'Who processes it', body: ['WaveSpeed (image generation), OpenAI (captions), Cloudflare R2 (storage), Railway (database), Vercel (hosting), Maileroo (email) and our payment provider. Each only receives what it needs for its task.'] },
  { heading: 'How long we keep it', body: ['Selfies and full-body photos: until you delete them. Product photos: 12 months after last use. Created photos: while your account is active and for 90 days after your plan ends.'] },
  { heading: 'Your choices', body: ['Delete your face data anytime in Settings → Privacy. Email us to receive a copy of your data or to delete your account; we respond within 7 days.'] },
];

export const AI_AND_FACE_DATA: readonly LegalSection[] = [
  { heading: 'How your face photos are used', body: ['Your selfies are sent to our image-generation provider only when you create photos, as the reference that keeps your likeness. They are never used to train Next5 models, never sold and never shared with other customers.'] },
  { heading: 'Consent', body: ['We ask for your explicit consent before you upload photos of yourself and record when you gave it. You can withdraw it by deleting your face data in Settings → Privacy; photos you already created stay in your library.'] },
  { heading: 'AI labels', body: ['Every photo carries an embedded “AI-generated” label (IPTC digital source type). You can also add a small visible AI tag. Vietnam’s AI Law requires AI images that depict real people to be identifiable as AI, and platforms such as TikTok and Meta ask you to disclose AI content when posting.'] },
  { heading: 'Studio models', body: ['Next5 Studio models are synthetic people created by Next5. They do not depict real individuals.'] },
];
