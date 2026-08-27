import type { Photographer } from '../types/booking';
import { buildPortfolio } from './imagery';
import { routePhotos, type RouteId } from './photos';

type PhotographerProfile = {
  id: string;
  name: string;
  specialty: string;
};

const profiles: Record<string, PhotographerProfile> = {
  linh: { id: 'linh', name: 'Linh', specialty: 'Fashion · Lifestyle · Portrait' },
  mai: { id: 'mai', name: 'Mai', specialty: 'Soft light · Café · Portrait' },
  anna: { id: 'anna', name: 'Anna', specialty: 'Night · Editorial · Portrait' },
  khoa: { id: 'khoa', name: 'Khoa', specialty: 'Luxury · Architecture · Portrait' },
};

export const getPhotographer = (photographerId: string, routeId: RouteId): Photographer => {
  const profile = profiles[photographerId];

  if (!profile) {
    throw new Error(`Unknown photographer "${photographerId}"`);
  }

  return {
    ...profile,
    avatar: `/images/photographers/${profile.id}.jpg`,
    avatarFallback: routePhotos[routeId],
    portfolio: buildPortfolio(profile.id, routeId),
  };
};
