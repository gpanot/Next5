import type { BankUseDto } from '../../../../types/admin/slideshowBank';

/** Bank part id → the slideshows that used it. */
export type UseIndex = { meats: Map<string, BankUseDto[]>; hooks: Map<string, BankUseDto[]>; ctas: Map<string, BankUseDto[]> };

const push = (map: Map<string, BankUseDto[]>, id: string | null, use: BankUseDto) => {
  if (id) map.set(id, [...(map.get(id) ?? []), use]);
};

export const indexUses = (used: BankUseDto[]): UseIndex => {
  const index: UseIndex = { meats: new Map(), hooks: new Map(), ctas: new Map() };
  for (const use of used) {
    push(index.meats, use.meatId, use);
    push(index.hooks, use.hookId, use);
    push(index.ctas, use.ctaId, use);
  }
  return index;
};

export type HookFilter = 'all' | 'used' | 'unused';

/** Opens a slideshow of the current run in the editor; slideshows of other runs only show their date. */
export type OpenUse = (use: BankUseDto) => void;
