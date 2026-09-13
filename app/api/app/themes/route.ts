import { NextResponse } from 'next/server';
import type { ThemeDto, ThemeSceneDto } from '../../../../src/types/business/catalog';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { requireWorkspace } from '../../../../src/server/workspaces/workspaces';

const currentMonth = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`;
};

/**
 * GET /api/app/themes — { featured, library }.
 * Every active theme is usable any time. "Featured" is this month's theme, else the next upcoming one.
 */
export const GET = authedRoute(async (_req, session) => {
  await requireWorkspace(session.userId, 'brand');
  const month = currentMonth(new Date());
  const rows = await prisma.theme.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });

  const toDto = (t: (typeof rows)[number]): ThemeDto => ({
    id: t.id, title: t.title, description: t.description, coverImage: t.coverImage, featuredMonth: t.featuredMonth,
    scenes: t.scenes as unknown as ThemeSceneDto[], earlyAccess: Boolean(t.featuredMonth && t.featuredMonth > month),
  });
  const dated = rows.filter((t) => t.featuredMonth).sort((a, b) => (a.featuredMonth ?? '').localeCompare(b.featuredMonth ?? ''));
  const featured = dated.find((t) => t.featuredMonth === month) ?? dated.find((t) => (t.featuredMonth ?? '') > month) ?? rows[0] ?? null;
  return NextResponse.json({ featured: featured ? toDto(featured) : null, library: rows.map(toDto) });
});
