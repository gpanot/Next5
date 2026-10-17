import type { BlitzPlatform } from '../../../../types/admin/blitzSchedule';
import type { LabClient } from '../../labClient';

const LABEL: Record<BlitzPlatform, string> = { tiktok: 'TikTok', youtube: 'YouTube' };

/** The workspace a lab client acts for; null where it names none (then connecting happens in Settings → Accounts). */
export const labWorkspaceOf = (client: LabClient): string | null => client.authHeaders()['X-Workspace-Id'] ?? null;

/**
 * Sends the browser to TikTok's or YouTube's sign-in, the same as Settings → Accounts. The platform sends it back to
 * this page once approved, with `resume` as its query (Post now uses it to open itself again).
 */
export async function startLabConnect(client: LabClient, provider: BlitzPlatform, resume?: string): Promise<void> {
  const headers = client.authHeaders();
  const res = await fetch(`/api/app/integrations/${provider}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId: headers['X-Workspace-Id'], returnTo: 'slideshow', returnPath: `${window.location.pathname}${resume ? `?${resume}` : ''}` }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!res.ok || !data.url) throw new Error(data.message ?? `Could not open ${LABEL[provider]}. Try again.`);
  window.location.href = data.url;
}
