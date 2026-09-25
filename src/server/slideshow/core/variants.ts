// server-only — never import from a 'use client' file.
// Persistence for deck cards (slideshow_variants) and every deck action (slideshow_swipes).
// Swipes are the only learning signal until post analytics exist (spec 11.2, 15).

import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';

export type NewVariant = {
  engine: 'website' | 'zillow';
  lens: string;
  archetype: string;
  plan: Prisma.InputJsonValue;
  listingRunId?: string | null;
  workspaceId?: string | null;
};

/**
 * Saves generated cards and returns their ids, in order.
 * Returns null when the tables are missing or the write fails: the deck still works, unlogged.
 */
export async function createVariants(rows: NewVariant[]): Promise<string[] | null> {
  try {
    const created = await prisma.$transaction(
      rows.map((r) => prisma.slideshowVariant.create({
        data: {
          engine: r.engine,
          lens: r.lens,
          archetype: r.archetype,
          plan: r.plan,
          listingRunId: r.listingRunId ?? null,
          workspaceId: r.workspaceId ?? null,
        },
        select: { id: true },
      })),
    );
    return created.map((c) => c.id);
  } catch (err) {
    console.error('[slideshow/variants] could not save deck cards — swipes will not be logged:', err);
    return null;
  }
}

export type SwipeAction = 'keep' | 'discard' | 'undo' | 'open' | 'edit' | 'render';

export const SWIPE_ACTIONS: readonly SwipeAction[] = ['keep', 'discard', 'undo', 'open', 'edit', 'render'];

/** Variant status after each action. 'open' and a bare 'undo' leave it as is / proposed. */
const STATUS_AFTER: Partial<Record<SwipeAction, string>> = {
  keep: 'kept',
  discard: 'discarded',
  undo: 'proposed',
  edit: 'edited',
  render: 'rendered',
};

export type SwipeInput = {
  variantId: string;
  action: SwipeAction;
  /** Skip reason chip. On 'discard' with a reason, the latest discard row gets the reason. */
  reason?: string;
  /** 'edit': shot roles that changed, and the new shot texts in order. */
  editedShots?: string[];
  shotTexts?: string[];
  /** 'render': the queued BlitzProject. */
  blitzProjectId?: string;
};

/** Stores the new texts on the variant's plan so the edited version is what gets analysed. */
async function applyEditedTexts(variantId: string, shotTexts: string[]): Promise<void> {
  const variant = await prisma.slideshowVariant.findUnique({ where: { id: variantId }, select: { plan: true } });
  const plan = variant?.plan as { shots?: Array<{ text: string }> } | null;
  if (!plan?.shots) return;
  const shots = plan.shots.map((s, i) => ({ ...s, text: shotTexts[i] ?? s.text }));
  await prisma.slideshowVariant.update({ where: { id: variantId }, data: { plan: { ...plan, shots } } });
}

/** Records one deck action and moves the variant's status. */
export async function logSwipe(input: SwipeInput): Promise<void> {
  const { variantId, action, reason } = input;

  // A reason arrives a moment after the skip: attach it to that skip instead of counting twice.
  if (action === 'discard' && reason) {
    const last = await prisma.slideshowSwipe.findFirst({
      where: { variantId, action: 'discard', reason: null },
      orderBy: { createdAt: 'desc' },
    });
    if (last) {
      await prisma.slideshowSwipe.update({ where: { id: last.id }, data: { reason: reason.slice(0, 80) } });
      return;
    }
  }

  await prisma.slideshowSwipe.create({
    data: {
      variantId,
      action,
      reason: reason?.slice(0, 80) ?? null,
      editedShots: input.editedShots ?? [],
    },
  });

  const status = STATUS_AFTER[action];
  if (action === 'edit' && input.shotTexts) await applyEditedTexts(variantId, input.shotTexts);
  if (status) {
    await prisma.slideshowVariant.update({
      where: { id: variantId },
      data: { status, ...(input.blitzProjectId ? { blitzProjectId: input.blitzProjectId } : {}) },
    });
  }
}
