import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError } from '../../../../../src/server/http';
import { parseProductFields, toProductDto } from '../../../../../src/server/products/products';
import { normalizeUpload, readForm } from '../../../../../src/server/storage/images';
import { productKey } from '../../../../../src/server/storage/keys';
import { putObject } from '../../../../../src/server/storage/objectStore';

type Ctx = RouteContext<'/api/app/products/[productId]'>;

const owned = async (userId: string, productId: string) => {
  const product = await prisma.product.findFirst({ where: { id: productId, archivedAt: null, workspace: { ownerUserId: userId } } });
  if (!product) throw new HttpError(404, 'product_not_found', 'Product not found.');
  return product;
};

/** PATCH — multipart: fields (name, category, colorName, sku, fit, notes) and optional back / detail / front files. */
export const PATCH = authedRoute<Ctx>(async (req, session, ctx) => {
  const { productId } = await ctx.params;
  const product = await owned(session.userId, productId);
  const form = await readForm(req);
  const fields = parseProductFields({ ...product, ...Object.fromEntries(form.entries()) });

  const keys: { frontR2Key?: string; backR2Key?: string; detailR2Key?: string } = {};
  for (const side of ['front', 'back', 'detail'] as const) {
    const file = form.get(side);
    if (!(file instanceof File)) continue;
    const key = productKey(product.workspaceId, product.id, side);
    await putObject(key, await normalizeUpload(file, `${side} photo`));
    keys[`${side}R2Key`] = key;
  }
  const updated = await prisma.product.update({ where: { id: product.id }, data: { ...fields, ...keys } });
  return NextResponse.json({ product: await toProductDto(updated) });
});

/** DELETE — archives the product (existing photos stay in the library). */
export const DELETE = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { productId } = await ctx.params;
  const product = await owned(session.userId, productId);
  await prisma.product.update({ where: { id: product.id }, data: { archivedAt: new Date() } });
  return NextResponse.json({ archived: true });
});
