// server-only — never import from a 'use client' file.

import type { ShopConnection } from '@prisma/client';
import type { ShopConnectionDto } from '../../types/business/shop';
import { isShopImportMock } from './apify';

export const toConnectionDto = (c: ShopConnection | null): ShopConnectionDto | null =>
  c && {
    id: c.id,
    source: c.source as ShopConnectionDto['source'],
    status: c.status as ShopConnectionDto['status'],
    shopUrl: c.shopUrl,
    shopName: c.shopName,
    shopLogoUrl: c.shopLogoUrl,
    productCount: c.productCount,
    totalSold: c.totalSold,
    lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
    nextSyncAt: c.nextSyncAt?.toISOString() ?? null,
    error: c.error,
    demoData: isShopImportMock(),
  };
