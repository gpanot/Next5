'use client';

import { BookingModal } from '../src/components/booking/BookingModal';
import { Footer } from '../src/components/layout/Footer';
import { Header } from '../src/components/layout/Header';
import { Faq } from '../src/components/sections/Faq';
import { FinalCta } from '../src/components/sections/FinalCta';
import { Hero } from '../src/components/sections/Hero';
import { HowItWorks } from '../src/components/sections/HowItWorks';
import { PaymentMethods } from '../src/components/sections/PaymentMethods';
import { PhotoRoutes } from '../src/components/sections/PhotoRoutes';
import { ProofStrip } from '../src/components/sections/ProofStrip';
import { Reviews } from '../src/components/sections/Reviews';
import { SocialProofBar } from '../src/components/sections/SocialProofBar';
import { useBookingFlow } from '../src/hooks/useBookingFlow';

export default function HomePage() {
  const flow = useBookingFlow();

  return (
    <div className="min-h-screen bg-page">
      <Header />
      <main>
        <Hero />
        <ProofStrip />
        <SocialProofBar />
        <PhotoRoutes
          onSelectRoute={flow.open}
          discountPercentFor={flow.discountPercentFor}
          activeOffer={flow.activeOffer}
          hasBookedBefore={flow.hasBookedBefore}
        />
        <HowItWorks />
        <Reviews />
        <Faq />
        <FinalCta />
        <PaymentMethods />
      </main>
      <Footer />

      {flow.isOpen && <BookingModal flow={flow} />}
    </div>
  );
}
