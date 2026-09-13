import type { Metadata } from 'next';
import { LegalPage } from '../../../../src/components/marketing/legal/LegalPage';
import { LEGAL_UPDATED, PRIVACY } from '../../../../src/content/business/legal';

export const metadata: Metadata = { title: 'Privacy Policy — Next5' };

export default function Page() {
  return <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED} intro="How Next5 handles your personal data and photos." sections={PRIVACY} />;
}
