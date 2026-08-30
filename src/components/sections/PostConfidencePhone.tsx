import Image from 'next/image';

type PostConfidencePhoneProps = {
  /** Unused — kept for API compatibility */
  photoSrc?: string;
  eyebrow?: string;
  score?: number;
  outOf?: string;
  excellentChoice?: string;
  criteria?: unknown[];
  whyTitle?: string;
  whyBody?: string;
  className?: string;
};

export const PostConfidencePhone = ({ className = '' }: PostConfidencePhoneProps) => (
  <div className={`w-full select-none ${className}`}>
    <Image
      src="/images/post-confidence-phone-v2.png"
      alt="Phone mockup showing Post Confidence score of 95 with criteria breakdown"
      width={550}
      height={824}
      className="w-full h-auto drop-shadow-2xl"
      priority
    />
  </div>
);
