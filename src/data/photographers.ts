import type { Photographer } from '../types/booking';
import { buildPortfolio } from './imagery';
import { routePhotos, type RouteId } from './photos';

type PhotographerProfile = {
  id: string;
  name: string;
  specialty: string;
  portfolioImage?: string;
};

const profiles: Record<string, PhotographerProfile> = {
  linh:  { id: 'linh',  name: 'Linh',  specialty: 'Fashion · Lifestyle · Golden Hour',  portfolioImage: '/images/photographers/linh-portfolio.jpg' },
  mai:   { id: 'mai',   name: 'Mai',   specialty: 'Soft · Feminine · Café',             portfolioImage: '/images/photographers/mai-portfolio.jpg' },
  sofia: { id: 'sofia', name: 'Sofia', specialty: 'Luxury · Architecture · Editorial',  portfolioImage: '/images/photographers/sofia-portfolio.jpg' },
  anna:  { id: 'anna',  name: 'Anna',  specialty: 'Night · Editorial · Portrait',       portfolioImage: '/images/photographers/anna-portfolio.jpg' },
  emma:  { id: 'emma',  name: 'Emma',  specialty: 'Outfit · Fashion · Street Style',    portfolioImage: '/images/photographers/emma-portfolio.jpg' },
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
    portfolioImage: profile.portfolioImage,
    portfolio: buildPortfolio(profile.id, routeId),
  };
};
