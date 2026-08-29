'use client';

import { BookingModal } from '../src/components/booking/BookingModal';
import { Footer } from '../src/components/layout/Footer';
import { Header } from '../src/components/layout/Header';
import { FinalCta } from '../src/components/sections/FinalCta';
import { Hero } from '../src/components/sections/Hero';
import { HowItWorks } from '../src/components/sections/HowItWorks';
import { PhotoRoutes } from '../src/components/sections/PhotoRoutes';
import { SocialProofBar } from '../src/components/sections/SocialProofBar';
import { useBookingFlow } from '../src/hooks/useBookingFlow';

export default function HomePage() {
  const flow = useBookingFlow();

  return (
    <div className="min-h-screen bg-page">
      <Header />
      <main>
        <Hero />
        <SocialProofBar />
        <PhotoRoutes
          onSelectRoute={flow.open}
          discountPercentFor={flow.discountPercentFor}
          activeOffer={flow.activeOffer}
          hasBookedBefore={flow.hasBookedBefore}
        />
        <HowItWorks />
        <FinalCta />
      </main>
      <Footer />

      {flow.isOpen && <BookingModal flow={flow} />}
    </div>
  );
}
