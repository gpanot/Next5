// server-only — never import from a 'use client' file.
// The brand a short is made from: the workspace's latest Auto Slideshow profile + levers, and its site's Slideshow Bank.

import { prisma } from '../../lib/db';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { BrandLever } from '../../types/admin/metaAds';
import type { BankHook, SlideshowBankContent } from '../../types/admin/slideshowBank';
import type { ShortInputs, ShortWorkspaceDto } from '../../types/admin/shorts';
import { HttpError } from '../http';

/** Next5 slideshow photo look (src/server/autoSlideshow/photos.ts): "cinematic" light made photos dark. */
export const BRIGHT_STYLE =
  'Bright, airy, well-exposed photograph in daylight, high-key, true-to-life colors, clean and inviting, realistic candid photo with natural proportions, vertical framing.';

type BrandRun = { url: string; profile: BrandProfile; levers: BrandLever[] };

const latestBrandRun = async (workspaceId: string): Promise<BrandRun | null> => {
  const run = await prisma.autoSlideshowRun.findFirst({
    where: { workspaceId, profile: { not: { equals: null } }, levers: { not: { equals: null } } },
    orderBy: { createdAt: 'desc' },
    select: { url: true, profile: true, levers: true },
  });
  if (!run) return null;
  return { url: run.url, profile: run.profile as unknown as BrandProfile, levers: run.levers as unknown as BrandLever[] };
};

/** Workspaces with a brand profile and a Slideshow Bank: the ones a short can be made for. */
export const listShortWorkspaces = async (): Promise<ShortWorkspaceDto[]> => {
  const banks = await prisma.slideshowBank.findMany({ select: { url: true, content: true } });
  const bankByUrl = new Map(banks.map((b) => [b.url, b.content as unknown as SlideshowBankContent]));
  const runs = await prisma.autoSlideshowRun.findMany({
    where: { workspaceId: { not: null }, profile: { not: { equals: null } }, url: { in: [...bankByUrl.keys()] } },
    orderBy: { createdAt: 'desc' },
    distinct: ['workspaceId'],
    select: { workspaceId: true, url: true, profile: true },
  });
  const ids = runs.map((r) => r.workspaceId as string);
  const [workspaces, counts] = await Promise.all([
    prisma.workspace.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, name: true } }),
    prisma.shortReel.groupBy({ by: ['workspaceId'], where: { workspaceId: { in: ids } }, _count: { _all: true } }),
  ]);
  const nameById = new Map(workspaces.map((w) => [w.id, w.name]));
  const countById = new Map(counts.map((c) => [c.workspaceId, c._count._all]));
  return runs
    .filter((r) => nameById.has(r.workspaceId as string))
    .map((r) => {
      const id = r.workspaceId as string;
      const profile = r.profile as unknown as BrandProfile;
      return { id, name: nameById.get(id) ?? '', url: r.url, brandName: profile.brandName, hooks: bankByUrl.get(r.url)?.hooks.length ?? 0, shorts: countById.get(id) ?? 0 };
    });
};

/** The best-scored bank hook this workspace has not made a short from yet (all used: the best one again). */
const pickHook = async (workspaceId: string, hooks: BankHook[]): Promise<BankHook> => {
  const done = await prisma.shortReel.findMany({ where: { workspaceId }, select: { inputs: true } });
  const used = new Set(done.map((d) => (d.inputs as { hookId?: string } | null)?.hookId).filter(Boolean));
  const ranked = [...hooks].sort((a, b) => b.score - a.score);
  const hook = ranked.find((h) => !used.has(h.id)) ?? ranked[0];
  if (!hook) throw new HttpError(409, 'no_hooks', 'This workspace’s Slideshow Bank has no hooks.');
  return hook;
};

const sourceText = (profile: BrandProfile, levers: BrandLever[], meatLines: string[]): string =>
  [
    `Brand: ${profile.brandName} (${profile.domain}). ${profile.valueProp}`,
    `Audience: ${profile.audience}`,
    `Offers and claims from the site:\n${levers.map((l) => `- ${l.claim} (quote: "${l.quote}")`).join('\n')}`,
    `Content to teach:\n${meatLines.join('\n')}`,
    `Site text:\n${profile.pageExcerpt.slice(0, 3_000)}`,
  ]
    .join('\n\n')
    .replace(/\$ (?=\d)/g, '$')
    .replace(/\*/g, '');

const clean = (t: string) => t.replace(/\$ (?=\d)/g, '$').replace(/\*/g, '').trim();

/** Up to 3 facts quoted from the site, as reels-af grounds a reel: all offers in one line, then other claims. */
const evidenceFrom = (levers: BrandLever[]): string[] => {
  const offers = levers.filter((l) => l.criterion === 'offer').map((l) => clean(l.quote));
  const others = levers.filter((l) => l.criterion !== 'offer').map((l) => clean(l.quote));
  const lines = [...(offers.length ? [`Offers from the site: ${offers.join(', ')}`] : []), ...others];
  return lines.slice(0, 3);
};

/** Everything the script step needs, frozen on the short so a re-run or an inspection sees the same facts. */
export const buildShortInputs = async (workspaceId: string): Promise<ShortInputs> => {
  const run = await latestBrandRun(workspaceId);
  if (!run) throw new HttpError(409, 'no_brand', 'This workspace has no brand profile yet. Run Auto Slideshow on it first.');
  const bank = await prisma.slideshowBank.findUnique({ where: { url: run.url }, select: { content: true } });
  if (!bank) throw new HttpError(409, 'no_bank', 'This workspace has no Slideshow Bank yet. Run Auto Slideshow on it first.');
  const content = bank.content as unknown as SlideshowBankContent;
  const hook = await pickHook(workspaceId, content.hooks);
  const meat = content.meats.find((m) => m.id === hook.meatId) ?? content.meats[0];
  const meatLines = meat ? meat.items.map((i) => `- ${i.title}: ${i.body}`) : [];
  const { profile, levers } = run;
  return {
    brandName: profile.brandName,
    tone: profile.tone,
    audience: profile.audience,
    photoStyle: profile.slideshowStyle?.photoStyle ?? '',
    hookId: hook.id,
    hookText: hook.text,
    meatId: meat?.id ?? '',
    meatTopic: meat?.topic ?? '',
    coreClaim: profile.valueProp,
    mechanism: meat ? meat.items.map((i) => `${i.title}: ${i.body}`).join(' ') : profile.valueProp,
    evidence: evidenceFrom(levers),
    domain: profile.productCategories[0] ?? 'business',
    sourceText: sourceText(profile, levers, meatLines),
  };
};
