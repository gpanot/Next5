import type { ComponentType, SVGProps } from 'react';
import { heroPhoto } from './photos';
import {
  CalendarIcon,
  CameraIcon,
  CloudIcon,
  ImageIcon,
  PhotoIcon,
  SparkleIcon,
  StarIcon,
  UploadIcon,
} from '../components/ui/Icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export const navLinks = [
  { label: 'Studios', href: '#routes' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
] as const;

export const heroImage = heroPhoto;

export const whatsAppUrl = 'https://wa.me/84000000000';

export const heroFeatures: readonly { icon: Icon; lines: readonly [string, string] }[] = [
  { icon: CameraIcon, lines: ['5 personalized', 'photos'] },
  { icon: StarIcon, lines: ['Creative direction', 'included'] },
  { icon: CalendarIcon, lines: ['Delivered', 'within 4 hours'] },
  { icon: CloudIcon, lines: ['Immediate', 'first preview'] },
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
    icon: ImageIcon,
    title: 'Choose your studio',
    description: ['Pick the aesthetic that', 'matches your vibe.'],
  },
  {
    step: '2',
    icon: SparkleIcon,
    title: 'Tell us how you want to feel',
    description: ['We craft your shoot', 'around your intention.'],
  },
  {
    step: '3',
    icon: UploadIcon,
    title: 'Upload your photo',
    description: ['One clear selfie is', 'all we need.'],
  },
  {
    step: '4',
    icon: CameraIcon,
    title: 'See your first shot',
    description: ['Get your personalized preview', 'before you pay.'],
  },
  {
    step: '5',
    icon: PhotoIcon,
    title: 'Receive all 5 photos',
    description: ['Complete shoot delivered', 'to your email in 4 hours.'],
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
