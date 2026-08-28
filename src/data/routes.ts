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
  photographerId: string;
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
      'A Saigon-inspired editorial shoot designed around golden light, beautiful architecture and effortless femininity.',
    aesthetic: 'Golden hour rooftops, colonial architecture and Saigon streets at their most beautiful.',
    scenes: [
      'Golden-hour rooftop',
      'Colonial architecture',
      'Boutique café',
      'Saigon street',
      'Sunset city view',
    ],
    photographerId: 'linh',
    photoCount: 5,
    price: '149.000',
    priceVnd: 149_000,
    imageLabel: 'Golden Saigon',
  },
  {
    id: 'soft-girl-saigon',
    number: '02',
    title: 'Soft Girl Saigon',
    subtitle: 'Soft · Romantic · Café',
    tagline: 'Soft. Romantic. Yours.',
    description:
      'Dreamy light, blooming flowers and the gentlest Saigon vibes — a shoot that feels like a soft morning in your favourite café.',
    aesthetic: 'Café corners, pastel walls, flowers and that soft morning glow.',
    scenes: [
      'Flower café corner',
      'Soft morning light',
      'Pastel wall backdrop',
      'Garden terrace',
      'Window light portrait',
    ],
    photographerId: 'mai',
    photoCount: 5,
    price: '149.000',
    priceVnd: 149_000,
    imageLabel: 'Soft Girl Saigon',
  },
  {
    id: 'night-out',
    number: '03',
    title: 'Night Out',
    subtitle: 'Bold · Cinematic · Night',
    tagline: 'Bold. Cinematic. Unforgettable.',
    description:
      'City lights, neon glow and the electric energy of Saigon after dark — a shoot that makes you look like the main character.',
    aesthetic: 'Rooftop skylines, neon streets, and cinematic city-light bokeh.',
    scenes: [
      'Rooftop skyline',
      'Neon street',
      'City light bokeh',
      'Night terrace',
      'After-dark portrait',
    ],
    photographerId: 'anna',
    photoCount: 5,
    price: '149.000',
    priceVnd: 149_000,
    imageLabel: 'Night Out',
  },
  {
    id: 'luxury-saigon',
    number: '04',
    title: 'Luxury Saigon',
    subtitle: 'Elegant · Premium · Editorial',
    tagline: 'Elegant. Premium. Editorial.',
    description:
      'Five-star interiors, skyline terraces and upscale Saigon — a shoot that makes you look like you belong in a magazine.',
    aesthetic: 'Hotel lobbies, rooftop pools, marble interiors and architectural elegance.',
    scenes: [
      'Hotel lobby',
      'Rooftop pool terrace',
      'Marble interior',
      'Skyline editorial',
      'Luxury corridor',
    ],
    photographerId: 'sofia',
    photoCount: 5,
    price: '149.000',
    priceVnd: 149_000,
    imageLabel: 'Luxury Saigon',
  },
  {
    id: 'outfit-shoot',
    number: '05',
    title: 'Outfit Shoot',
    subtitle: 'Fashion · Street · Style',
    tagline: 'Fashion. Street. You.',
    description:
      'A shoot built entirely around your outfit — street backdrops, fashion angles and editorial poses that make your look the star.',
    aesthetic: 'Street walls, urban textures and fashion-forward editorial framing.',
    scenes: [
      'Street editorial',
      'Urban texture wall',
      'Fashion close-up',
      'Street portrait',
      'Style full-body',
    ],
    photographerId: 'emma',
    photoCount: 5,
    price: '149.000',
    priceVnd: 149_000,
    imageLabel: 'Outfit Shoot',
  },
];

export const photoRoutes: readonly PhotoRoute[] = seeds.map((seed) => ({
  ...seed,
  image: routePhotos[seed.id],
  shots: buildRouteShots(seed.id, seed.title),
}));
