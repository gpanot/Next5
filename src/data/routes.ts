import type { Shot, TimeSlot } from '../types/booking';
import { buildRouteShots } from './imagery';
import { routePhotos, type RouteId } from './photos';

export type PhotoRoute = {
  id: RouteId;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  locations: string;
  duration: string;
  photographer: string;
  price: string;
  image: string;
  imageLabel: string;
  photographerId: string;
  photoCount: number;
  locationCount: number;
  durationShort: string;
  priceVnd: number;
  shots: readonly Shot[];
  slotTemplate: readonly TimeSlot[];
};

const slot = (value: string, label: string, badge?: string): TimeSlot => ({
  id: value,
  value,
  label,
  ...(badge ? { badge } : {}),
});

type RouteSeed = Omit<PhotoRoute, 'shots' | 'image'>;

const seeds: readonly RouteSeed[] = [
  {
    id: 'golden-saigon',
    number: '01',
    title: 'Golden Saigon',
    subtitle: 'Golden-hour city portraits',
    description: 'Sunset vibes, city views and iconic spots.',
    locations: '4 locations',
    duration: '90 minutes',
    photographer: 'Linh',
    price: '890.000',
    imageLabel: 'Golden Saigon',
    photographerId: 'linh',
    photoCount: 5,
    locationCount: 4,
    durationShort: '90 min',
    priceVnd: 890_000,
    slotTemplate: [
      slot('10:00', '10:00 AM'),
      slot('14:00', '2:00 PM'),
      slot('17:30', '5:30 PM', 'Best light'),
    ],
  },
  {
    id: 'soft-girl-saigon',
    number: '02',
    title: 'Soft Girl Saigon',
    subtitle: 'Cafés, flowers and soft light',
    description: 'Cafés, flowers and soft feminine vibes.',
    locations: '4 locations',
    duration: '90 minutes',
    photographer: 'Mai',
    price: '790.000',
    imageLabel: 'Soft Girl Saigon',
    photographerId: 'mai',
    photoCount: 5,
    locationCount: 4,
    durationShort: '90 min',
    priceVnd: 790_000,
    slotTemplate: [
      slot('09:00', '9:00 AM'),
      slot('11:00', '11:00 AM', 'Best light'),
      slot('15:00', '3:00 PM'),
    ],
  },
  {
    id: 'night-out',
    number: '03',
    title: 'Night Out',
    subtitle: 'Rooftops, neon and city lights',
    description: 'Rooftop, nightlife and city lights.',
    locations: '4 locations',
    duration: '90 minutes',
    photographer: 'Anna',
    price: '990.000',
    imageLabel: 'Night Out',
    photographerId: 'anna',
    photoCount: 5,
    locationCount: 4,
    durationShort: '90 min',
    priceVnd: 990_000,
    slotTemplate: [
      slot('18:30', '6:30 PM'),
      slot('20:00', '8:00 PM', 'Best light'),
      slot('21:30', '9:30 PM'),
    ],
  },
  {
    id: 'luxury-saigon',
    number: '04',
    title: 'Luxury Saigon',
    subtitle: 'Five-star interiors and skyline suites',
    description: 'Luxury hotels, rooftops and upscale vibes.',
    locations: '4 locations',
    duration: '120 minutes',
    photographer: 'Sofia',
    price: '1.490.000',
    imageLabel: 'Luxury Saigon',
    photographerId: 'sofia',
    photoCount: 5,
    locationCount: 4,
    durationShort: '120 min',
    priceVnd: 1_490_000,
    slotTemplate: [
      slot('10:00', '10:00 AM'),
      slot('13:00', '1:00 PM'),
      slot('16:30', '4:30 PM', 'Best light'),
    ],
  },
  {
    id: 'outfit-shoot',
    number: '05',
    title: 'Outfit Shoot',
    subtitle: 'Built around the outfit you love',
    description: 'Designed around your outfit and style.',
    locations: '4 locations',
    duration: '60 minutes',
    photographer: 'Emma',
    price: '690.000',
    imageLabel: 'Outfit Shoot',
    photographerId: 'emma',
    photoCount: 5,
    locationCount: 4,
    durationShort: '60 min',
    priceVnd: 690_000,
    slotTemplate: [
      slot('09:30', '9:30 AM'),
      slot('12:00', '12:00 PM'),
      slot('16:00', '4:00 PM', 'Best light'),
    ],
  },
];

export const photoRoutes: readonly PhotoRoute[] = seeds.map((seed) => ({
  ...seed,
  image: routePhotos[seed.id],
  shots: buildRouteShots(seed.id, seed.title),
}));
