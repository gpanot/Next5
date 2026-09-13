import type { Metadata } from 'next';
import { LegalPage } from '../../../../src/components/marketing/legal/LegalPage';
import { LEGAL_UPDATED, TERMS } from '../../../../src/content/business/legal';

export const metadata: Metadata = { title: 'Terms of Service — Next5' };

export default function Page() {
  return <LegalPage title="Terms of Service" updated={LEGAL_UPDATED} intro="These terms apply to Next5 Brand and Next5 Shop." sections={TERMS} />;
}
