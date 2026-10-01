import { HOME_FAQ } from './homeFaqItems';

/** FAQPage structured data, so search engines and AI tools can read the answers. */
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
}).replace(/</g, '\\u003c');

/** FAQ on the /slideshow home. Native <details> so it works without JS and with the keyboard. */
export function HomeFaq() {
  return (
    <section aria-labelledby="slideshow-faq" className="relative mx-auto w-full max-w-2xl px-1 pt-8 pb-16 text-left md:pt-12 md:pb-24">
      <h2 id="slideshow-faq" className="text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl dark:text-zinc-100">Questions</h2>
      <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {HOME_FAQ.map(({ q, a }) => (
          <details key={q} className="group p-4 md:p-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink transition-colors hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400">
              {q}
              <span aria-hidden className="text-xl text-muted transition-transform duration-200 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted dark:text-zinc-400">{a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
    </section>
  );
}
