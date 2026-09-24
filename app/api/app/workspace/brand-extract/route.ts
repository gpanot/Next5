import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';
import type { ProductLineDto } from '../../../../../src/types/business/me';
import type { BrandExtractData } from '../../../../../src/types/business/me';

const isProduct = (v: unknown): v is ProductLineDto => v === 'brand' || v === 'shop';

const EDITABLE_FIELDS = [
  'coreIdentity', 'productOffering', 'uniqueBenefits', 'problemSolution',
  'mission', 'differentiation', 'ownedSpace',
  'customerSegments', 'toneDos', 'toneDonts', 'competitors',
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];
const isEditable = (k: string): k is EditableField => EDITABLE_FIELDS.includes(k as EditableField);

/**
 * PATCH /api/app/workspace/brand-extract
 * { product, ...partialBrandExtractData }
 *
 * Merges the provided fields into workspace.brandExtract. Only the keys sent in the body
 * are updated — all other fields in the stored JSON are left intact. Safe to call for
 * individual-field inline edits (coreIdentity, toneDos, competitors, etc.).
 */
export const PATCH = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProduct(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');

  const ws = await requireWorkspace(session.userId, body.product);

  // Build the partial patch — only accept known fields from the request body.
  const patch: Partial<BrandExtractData> = {};
  for (const key of Object.keys(body)) {
    if (isEditable(key)) {
      (patch as Record<string, unknown>)[key] = body[key];
    }
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, 'no_changes', 'No editable brand-extract fields in request.');
  }

  // Merge patch into existing JSON (or start fresh if null).
  const existing = (ws.brandExtract ?? {}) as BrandExtractData;
  const merged: BrandExtractData = { ...existing, ...patch };

  await prisma.workspace.update({
    where: { id: ws.id },
    data: { brandExtract: merged },
  });

  return NextResponse.json(merged);
});
