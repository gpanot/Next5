export type Shot = {
  src: string;
  fallbackSrc: string;
  label: string;
  objectClassName?: string;
};

export type CreativeDirector = {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  avatarFallback: string;
  signature: string;
  /** Single collage image that replaces the 9-grid when provided. */
  portfolioImage?: string;
  portfolio: readonly Shot[];
};

export type BookingStep =
  | 'studio'
  | 'intention'
  | 'upload'
  | 'preview'
  | 'purchase'
  | 'payment'
  | 'confirmed';

export type FeelingChoice =
  | 'beautiful'
  | 'soft'
  | 'elegant'
  | 'bold'
  | 'fashion'
  | 'noticed';

export type GoalChoice =
  | 'instagram'
  | 'attention'
  | 'style'
  | 'confident'
  | 'content'
  | 'fun'
  | 'jealous';

export type ShootIntention = {
  feelings: FeelingChoice[];
  goals: GoalChoice[];
};

export type CustomerDetails = {
  email: string;
};

export type PaymentStatus = 'pending' | 'paid' | 'confirmed';

export type Booking = {
  id: string;
  studioId: string;
  email: string;
  intention: ShootIntention;
  uploadedPhoto: string | null;
  amount: number;
  paymentStatus: PaymentStatus;
};
