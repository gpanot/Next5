'use client';

import { UserGate } from '../../../../src/components/admin/autoSlideshow/UserGate';
import { ConnectClaude } from '../../../../src/components/admin/autoSlideshow/mcp/ConnectClaude';

/**
 * /oauth/authorize — Claude's sign-in screen for the Next5 connector (OAuth authorization endpoint). Signed out: the
 * email link comes back here with the same query. Signed in: pick a workspace and allow, or cancel.
 */
export default function AuthorizePage() {
  const returnTo = typeof window === 'undefined' ? undefined : `${window.location.pathname}${window.location.search}`;
  return (
    <UserGate title="Log in to connect Claude" returnTo={returnTo}>
      {(token) => <ConnectClaude token={token} />}
    </UserGate>
  );
}
