'use client';

/** Campaign Studio v1 — wired to the admin API. */
import { CampaignStudioEditor } from '../../labs/studio/CampaignStudioEditor';

export function CampaignStudioTab({ token: _token }: { token: string }) {
  // token is in localStorage (set by AdminPage); CampaignStudioEditor reads it directly.
  // The prop is accepted so the tab signature matches all other admin tabs.
  return <CampaignStudioEditor />;
}
