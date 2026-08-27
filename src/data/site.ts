import type { ComponentType, SVGProps } from 'react';
import { heroPhoto } from './photos';
import {
  CalendarIcon,
  CameraIcon,
  CardIcon,
  CloudIcon,
  PhoneCheckIcon,
  PhotoIcon,
  SunIcon,
  TicketIcon,
} from '../components/ui/Icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export const navLinks = [
  { label: 'Photo Routes', href: '#routes' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Photographers', href: '#photographers' },
  { label: 'FAQ', href: '#faq' },
] as const;

export const heroImage = heroPhoto;

export const whatsAppUrl = 'https://wa.me/84000000000';

export const heroFeatures: readonly { icon: Icon; lines: readonly [string, string] }[] = [
  { icon: TicketIcon, lines: ['Venue fees', 'included'] },
  { icon: SunIcon, lines: ['Best light', 'at the best time'] },
  { icon: CameraIcon, lines: ['Professional', 'photographer'] },
  { icon: CloudIcon, lines: ['Weather', 'reschedule'] },
];

export { photoRoutes, type PhotoRoute } from './routes';

export type HowItWorksStep = {
  step: string;
  icon: Icon;
  title: string;
  description: readonly [string, string];
};

export const howItWorksSteps: readonly HowItWorksStep[] = [
  {
    step: '1',
    icon: PhoneCheckIcon,
    title: 'Pick your route',
    description: ['Choose the route that fits', 'your vibe and time.'],
  },
  {
    step: '2',
    icon: CalendarIcon,
    title: 'Choose date & time',
    description: ["We'll show the best time", 'for perfect lighting.'],
  },
  {
    step: '3',
    icon: CardIcon,
    title: 'Book & pay',
    description: ['Secure your slot with a deposit.', 'We handle the rest.'],
  },
  {
    step: '4',
    icon: CameraIcon,
    title: 'Enjoy your shoot',
    description: ['We meet, shoot, have fun.', 'We got you!'],
  },
  {
    step: '5',
    icon: PhotoIcon,
    title: 'Get your photos',
    description: ['Receive 5+ edited photos', 'within 3 days.'],
  },
];

export const avatarSources = [
  '/images/avatars/avatar-1.jpg',
  '/images/avatars/avatar-2.jpg',
  '/images/avatars/avatar-3.jpg',
  '/images/avatars/avatar-4.jpg',
  '/images/avatars/avatar-5.jpg',
] as const;

export const polaroidPhotos = [
  { src: '/images/polaroids/polaroid-1.jpg', label: 'Polaroid 1' },
  { src: '/images/polaroids/polaroid-2.jpg', label: 'Polaroid 2' },
  { src: '/images/polaroids/polaroid-3.jpg', label: 'Polaroid 3' },
  { src: '/images/polaroids/polaroid-4.jpg', label: 'Polaroid 4' },
] as const;
