import { NextResponse } from 'next/server';
import { businessRoute } from '../../../../../../src/server/api';
import { HttpError } from '../../../../../../src/server/http';
import { PROVIDERS, saveConnection } from '../../../../../../src/server/social/connections';
import { appBaseUrl, redirectUriFor, safeOrigin, safeReturnPath, verifyState, type ReturnTo } from '../../../../../../src/server/social/links';
import { isSocialProvider } from '../../../../../../src/server/social/types';

type Ctx = RouteContext<'/api/app/integrations/[provider]/callback'>;

/** Where the flow started: the page (admin or a user's workspace) and the site (this one, or a local dev server). */
type Origin = { returnTo?: ReturnTo; workspaceId: string | null; returnPath?: string; site: string };

/** The page the flow started on; a user's Auto Slideshow lands back on the workspace page that connected. */
const pageFor = ({ returnTo, workspaceId, returnPath }: Origin): string =>
  returnTo === 'admin' ? '/admin/auto-slideshow' : returnTo === 'slideshow' ? (workspaceId ? returnPath ?? `/slideshow/${workspaceId}` : '/slideshow/login') : '/app/settings';

const back = (params: Record<string, string>, origin?: Origin) => {
  const site = origin?.site ?? appBaseUrl();
  const query = new URLSearchParams(params).toString();
  if (!origin?.returnTo) return NextResponse.redirect(`${site}/app/settings?${query}#integrations`);
  const page = pageFor(origin);
  return NextResponse.redirect(`${site}${page}${page.includes('?') ? '&' : '?'}${query}`);
};

/** Where the flow started, read without verifying (verification happens below; this only picks the page to land on). */
const startedFrom = (state: string | null): Origin | undefined => {
  try {
    const payload = JSON.parse(Buffer.from((state ?? '').split('.')[1] ?? '', 'base64url').toString('utf8')) as { returnTo?: unknown; workspaceId?: unknown; returnPath?: unknown; origin?: unknown };
    const returnTo = payload.returnTo === 'admin' || payload.returnTo === 'slideshow' ? payload.returnTo : undefined;
    const id = typeof payload.workspaceId === 'string' && /^[a-z0-9]+$/i.test(payload.workspaceId) ? payload.workspaceId : null;
    // Only this site or localhost: the state is not verified yet here, so it must not send the browser anywhere else.
    // The path is checked again here: only this workspace's own pages.
    return { returnTo, workspaceId: id, returnPath: id ? safeReturnPath(payload.returnPath, id) : undefined, site: safeOrigin(payload.origin) ?? appBaseUrl() };
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
  const q = url.searchParams;
  console.info(`[social:callback] ${provider}`, { hasCode: Boolean(code), error: q.get('error'), error_reason: q.get('error_reason'), error_description: q.get('error_description'), returnTo: origin?.returnTo, site: origin?.site });
  if (!code) return back({ integration_error: url.searchParams.get('error_description') ?? 'You did not allow the connection.' }, origin);
  try {
    const { workspaceId } = verifyState(url.searchParams.get('state') ?? '', provider);
    await saveConnection(workspaceId, provider, await PROVIDERS[provider].exchangeCode(code, redirectUriFor(provider)));
    return back({ connected: provider }, origin);
  } catch (err) {
    console.error(`[social:callback] ${provider} failed:`, err instanceof Error ? err.message : err);
    return back({ integration_error: err instanceof HttpError ? err.message : 'We could not connect that account. Try again.' }, origin);
  }
});
