import { HOME_FAQ } from '../../src/components/admin/autoSlideshow/workspace/homeFaqItems';
import { MIN_DEPOSIT_CENTS, PRICE_LABEL, shortMoney } from '../../src/components/admin/autoSlideshow/pricing/pricing';

export const dynamic = 'force-static';

/** /llms.txt (llmstxt.org): a plain Markdown summary of Next5 Auto Slideshow for AI tools. FAQ comes from the /slideshow page, so both stay in sync. */
export function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const faq = HOME_FAQ.map(({ q, a }) => `### ${q}\n\n${a}`).join('\n\n');
  const body = `# Next5 Auto Slideshow

> Auto Slideshow makes TikTok and Instagram photo slideshows from a business website, and posts them for you. Paste a website, and it writes a hook, 5 to 9 slides, a caption and hashtags, with fresh photos for the brand. Every slideshow copies a format that already pulls views on TikTok and Instagram. ${PRICE_LABEL} per slideshow, pay as you go, no subscription.

Auto Slideshow is part of Next5, a US-only service for small businesses such as realtors and TikTok Shop sellers.

## How it works

1. Paste your website on ${base}/slideshow.
2. Sign in with your email. The email link signs you up and logs you in.
3. Your first slideshows are ready in about 3 to 5 minutes.
4. You review and approve each post before it goes to TikTok or Instagram. TikTok policy asks for this.

## Pricing

- ${PRICE_LABEL} per slideshow, taken from a prepaid balance.
- ${shortMoney(MIN_DEPOSIT_CENTS)} minimum top-up. The top-up is balance, not a fee.
- No subscription, no contract. When the balance runs out, autopilot stops and nothing is charged.

## Pages

- [Auto Slideshow home](${base}/slideshow): paste a website and start.
- [Auto Slideshow pricing](${base}/slideshow/pricing): price calculator and pricing questions.
- [Terms](${base}/legal/terms)
- [Privacy](${base}/legal/privacy)

## FAQ

${faq}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
