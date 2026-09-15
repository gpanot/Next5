'use client';

import { LegacyRedirect } from '../../src/components/app/shell/LegacyRedirect';

/** /app → the last-used studio (or the only one the user has). */
export default function AppIndexPage() {
  return <LegacyRedirect />;
}
