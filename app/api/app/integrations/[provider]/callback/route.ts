import { NextResponse } from 'next/server';
import { businessRoute } from '../../../../../../src/server/api';
import { HttpError } from '../../../../../../src/server/http';
import { PROVIDERS, saveConnection } from '../../../../../../src/server/social/connections';
import { appBaseUrl, redirectUriFor, verifyState, type ReturnTo } from '../../../../../../src/server/social/links';
import { isSocialProvider } from '../../../../../../src/server/social/types';

type Ctx = RouteContext<'/api/app/integrations/[provider]/callback'>;

type Origin = { returnTo: ReturnTo; workspaceId: string | null };

/** The page the flow started on; a user's Auto Slideshow lands back in the workspace that connected. */
const pageFor = ({ returnTo, workspaceId }: Origin): string =>
  returnTo === 'admin' ? '/admin/auto-slideshow' : workspaceId ? `/slideshow/${workspaceId}` : '/slideshow/login';

const back = (params: Record<string, string>, origin?: Origin) =>
  NextResponse.redirect(origin
    ? `${appBaseUrl()}${pageFor(origin)}?${new URLSearchParams(params).toString()}`
    : `${appBaseUrl()}/app/settings?${new URLSearchParams(params).toString()}#integrations`);

/** Where the flow started, read without verifying (verification happens below; this only picks the page to land on). */
const startedFrom = (state: string | null): Origin | undefined => {
  try {
    const payload = JSON.parse(Buffer.from((state ?? '').split('.')[1] ?? '', 'base64url').toString('utf8')) as { returnTo?: unknown; workspaceId?: unknown };
    if (payload.returnTo !== 'admin' && payload.returnTo !== 'slideshow') return undefined;
    const id = typeof payload.workspaceId === 'string' && /^[a-z0-9]+$/i.test(payload.workspaceId) ? payload.workspaceId : null;
    return { returnTo: payload.returnTo, workspaceId: id };
  } catch {
    return undefined;
  }
};

/**
 * GET — the platform sends the browser back here with `code` and our signed `state`.
 * No session header on a redirect, so the workspace comes from the state. Lands back on Settings, or on the Auto
 * Slideshow page (admin or user) that started the connection.
 */
export const GET = businessRoute<Ctx>(async (req, ctx) => {
  const { provider } = await ctx.params;
  if (!isSocialProvider(provider)) throw new HttpError(404, 'unknown_provider', 'Unknown platform.');
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const origin = startedFrom(url.searchParams.get('state'));
  if (!code) return back({ integration_error: url.searchParams.get('error_description') ?? 'You did not allow the connection.' }, origin);
  try {
    const { workspaceId, returnTo } = verifyState(url.searchParams.get('state') ?? '', provider);
    await saveConnection(workspaceId, provider, await PROVIDERS[provider].exchangeCode(code, redirectUriFor(provider)));
    return back({ connected: provider }, returnTo ? { returnTo, workspaceId } : undefined);
  } catch (err) {
    return back({ integration_error: err instanceof HttpError ? err.message : 'We could not connect that account. Try again.' }, origin);
  }
});
