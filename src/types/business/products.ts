/** Client-safe product DTOs. */

export type ProductDto = {
  id: string;
  name: string;
  category: string;
  colorName: string | null;
  sku: string | null;
  fit: string | null;
  notes: string | null;
  frontUrl: string | null;
  backUrl: string | null;
  detailUrl: string | null;
  timesUsed: number;
  lastUsedAt: string | null;
  createdAt: string;
};
