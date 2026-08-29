/**
 * GET /api/studio/me
 *
 * Returns the authenticated user's bookings with their associated photos.
 * Photos stored in R2 have fresh presigned URLs generated on every call.
 *
 * Authentication: Bearer token in the Authorization header (custom JWT session token).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDbConfigured } from '../../../../src/lib/db';
import { verifySessionToken } from '../../../../src/lib/studio-auth';
import { getPresignedUrl, r2IsConfigured } from '../../../../src/lib/r2';
import type { DiscountOffer } from '../../../../src/types/offer';

export type StudioPhoto = {
  id: string;
  type: 'upload' | 'preview' | 'generated';
  scene_index: number | null;
  url: string | null;
  is_stored: boolean;
};

export type StudioBooking = {
  id: string;
  route_id: string;
  route_title: string;
  director_id: string;
  director_name: string;
  shoot_status: string;
  payment_status: string;
  amount_vnd: number | null;
  created_at: string;
  feelings: string[];
  photos: StudioPhoto[];
};

export type StudioMeResponse = {
  bookings: StudioBooking[];
  /** Persisted per-account — survives across sessions and devices. */
  activeOffer: DiscountOffer | null;
};

const PRESIGNED_URL_TTL = 60 * 60 * 24; // 24 hours

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Studio not available' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string;
  try {
    const payload = verifySessionToken(token);
    userId = payload.userId;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const [user, bookings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeOfferPercent: true, activeOfferLabel: true, activeOfferRouteIds: true },
    }),
    prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        photos: {
          select: {
            id: true,
            type: true,
            sceneIndex: true,
            r2Key: true,
            wavespeedUrl: true,
            isStored: true,
          },
        },
      },
    }),
  ]);

  const activeOffer: DiscountOffer | null =
    user?.activeOfferPercent && user.activeOfferLabel
      ? {
          percent: user.activeOfferPercent,
          label: user.activeOfferLabel,
          eligibleRouteIds: user.activeOfferRouteIds,
          multiUse: true,
        }
      : null;

  const result: StudioBooking[] = await Promise.all(
    bookings.map(async (booking) => {
      const photos: StudioPhoto[] = await Promise.all(
        booking.photos.map(async (photo) => {
          let url: string | null = null;

          if (photo.isStored && photo.r2Key && r2IsConfigured()) {
            url = await getPresignedUrl(photo.r2Key, PRESIGNED_URL_TTL);
          } else if (photo.wavespeedUrl) {
            url = photo.wavespeedUrl;
          }

          return {
            id: photo.id,
            type: photo.type as StudioPhoto['type'],
            scene_index: photo.sceneIndex,
            url,
            is_stored: photo.isStored,
          };
        }),
      );

      photos.sort((a, b) => {
        const order = { upload: 0, preview: 1, generated: 2 } as const;
        const diff = order[a.type] - order[b.type];
        if (diff !== 0) return diff;
        return (a.scene_index ?? -1) - (b.scene_index ?? -1);
      });

      return {
        id: booking.id,
        route_id: booking.routeId,
        route_title: booking.routeTitle,
        director_id: booking.directorId,
        director_name: booking.directorName,
        shoot_status: booking.shootStatus,
        payment_status: booking.paymentStatus,
        amount_vnd: booking.amountVnd,
        created_at: booking.createdAt.toISOString(),
        feelings: booking.feelings,
        photos,
      };
    }),
  );

  return NextResponse.json({ bookings: result, activeOffer } satisfies StudioMeResponse);
}
