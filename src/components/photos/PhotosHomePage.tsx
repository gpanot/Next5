'use client';

import { BookingModal } from '../booking/BookingModal';
import { Footer } from '../layout/Footer';
import { Header } from '../layout/Header';
import { Faq } from '../sections/Faq';
import { FinalCta } from '../sections/FinalCta';
import { Hero } from '../sections/Hero';
import { HowItWorks } from '../sections/HowItWorks';
import { LooksLikeYouGuarantee } from '../sections/LooksLikeYouGuarantee';
import { PaymentMethods } from '../sections/PaymentMethods';
import { PhotoRoutes } from '../sections/PhotoRoutes';
import { PostConfidence } from '../sections/PostConfidence';
import { ResultsGallery } from '../sections/ResultsGallery';
import { Reviews } from '../sections/Reviews';
import { SocialProofBar } from '../sections/SocialProofBar';
import { useBookingFlow } from '../../hooks/useBookingFlow';

export const PhotosHomePage = () => {
  const flow = useBookingFlow();

  return (
    <div className="min-h-screen bg-page">
      <Header />
      <main>
        <Hero />
        <ResultsGallery />
        <SocialProofBar />
        <PhotoRoutes
          onSelectRoute={flow.open}
          discountPercentFor={flow.discountPercentFor}
          activeOffer={flow.activeOffer}
          hasBookedBefore={flow.hasBookedBefore}
        />
        <LooksLikeYouGuarantee />
        <HowItWorks />
        <PostConfidence />
        <Reviews />
        <Faq />
        <FinalCta />
        <PaymentMethods />
      </main>
      <Footer />
      {flow.isOpen && <BookingModal flow={flow} />}
    </div>
  );
};
