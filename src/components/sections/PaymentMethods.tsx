'use client';

import Image from 'next/image';
import { useLocale } from '../../i18n/LocaleContext';

export const PaymentMethods = () => {
  const { t } = useLocale();

  return (
    <div className="border-t border-line bg-surface py-8">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-4 px-5 sm:px-8">
        <p className="label-caps text-[9px] font-medium text-muted">{t.paymentMethods.label}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* MoMo — square icon only, already has rounded background */}
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <Image
              src="/images/logo-momo.png"
              alt="MoMo"
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
          {/* VietQR — horizontal logo on white background */}
          <div className="flex h-14 items-center rounded-xl border border-line bg-white px-5 shadow-sm">
            <Image
              src="/images/logo-vietqr.webp"
              alt="VietQR"
              width={140}
              height={48}
              className="h-10 w-auto object-contain"
            />
          </div>
          {/* ZaloPay — horizontal wordmark on white background */}
          <div className="flex h-14 items-center rounded-xl border border-line bg-white px-5 shadow-sm">
            <Image
              src="/images/logo-zalopay.png"
              alt="ZaloPay"
              width={140}
              height={48}
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted">{t.paymentMethods.privacyNote}</p>
      </div>
    </div>
  );
};
