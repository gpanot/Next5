import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { setProductsArchived } from '../../../../../src/server/products/products';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const MAX_IDS = 200;

/** POST /api/app/products/archive — { productIds: string[], archived: boolean }. Archives or brings products back. */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  const productIds = Array.isArray(body.productIds) ? [...new Set(body.productIds.map(String))] : [];
  if (productIds.length === 0) throw new HttpError(400, 'no_products', 'Choose at least one product.');
  if (productIds.length > MAX_IDS) throw new HttpError(400, 'too_many', `Archive up to ${MAX_IDS} products at a time.`);
  const ws = await requireWorkspace(session.userId, 'shop');
  return NextResponse.json({ changed: await setProductsArchived(ws.id, productIds, body.archived !== false) });
});
