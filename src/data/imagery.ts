import type { Shot } from '../types/booking';
import { routeIds, routePhotos, type RouteId } from './photos';

const shotCrops = [
  'object-center',
  'object-[30%_35%] scale-[1.15]',
  'object-[75%_40%] scale-[1.08]',
  'object-[50%_20%] scale-[1.2]',
  'object-[60%_70%] scale-[1.12]',
] as const;

const portfolioCrops = [
  'object-center',
  'object-[35%_30%] scale-[1.1]',
  'object-[70%_45%] scale-[1.18]',
  'object-[50%_15%] scale-[1.12]',
  'object-[25%_60%] scale-[1.22]',
  'object-[80%_30%] scale-[1.1]',
  'object-[45%_75%] scale-[1.16]',
  'object-[60%_40%] scale-[1.08]',
  'object-[40%_55%] scale-[1.2]',
] as const;

const photoRotation = (routeId: RouteId): string[] => {
  const start = routeIds.indexOf(routeId);
  return routeIds.map((_, index) => routePhotos[routeIds[(start + index) % routeIds.length]]);
};

export const buildRouteShots = (routeId: RouteId, routeTitle: string): Shot[] => {
  const rotation = photoRotation(routeId);
  const fallbackOrder = [0, 1, 2, 0, 3];

  return shotCrops.map((objectClassName, index) => ({
    src: `/images/routes/${routeId}/shot-${index + 1}.jpg`,
    fallbackSrc: rotation[fallbackOrder[index]],
    label: `${routeTitle} — shot ${index + 1}`,
    objectClassName,
  }));
};

export const buildPortfolio = (photographerId: string, homeRoute: RouteId): Shot[] => {
  const rotation = photoRotation(homeRoute);

  return portfolioCrops.map((objectClassName, index) => ({
    src: `/images/portfolio/${photographerId}/${String(index + 1).padStart(2, '0')}.jpg`,
    fallbackSrc: rotation[index % rotation.length],
    label: `Portfolio ${index + 1}`,
    objectClassName,
  }));
};
