import { NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { HttpError } from '../../../../src/server/http';
import { createProduct, parseProductFields, toProductDto } from '../../../../src/server/products/products';
import { readForm } from '../../../../src/server/storage/images';
import { requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/products?search=&category=&status=unused|used&cursor= (40 per page) */
export const GET = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'shop');
  const params = new URL(req.url).searchParams;
  const search = params.get('search')?.trim();
  const category = params.get('category');
  const status = params.get('status');
  const cursor = params.get('cursor');
  const products = await prisma.product.findMany({
    where: {
      workspaceId: ws.id,
      archivedAt: null,
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(category ? { category } : {}),
      ...(status === 'unused' ? { lastUsedAt: null } : status === 'used' ? { lastUsedAt: { not: null } } : {}),
    },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
    take: 41,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = products.slice(0, 40);
  return NextResponse.json({ products: await Promise.all(page.map(toProductDto)), nextCursor: products.length > 40 ? page[page.length - 1]?.id ?? null : null });
});

/** POST /api/app/products — multipart: name, category, colorName?, sku?, fit?, notes?, front (file), back?, detail? */
export const POST = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'shop');
  const form = await readForm(req);
  const front = form.get('front');
  if (!(front instanceof File)) throw new HttpError(400, 'front_required', 'Add a front photo of the product.', { field: 'front' });
  const back = form.get('back');
  const detail = form.get('detail');
  const fields = parseProductFields(Object.fromEntries(form.entries()));
  const product = await createProduct(ws, fields, { front, back: back instanceof File ? back : null, detail: detail instanceof File ? detail : null });
  return NextResponse.json({ product: await toProductDto(product) }, { status: 201 });
});
