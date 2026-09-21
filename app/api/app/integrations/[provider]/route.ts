import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { disconnect, PROVIDERS } from '../../../../../src/server/social/connections';
import { redirectUriFor, signState } from '../../../../../src/server/social/links';
import { isSocialProvider } from '../../../../../src/server/social/types';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/integrations/[provider]'>;

const providerFrom = async (ctx: Ctx) => {
  const { provider } = await ctx.params;
  if (!isSocialProvider(provider)) throw new HttpError(404, 'unknown_provider', 'Unknown platform.');
  return provider;
};

/** POST { product } — the platform's sign-in URL for this workspace. The browser goes there next. */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const provider = await providerFrom(ctx);
  if (!PROVIDERS[provider].configured()) throw new HttpError(503, 'not_configured', 'This platform is not available yet.');
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, isProductLine(body.product) ? body.product : undefined);
  const state = signState({ workspaceId: ws.id, product: ws.product, provider });
  return NextResponse.json({ url: PROVIDERS[provider].authorizeUrl(state, redirectUriFor(provider)) });
});

/** DELETE ?product= — forget the account. Posts already sent stay on the platform. */
export const DELETE = authedRoute<Ctx>(async (req, session, ctx) => {
  const provider = await providerFrom(ctx);
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  await disconnect(ws.id, provider);
  return NextResponse.json({ disconnected: true });
});
