import type { CreativeDirector } from '../types/booking';
import { buildPortfolio } from './imagery';
import { routePhotos, type RouteId } from './photos';

type DirectorProfile = {
  id: string;
  name: string;
  specialty: string;
  signature: string;
  portfolioImage?: string;
};

const profiles: Record<string, DirectorProfile> = {
  linh: {
    id: 'linh',
    name: 'Linh',
    specialty: 'Golden Hour · Feminine · Lifestyle',
    signature: "Linh's signature is warm light, natural poses and effortless Saigon style.",
    portfolioImage: '/images/photographers/linh-portfolio.jpg',
  },
  mai: {
    id: 'mai',
    name: 'Mai',
    specialty: 'Soft · Romantic · Café',
    signature: 'Mai creates dreamy, soft-toned images that feel like a gentle morning — intimate and feminine.',
    portfolioImage: '/images/photographers/mai-portfolio.jpg',
  },
  sofia: {
    id: 'sofia',
    name: 'Sofia',
    specialty: 'Luxury · Architecture · Editorial',
    signature: 'Sofia brings a high-fashion editorial eye — clean lines, luxurious settings, powerful framing.',
    portfolioImage: '/images/photographers/sofia-portfolio.jpg',
  },
  anna: {
    id: 'anna',
    name: 'Anna',
    specialty: 'Night · Bold · Cinematic',
    signature: 'Anna owns the night — bold light, cinematic energy, and frames that make you look like the main character.',
    portfolioImage: '/images/photographers/anna-portfolio.jpg',
  },
  emma: {
    id: 'emma',
    name: 'Emma',
    specialty: 'Fashion · Street · Outfit',
    signature: 'Emma makes your outfit the hero — street-sharp angles, fashion-forward framing, full editorial energy.',
    portfolioImage: '/images/photographers/emma-portfolio.jpg',
  },
};

export const getCreativeDirector = (photographerId: string, routeId: RouteId): CreativeDirector => {
  const profile = profiles[photographerId];

  if (!profile) {
    throw new Error(`Unknown creative director "${photographerId}"`);
  }

  return {
    ...profile,
    avatar: `/images/photographers/${profile.id}.jpg`,
    avatarFallback: routePhotos[routeId],
    portfolioImage: profile.portfolioImage,
    portfolio: buildPortfolio(profile.id, routeId),
  };
};
