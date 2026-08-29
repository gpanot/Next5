import type { Shot } from '../types/booking';
import { buildRouteShots } from './imagery';
import { routePhotos, type RouteId } from './photos';

export type PhotoRoute = {
  id: RouteId;
  number: string;
  title: string;
  subtitle: string;
  tagline: string;
  description: string;
  aesthetic: string;
  scenes: readonly string[];
  /** The two creative directors offered for this studio, in display order. */
  directorIds: readonly [string, string];
  photoCount: number;
  price: string;
  priceVnd: number;
  image: string;
  imageLabel: string;
  shots: readonly Shot[];
};

type RouteSeed = Omit<PhotoRoute, 'shots' | 'image'>;

const seeds: readonly RouteSeed[] = [
  {
    id: 'golden-saigon',
    number: '01',
    title: 'Golden Saigon',
    subtitle: 'Warm · Feminine · Golden Hour',
    tagline: 'Warm. Feminine. Unforgettable.',
    description:
      'Golden light, colonial architecture and effortless femininity.',
    aesthetic: 'Golden hour rooftops, colonial architecture and Saigon streets at their most beautiful.',
    scenes: [
      'Golden-hour rooftop',
      'Colonial architecture',
      'Boutique café',
      'Saigon street',
      'Sunset city view',
    ],
    directorIds: ['linh', 'sofia'],
    photoCount: 5,
    price: '299.000',
    priceVnd: 299_000,
    imageLabel: 'Golden Saigon',
  },
  {
    id: 'soft-girl-saigon',
    number: '02',
    title: 'Soft Girl Saigon',
    subtitle: 'Soft · Romantic · Café',
    tagline: 'Soft. Romantic. Yours.',
    description:
      'Dreamy light, flowers and the softest morning in your favourite café.',
    aesthetic: 'Café corners, pastel walls, flowers and that soft morning glow.',
    scenes: [
      'Flower café corner',
      'Soft morning light',
      'Pastel wall backdrop',
      'Garden terrace',
      'Window light portrait',
    ],
    directorIds: ['mai', 'linh'],
    photoCount: 5,
    price: '299.000',
    priceVnd: 299_000,
    imageLabel: 'Soft Girl Saigon',
  },
  {
    id: 'night-out',
    number: '03',
    title: 'Night Out',
    subtitle: 'Bold · Cinematic · Night',
    tagline: 'Bold. Cinematic. Unforgettable.',
    description:
      'Neon, city lights and Saigon after dark — you as the main character.',
    aesthetic: 'Rooftop skylines, neon streets, and cinematic city-light bokeh.',
    scenes: [
      'Rooftop skyline',
      'Neon street',
      'City light bokeh',
      'Night terrace',
      'After-dark portrait',
    ],
    directorIds: ['anna', 'emma'],
    photoCount: 5,
    price: '299.000',
    priceVnd: 299_000,
    imageLabel: 'Night Out',
  },
  {
    id: 'luxury-saigon',
    number: '04',
    title: 'Luxury Saigon',
    subtitle: 'Elegant · Premium · Editorial',
    tagline: 'Elegant. Premium. Editorial.',
    description:
      'Five-star interiors and skyline terraces, straight out of a magazine.',
    aesthetic: 'Hotel lobbies, rooftop pools, marble interiors and architectural elegance.',
    scenes: [
      'Hotel lobby',
      'Rooftop pool terrace',
      'Marble interior',
      'Skyline editorial',
      'Luxury corridor',
    ],
    directorIds: ['sofia', 'anna'],
    photoCount: 5,
    price: '299.000',
    priceVnd: 299_000,
    imageLabel: 'Luxury Saigon',
  },
  {
    id: 'outfit-shoot',
    number: '05',
    title: 'Outfit Shoot',
    subtitle: 'Fashion · Street · Style',
    tagline: 'Fashion. Street. You.',
    description:
      'Street backdrops and editorial angles, built around your outfit.',
    aesthetic: 'Street walls, urban textures and fashion-forward editorial framing.',
    scenes: [
      'Street editorial',
      'Urban texture wall',
      'Fashion close-up',
      'Street portrait',
      'Style full-body',
    ],
    directorIds: ['emma', 'sofia'],
    photoCount: 5,
    price: '299.000',
    priceVnd: 299_000,
    imageLabel: 'Outfit Shoot',
  },
];

export const photoRoutes: readonly PhotoRoute[] = seeds.map((seed) => ({
  ...seed,
  image: routePhotos[seed.id],
  shots: buildRouteShots(seed.id, seed.title),
}));
