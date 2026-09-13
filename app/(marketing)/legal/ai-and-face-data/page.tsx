import type { Metadata } from 'next';
import { LegalPage } from '../../../../src/components/marketing/legal/LegalPage';
import { LEGAL_UPDATED, AI_AND_FACE_DATA } from '../../../../src/content/business/legal';

export const metadata: Metadata = { title: 'AI & Face Data — Next5' };

export default function Page() {
  return <LegalPage title="AI & Face Data" updated={LEGAL_UPDATED} intro="Plain-language answers about how we use your face and label AI photos." sections={AI_AND_FACE_DATA} />;
}
