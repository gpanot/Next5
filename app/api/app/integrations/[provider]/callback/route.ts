import { NextResponse } from 'next/server';
import { businessRoute } from '../../../../../../src/server/api';
import { HttpError } from '../../../../../../src/server/http';
import { PROVIDERS, saveConnection } from '../../../../../../src/server/social/connections';
import { appBaseUrl, redirectUriFor, verifyState } from '../../../../../../src/server/social/links';
import { isSocialProvider } from '../../../../../../src/server/social/types';

type Ctx = RouteContext<'/api/app/integrations/[provider]/callback'>;

const back = (params: Record<string, string>, admin = false) =>
  NextResponse.redirect(admin
    ? `${appBaseUrl()}/admin/auto-slideshow?${new URLSearchParams(params).toString()}`
    : `${appBaseUrl()}/app/settings?${new URLSearchParams(params).toString()}#integrations`);

/** Whether the flow started in the admin, read without verifying (verification happens below). */
const fromAdmin = (state: string | null): boolean => {
  try {
    return JSON.parse(Buffer.from((state ?? '').split('.')[1] ?? '', 'base64url').toString('utf8')).returnTo === 'admin';
  } catch {
    return false;
  }
};

/**
 * GET — the platform sends the browser back here with `code` and our signed `state`.
 * No session header on a redirect, so the workspace comes from the state. Lands back on Settings, or on the admin
 * Auto Slideshow page when an admin started the connection.
 */
export const GET = businessRoute<Ctx>(async (req, ctx) => {
  const { provider } = await ctx.params;
  if (!isSocialProvider(provider)) throw new HttpError(404, 'unknown_provider', 'Unknown platform.');
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const admin = fromAdmin(url.searchParams.get('state'));
  if (!code) return back({ integration_error: url.searchParams.get('error_description') ?? 'You did not allow the connection.' }, admin);
  try {
    const { workspaceId, returnTo } = verifyState(url.searchParams.get('state') ?? '', provider);
    await saveConnection(workspaceId, provider, await PROVIDERS[provider].exchangeCode(code, redirectUriFor(provider)));
    return back({ connected: provider }, returnTo === 'admin');
  } catch (err) {
    return back({ integration_error: err instanceof HttpError ? err.message : 'We could not connect that account. Try again.' }, admin);
  }
});
