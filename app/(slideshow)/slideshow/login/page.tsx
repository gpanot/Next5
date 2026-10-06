'use client';

import { UserGate } from '../../../../src/components/admin/autoSlideshow/UserGate';
import { WorkspaceLanding } from '../../../../src/components/admin/autoSlideshow/workspace/WorkspaceLanding';

/** Sign in (the email link lands here), then into the last workspace, or "Add your website" for a first one. */
export default function SlideshowLoginPage() {
  return <UserGate>{(token) => <WorkspaceLanding token={token} />}</UserGate>;
}
