export type Shot = {
  src: string;
  fallbackSrc: string;
  label: string;
  objectClassName?: string;
};

export type Photographer = {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  avatarFallback: string;
  /** Single collage image that replaces the 9-grid when provided. */
  portfolioImage?: string;
  portfolio: readonly Shot[];
};

export type TimeSlot = {
  id: string;
  value: string;
  label: string;
  badge?: string;
};

export type BookingStep =
  | 'route'
  | 'date'
  | 'photographer'
  | 'checkout'
  | 'payment'
  | 'confirmed';

export type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
};

export type PaymentStatus = 'pending' | 'paid' | 'confirmed';

export type Booking = {
  id: string;
  routeId: string;
  photographerId: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  paymentStatus: PaymentStatus;
};
