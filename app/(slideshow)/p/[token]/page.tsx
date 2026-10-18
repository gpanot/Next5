'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { UserGate } from '../../../../src/components/admin/autoSlideshow/UserGate';
import { ClaimRunner } from '../../../../src/components/prospect/ClaimRunner';
import { ProspectPage } from '../../../../src/components/prospect/ProspectPage';

/** A Prospect Pack's review link (sent in a DM). With ?claim=1: sign in (the email link comes back here), then take the posts. */
export default function ProspectReviewPage() {
  const { token } = useParams<{ token: string }>();
  const claiming = useSearchParams().get('claim') === '1';
  if (!claiming) return <ProspectPage shareToken={token} />;
  return (
    <UserGate returnTo={`/p/${token}?claim=1`} title="Log in to get your posts">
      {(session) => <ClaimRunner shareToken={token} session={session} />}
    </UserGate>
  );
}
