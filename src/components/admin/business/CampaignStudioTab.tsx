'use client';

/** Campaign Studio v1 — wired to the admin API. */
import { CampaignStudioEditor } from '../../labs/studio/CampaignStudioEditor';

export function CampaignStudioTab({ token }: { token: string }) {
  return <CampaignStudioEditor token={token} />;
}
