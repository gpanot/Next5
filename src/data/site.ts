import type { ComponentType, SVGProps } from 'react';
import { heroPhoto } from './photos';
import {
  CalendarIcon,
  CameraIcon,
  CloudIcon,
  ClockIcon,
  FaceIcon,
  ImageIcon,
  PhotoIcon,
  SparkleIcon,
  StarIcon,
  UploadIcon,
} from '../components/ui/Icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type Bilingual<T> = { en: T; vi: T };

export const navLinks: readonly { label: Bilingual<string>; href: string }[] = [
  { label: { en: 'Studios', vi: 'Studio' }, href: '#routes' },
  { label: { en: 'How It Works', vi: 'Cách hoạt động' }, href: '#how-it-works' },
  { label: { en: 'FAQ', vi: 'Hỏi đáp' }, href: '#faq' },
];

export const heroImage = heroPhoto;

export const heroFeatures: readonly { icon: Icon; lines: Bilingual<readonly [string, string]> }[] = [
  {
    icon: CameraIcon,
    lines: { en: ['One selfie', "That's all we need"], vi: ['Một selfie', 'Chỉ vậy thôi'] },
  },
  {
    icon: ClockIcon,
    lines: { en: ['30 minutes', 'Super fast delivery'], vi: ['30 phút', 'Giao siêu nhanh'] },
  },
  {
    icon: StarIcon,
    lines: { en: ['See first photo FREE', 'Pay only if it looks like you'], vi: ['Xem ảnh đầu MIỄN PHÍ', 'Trả tiền nếu bạn thích'] },
  },
  {
    icon: FaceIcon,
    lines: { en: ['Made to look like you', 'Face-match guaranteed'], vi: ['Giống bạn thật sự', 'Đảm bảo khớp khuôn mặt'] },
  },
];

export { photoRoutes, type PhotoRoute } from './routes';

export type HowItWorksStep = {
  step: string;
  icon: Icon;
  title: Bilingual<string>;
  description: Bilingual<readonly [string, string]>;
};

export const howItWorksSteps: readonly HowItWorksStep[] = [
  {
    step: '1',
    icon: ImageIcon,
    title: { en: 'Choose your studio', vi: 'Chọn studio' },
    description: {
      en: ['Pick the aesthetic that', 'matches your vibe.'],
      vi: ['Chọn phong cách phù hợp', 'với cá tính của bạn.'],
    },
  },
  {
    step: '2',
    icon: SparkleIcon,
    title: { en: 'Tell us how you want to feel', vi: 'Cho biết cảm giác bạn muốn' },
    description: {
      en: ['We craft your shoot', 'around your intention.'],
      vi: ['Chúng tôi xây dựng bộ ảnh', 'theo mong muốn của bạn.'],
    },
  },
  {
    step: '3',
    icon: UploadIcon,
    title: { en: 'Upload your photo', vi: 'Tải ảnh của bạn lên' },
    description: {
      en: ['One clear selfie is', 'all we need.'],
      vi: ['Chỉ cần một ảnh selfie', 'rõ nét là đủ.'],
    },
  },
  {
    step: '4',
    icon: CameraIcon,
    title: { en: 'See your first shot', vi: 'Xem ảnh đầu tiên' },
    description: {
      en: ['Get your personalized preview', 'before you pay.'],
      vi: ['Xem trước ảnh cá nhân hóa', 'trước khi thanh toán.'],
    },
  },
  {
    step: '5',
    icon: PhotoIcon,
    title: { en: 'Receive all 5 photos', vi: 'Nhận đủ 5 ảnh' },
    description: {
      en: ['Complete shoot delivered', 'to your email in 30 min.'],
      vi: ['Bộ ảnh đầy đủ được gửi', 'vào email trong 30 phút.'],
    },
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
