/**
 * Internal-link extraction from raw homepage HTML.
 * Real case: avenue2.au lists its niches only in an "Industries" dropdown
 * (/industries/mechanic, /industries/electrician), which Exa's text extraction drops.
 */
import { describe, expect, it } from 'vitest';
import { extractSiteLinks, linksFromHrefs } from '../../../src/server/studio/siteLinks';

const HTML = `
<nav>
  <a href="/">Avenue</a>
  <a href="/#features">Features</a>
  <a class="menu" href="/industries/mechanic"><span>Mechanics</span></a>
  <a href="/industries/electrician/">Electricians</a>
  <a href="https://www.avenue2.au/pricing">Pricing</a>
  <a href="https://avenue2.au/about-us">About &amp; team</a>
</nav>
<a href="/industries/mechanic">Mechanics</a>
<a href="https://twitter.com/avenue">Twitter</a>
<a href="mailto:hi@avenue2.au">Email</a>
<a href="/privacy">Privacy</a>
<a href="/brochure.pdf">Brochure</a>
<a href="/login">Log in</a>
<a href="/contact" aria-label="Contact us"><svg></svg></a>
<a href="/empty"><img src="x.png"></a>
`;

describe('extractSiteLinks', () => {
  const links = extractSiteLinks(HTML, 'https://www.avenue2.au/');

  it('keeps the industry menu links with their labels', () => {
    expect(links).toContainEqual({ url: 'https://www.avenue2.au/industries/mechanic', label: 'Mechanics' });
    expect(links).toContainEqual({ url: 'https://www.avenue2.au/industries/electrician', label: 'Electricians' });
  });

  it('treats www and bare host as the same site and decodes entities', () => {
    expect(links).toContainEqual({ url: 'https://avenue2.au/about-us', label: 'About & team' });
  });

  it('drops homepage, anchors, external, mailto, legal, files, login, and duplicate paths', () => {
    const paths = links.map((l) => new URL(l.url).pathname);
    expect(paths).not.toContain('/');
    expect(paths).not.toContain('/privacy');
    expect(paths).not.toContain('/brochure.pdf');
    expect(paths).not.toContain('/login');
    expect(links.some((l) => l.url.includes('twitter.com'))).toBe(false);
    expect(paths.filter((p) => p === '/industries/mechanic')).toHaveLength(1);
  });

  it('uses aria-label for icon-only links and skips links with no label', () => {
    expect(links).toContainEqual({ url: 'https://www.avenue2.au/contact', label: 'Contact us' });
    expect(links.some((l) => l.url.endsWith('/empty'))).toBe(false);
  });

  it('returns nothing for a bad base URL', () => {
    expect(extractSiteLinks(HTML, 'not a url')).toEqual([]);
  });
});

describe('linksFromHrefs (Exa fallback when the site blocks our fetch)', () => {
  it('turns bare hrefs into labelled links and drops tel, cdn-cgi and duplicates', () => {
    const links = linksFromHrefs(
      ['tel:(816) 252-1366', '/services', '/services', '/services/brake-repair-and-service', '/cdn-cgi/l/email-protection', '/bad%E0%A4%A'],
      'https://www.kcautosolutions.com/',
    );
    expect(links).toEqual([
      { url: 'https://www.kcautosolutions.com/services', label: 'services' },
      { url: 'https://www.kcautosolutions.com/services/brake-repair-and-service', label: 'brake repair and service' },
      { url: 'https://www.kcautosolutions.com/bad%E0%A4%A', label: 'bad%E0%A4%A' },
    ]);
  });
});
