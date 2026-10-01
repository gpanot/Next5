import { NextResponse } from 'next/server';
import type { SetTemplateConfig } from '../../../../src/content/business/catalog/types';
import { scenePoseImage } from '../../../../src/content/business/catalog/shopScenes';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { isProductLine, STUDIO_PRODUCTS } from '../../../../src/server/workspaces/workspaces';
import type { SetTemplateDto } from '../../../../src/types/business/catalog';

/** GET /api/app/templates?product=brand|shop */
export const GET = authedRoute(async (req) => {
  const product = new URL(req.url).searchParams.get('product');
  const rows = await prisma.setTemplate.findMany({
    where: { isActive: true, product: isProductLine(product) ? product : { in: STUDIO_PRODUCTS } },
    orderBy: [{ product: 'asc' }, { sortOrder: 'asc' }],
  });
  const templates: SetTemplateDto[] = rows.flatMap((t) => {
    if (!isProductLine(t.product)) return [];
    const config = t.config as unknown as SetTemplateConfig;
    return {
      id: t.id, product: t.product, name: t.name, description: t.description, coverImage: t.coverImage,
      locations: config.locations.map((l) => ({ id: l.id, label: l.label })), defaults: config.defaults,
      poses: (config.poses ?? []).map((p) => ({ id: p.id, label: p.label, image: scenePoseImage(t.id, p.id) })),
    };
  });
  return NextResponse.json({ templates });
});
