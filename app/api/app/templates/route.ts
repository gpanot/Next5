import { NextResponse } from 'next/server';
import type { SetTemplateConfig } from '../../../../src/content/business/catalog/types';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { isProductLine } from '../../../../src/server/workspaces/workspaces';
import type { SetTemplateDto } from '../../../../src/types/business/catalog';

/** GET /api/app/templates?product=brand|shop */
export const GET = authedRoute(async (req) => {
  const product = new URL(req.url).searchParams.get('product');
  const rows = await prisma.setTemplate.findMany({
    where: { isActive: true, ...(isProductLine(product) ? { product } : {}) },
    orderBy: [{ product: 'asc' }, { sortOrder: 'asc' }],
  });
  const templates: SetTemplateDto[] = rows.map((t) => {
    const config = t.config as unknown as SetTemplateConfig;
    return {
      id: t.id, product: t.product, name: t.name, description: t.description, coverImage: t.coverImage,
      locations: config.locations.map((l) => ({ id: l.id, label: l.label })), defaults: config.defaults,
    };
  });
  return NextResponse.json({ templates });
});
