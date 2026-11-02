// server-only — never import from a 'use client' file.
// The site's Slideshow Bank: loaded when it exists, else built (meats and CTAs in parallel, then each meat's hooks in
// parallel, about 60-80 s) and saved. Usage counts come from the slideshows already made for the site.

import { prisma } from '../../../lib/db';
import type { BrandProfile } from '../../../types/admin/companyIntel';
import type { BrandLever } from '../../../types/admin/metaAds';
import type { SlideshowBankContent } from '../../../types/admin/slideshowBank';
import type { CostMeter } from '../../metaAds/cost';
import { noEmDash } from '../../slideshow/core/copyGuards';
import { writeCtas } from './ctas';
import { writeHooks } from './hooks';
import { writeMeats } from './meats';
import type { BankUsage } from './pick';
import { businessBrief } from './prompts';

/** The bank's on-screen and post text without em dashes (AI tell); photo prompts are never shown, so they stay. */
const withoutEmDashes = ({ meats, hooks, ctas }: SlideshowBankContent): SlideshowBankContent => ({
  meats: meats.map((m) => ({
    ...m,
    topic: noEmDash(m.topic),
    promise: noEmDash(m.promise),
    caption: noEmDash(m.caption),
    items: m.items.map((it) => ({ ...it, title: noEmDash(it.title), body: noEmDash(it.body) })),
  })),
  hooks: hooks.map((h) => ({ ...h, text: noEmDash(h.text) })),
  ctas: ctas.map((c) => ({ ...c, title: noEmDash(c.title), body: noEmDash(c.body) })),
});

/** `productLooks`: the brand's products as its own photos show them, so the slides talk about what it really sells. */
export const buildBank = async (profile: BrandProfile, levers: BrandLever[], meter: CostMeter, productLooks: string[] = []): Promise<SlideshowBankContent> => {
  const brief = businessBrief(profile, levers, productLooks);
  const brand = profile.brandName;
  const [meats, ctas] = await Promise.all([writeMeats(brief, brand, meter), writeCtas(brief, profile, levers, meter)]);
  const hooks = (
    await Promise.all(
      meats.map((m) =>
        writeHooks(brief, m, brand, meter).catch((err: unknown) => {
          console.warn(`[slideshow-bank] ${profile.domain} ${m.id}: no hooks (${err instanceof Error ? err.message : err})`);
          return [];
        }),
      ),
    )
  ).flat();
  const withHooks = meats.filter((m) => hooks.some((h) => h.meatId === m.id));
  if (withHooks.length === 0) throw new Error('No hook passed the checks for any meat set');
  return withoutEmDashes({ meats: withHooks, hooks, ctas });
};

/** The bank for `url`, built and saved on first use. Returns whether it was built now (its cost is on `meter`). */
export const bankForSite = async (url: string, profile: BrandProfile, levers: BrandLever[], meter: CostMeter, productLooks: string[] = []): Promise<{ id: string; content: SlideshowBankContent; built: boolean }> => {
  const existing = await prisma.slideshowBank.findUnique({ where: { url } });
  if (existing) return { id: existing.id, content: existing.content as unknown as SlideshowBankContent, built: false };
  const before = meter.summary().usdMicros;
  const content = await buildBank(profile, levers, meter, productLooks);
  const costMicros = meter.summary().usdMicros - before;
  const data = { content: content as unknown as object, costMicros };
  const row = await prisma.slideshowBank.upsert({ where: { url }, create: { url, ...data }, update: data });
  return { id: row.id, content, built: true };
};

/** Pure: the new parts first (under ids of their own), then the old ones marked retired, so old slideshows still resolve. */
export const withRefreshedParts = (old: SlideshowBankContent, fresh: SlideshowBankContent, tag: string): SlideshowBankContent => ({
  meats: [...fresh.meats.map((m) => ({ ...m, id: `${tag}${m.id}` })), ...old.meats.map((m) => ({ ...m, retired: true }))],
  hooks: [...fresh.hooks.map((h) => ({ ...h, id: `${tag}${h.id}`, meatId: `${tag}${h.meatId}` })), ...old.hooks.map((h) => ({ ...h, retired: true }))],
  ctas: [...fresh.ctas.map((c) => ({ ...c, id: `${tag}${c.id}` })), ...old.ctas.map((c) => ({ ...c, retired: true }))],
});

/** Rewrites the site's bank for a changed audience (about 60-80 s, about $0.05). No bank yet: the first run builds it. */
export const refreshBank = async (url: string, profile: BrandProfile, levers: BrandLever[], meter: CostMeter, productLooks: string[] = []): Promise<{ id: string; content: SlideshowBankContent; built: boolean } | null> => {
  const before = meter.summary().usdMicros;
  if (!(await prisma.slideshowBank.findUnique({ where: { url }, select: { id: true } }))) return null;
  const fresh = await buildBank(profile, levers, meter, productLooks);
  const spent = meter.summary().usdMicros - before;
  const tag = `r${Date.now().toString(36)}-`;
  return prisma.$transaction(async (tx) => {
    const row = await tx.slideshowBank.findUniqueOrThrow({ where: { url } });
    const content = withRefreshedParts(row.content as unknown as SlideshowBankContent, fresh, tag);
    await tx.slideshowBank.update({ where: { url }, data: { content: content as unknown as object, costMicros: row.costMicros + spent } });
    return { id: row.id, content, built: true };
  });
};

/** How often each bank part was used by the site's slideshows (failed ones and run `exceptRunId`'s do not count). */
export const loadUsage = async (url: string, exceptRunId?: string): Promise<BankUsage> => {
  const [rows, bank] = await Promise.all([
    prisma.autoSlideshow.findMany({
      where: { run: { url }, status: { not: 'failed' }, bankHookId: { not: null }, ...(exceptRunId ? { runId: { not: exceptRunId } } : {}) },
      select: { bankMeatId: true, bankHookId: true, bankCtaId: true },
    }),
    prisma.slideshowBank.findUnique({ where: { url }, select: { content: true } }),
  ]);
  const categoryOf = new Map(((bank?.content as unknown as SlideshowBankContent | undefined)?.hooks ?? []).map((h) => [h.id, h.category]));
  const count = (ids: (string | null)[]) => {
    const map = new Map<string, number>();
    for (const id of ids) if (id) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  };
  return {
    meats: count(rows.map((r) => r.bankMeatId)),
    hooks: count(rows.map((r) => r.bankHookId)),
    ctas: count(rows.map((r) => r.bankCtaId)),
    categories: count(rows.map((r) => (r.bankHookId ? (categoryOf.get(r.bankHookId) ?? null) : null))),
  };
};
