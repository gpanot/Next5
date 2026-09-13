import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { toItemDto } from '../../../../src/server/generation/dto';
import { listLibrary } from '../../../../src/server/generation/library';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/library?product=&setId=&themeId=&productId=&format=&favorite=1&cursor= */
export const GET = authedRoute(async (req, session) => {
  const p = new URL(req.url).searchParams;
  const product = p.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  const { items, nextCursor } = await listLibrary({
    workspaceId: ws.id, setId: p.get('setId'), themeId: p.get('themeId'), productId: p.get('productId'),
    format: p.get('format'), favorite: p.get('favorite') === '1', cursor: p.get('cursor'),
  });
  const dtos = await Promise.all(items.map(async (item) => ({ ...(await toItemDto(item)), batchId: item.batch.id, batchName: item.batch.name })));
  return NextResponse.json({ items: dtos, nextCursor });
});
