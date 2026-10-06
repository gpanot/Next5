'use client';

import { useState } from 'react';
import { Dialog } from '../../../ui/Dialog';
import { LegalSections, type LegalSection } from '../../../marketing/legal/LegalPage';
import { LEGAL_UPDATED, PRIVACY, TERMS } from '../../../../content/business/legal';

type LegalDoc = { key: string; label: string; title: string; href: string; sections: readonly LegalSection[] };

const LEGAL_DOCS: readonly LegalDoc[] = [
  { key: 'terms', label: 'Terms', title: 'Terms of Service', href: '/legal/terms', sections: TERMS },
  { key: 'privacy', label: 'Privacy', title: 'Privacy Policy', href: '/legal/privacy', sections: PRIVACY },
];

/** Public Auto Slideshow footer: real links (crawlers and Google app review need them); a normal click opens the doc in a modal so users stay on /slideshow. */
export function PublicFooter() {
  const [openDoc, setOpenDoc] = useState<LegalDoc | null>(null);
  return (
    <footer className="border-t border-line px-4 py-6 md:px-8 dark:border-zinc-800">
      <nav aria-label="Legal" className="mx-auto flex max-w-6xl items-center justify-center gap-6 text-[13px] text-muted dark:text-zinc-400">
        {LEGAL_DOCS.map((doc) => (
          <a
            key={doc.key}
            href={doc.href}
            onClick={(event) => {
              event.preventDefault();
              setOpenDoc(doc);
            }}
            className="inline-flex min-h-11 items-center px-1 transition hover:text-ink dark:hover:text-zinc-100"
          >
            {doc.label}
          </a>
        ))}
      </nav>
      <Dialog open={openDoc !== null} onClose={() => setOpenDoc(null)} title={openDoc?.title} description={`Last updated ${LEGAL_UPDATED}`} className="max-w-2xl">
        <div className="-mx-6 -my-6 flex max-h-[70dvh] flex-col gap-6 overflow-y-auto overscroll-contain px-6 py-6 text-left">
          {openDoc && <LegalSections sections={openDoc.sections} />}
        </div>
      </Dialog>
    </footer>
  );
}
