import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import { HttpError } from '../../../../../src/server/http';
import { createProduct, parseProductFields, toProductDto, type ProductFields } from '../../../../../src/server/products/products';
import { readForm } from '../../../../../src/server/storage/images';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const MAX_BULK = 20;

type RowError = { index: number; field?: string; message: string };

/**
 * POST /api/app/products/bulk — multipart: fronts[] (files, same order as rows) + rows (JSON array of fields).
 * All-or-nothing validation: nothing is created if any row is invalid.
 */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`products:${session.userId}`, 20, 86400);
  const ws = await requireWorkspace(session.userId, 'shop');
  const form = await readForm(req);
  const fronts = form.getAll('fronts').filter((f): f is File => f instanceof File);
  let rows: unknown;
  try {
    rows = JSON.parse(String(form.get('rows') ?? '[]'));
  } catch {
    throw new HttpError(400, 'invalid_rows', 'Product details could not be read.');
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length !== fronts.length) throw new HttpError(400, 'invalid_rows', 'Each product needs a photo and details.');
  if (rows.length > MAX_BULK) throw new HttpError(400, 'too_many', `Add up to ${MAX_BULK} products at a time.`);

  const errors: RowError[] = [];
  const parsed: ProductFields[] = [];
  rows.forEach((row, index) => {
    try {
      parsed.push(parseProductFields((row ?? {}) as Record<string, unknown>, `product ${index + 1}`));
    } catch (err) {
      const e = err as HttpError;
      errors.push({ index, field: typeof e.details?.field === 'string' ? e.details.field : undefined, message: e.message });
    }
  });
  if (errors.length > 0) throw new HttpError(400, 'invalid_rows', 'Some products need more details.', { errors });

  const created = [];
  for (const [index, fields] of parsed.entries()) {
    const front = fronts[index];
    if (front) created.push(await createProduct(ws, fields, { front }));
  }
  return NextResponse.json({ products: await Promise.all(created.map(toProductDto)) }, { status: 201 });
});
