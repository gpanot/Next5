import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { disconnect, PROVIDERS } from '../../../../../src/server/social/connections';
import { redirectUriFor, signState } from '../../../../../src/server/social/links';
import { isSocialProvider } from '../../../../../src/server/social/types';
import { requireSlideshowWorkspace } from '../../../../../src/server/autoSlideshow/workspaces';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/integrations/[provider]'>;

/** An Auto Slideshow workspace when `workspaceId` is given (checked to be the user's), else the user's studio. */
const workspaceFor = (userId: string, workspaceId: unknown, product: unknown) =>
  typeof workspaceId === 'string' && workspaceId ? requireSlideshowWorkspace(userId, workspaceId) : requireWorkspace(userId, isProductLine(product) ? product : undefined);

const providerFrom = async (ctx: Ctx) => {
  const { provider } = await ctx.params;
  if (!isSocialProvider(provider)) throw new HttpError(404, 'unknown_provider', 'Unknown platform.');
  return provider;
};

/** POST { product } or { workspaceId, returnTo: 'slideshow' } — the platform's sign-in URL for this workspace. The browser goes there next. */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const provider = await providerFrom(ctx);
  if (!PROVIDERS[provider].configured()) throw new HttpError(503, 'not_configured', 'This platform is not available yet.');
  const body = await readJsonObject(req);
  const ws = await workspaceFor(session.userId, body.workspaceId, body.product);
  const state = signState({ workspaceId: ws.id, product: ws.product, provider, ...(body.returnTo === 'slideshow' ? { returnTo: 'slideshow' as const } : {}) });
  return NextResponse.json({ url: PROVIDERS[provider].authorizeUrl(state, redirectUriFor(provider)) });
});

/** DELETE ?product= or ?workspaceId= — forget the account. Posts already sent stay on the platform. */
export const DELETE = authedRoute<Ctx>(async (req, session, ctx) => {
  const provider = await providerFrom(ctx);
  const params = new URL(req.url).searchParams;
  const ws = await workspaceFor(session.userId, params.get('workspaceId'), params.get('product'));
  await disconnect(ws.id, provider);
  return NextResponse.json({ disconnected: true });
});
