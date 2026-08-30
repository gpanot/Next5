'use client';

import { useLocale } from '../../i18n/LocaleContext';

/* ─── MoMo logo ────────────────────────────────────────────────────────────
   Pink/magenta rounded-square brand mark + "momo" wordmark in white.
   Brand colors: #D82D8B (pink), #A5116D (dark pink), #9B208E (purple)        */
const MomoLogo = () => (
  <svg viewBox="0 0 120 40" width="120" height="40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="MoMo" role="img">
    {/* Rounded square brand mark */}
    <rect width="40" height="40" rx="10" fill="url(#momo-grad)" />
    <defs>
      <linearGradient id="momo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#D82D8B" />
        <stop offset="1" stopColor="#9B208E" />
      </linearGradient>
    </defs>
    {/* Stylised "M" letterform in white */}
    <path
      d="M10 28V14l10 8 10-8v14"
      stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
    {/* "momo" wordmark to the right */}
    <text x="48" y="26" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="14" fill="#D82D8B" letterSpacing="-0.3">momo</text>
  </svg>
);

/* ─── VietQR logo ───────────────────────────────────────────────────────────
   Official colors: #CC0A2B (red), #16406C (dark navy), white.
   Mark: stylised QR square with "VIET" in red + "QR" in navy.                */
const VietQRLogo = () => (
  <svg viewBox="0 0 140 40" width="140" height="40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="VietQR" role="img">
    {/* QR-inspired square mark */}
    <rect width="40" height="40" rx="6" fill="#16406C" />
    {/* Three corner squares of a QR code */}
    <rect x="6" y="6" width="11" height="11" rx="2" fill="white" />
    <rect x="8" y="8" width="7" height="7" rx="1" fill="#16406C" />
    <rect x="23" y="6" width="11" height="11" rx="2" fill="white" />
    <rect x="25" y="8" width="7" height="7" rx="1" fill="#16406C" />
    <rect x="6" y="23" width="11" height="11" rx="2" fill="white" />
    <rect x="8" y="25" width="7" height="7" rx="1" fill="#16406C" />
    {/* Data dots */}
    <rect x="23" y="23" width="4" height="4" rx="0.8" fill="white" />
    <rect x="29" y="23" width="4" height="4" rx="0.8" fill="white" />
    <rect x="23" y="29" width="4" height="4" rx="0.8" fill="white" />
    <rect x="29" y="29" width="4" height="4" rx="0.8" fill="white" />
    {/* Wordmark: VIET in red, QR in navy */}
    <text x="48" y="17" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="13" fill="#CC0A2B" letterSpacing="0.5">VIET</text>
    <text x="48" y="33" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="13" fill="#16406C" letterSpacing="0.5">QR</text>
  </svg>
);

/* ─── ZaloPay logo ──────────────────────────────────────────────────────────
   Brand: blue (#006AF5) rounded-square icon + "ZaloPay" bold wordmark.        */
const ZaloPayLogo = () => (
  <svg viewBox="0 0 148 40" width="148" height="40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ZaloPay" role="img">
    {/* Blue rounded-square icon */}
    <rect width="40" height="40" rx="10" fill="#006AF5" />
    {/* Stylised "Z" in white */}
    <path d="M11 13h18L11 27h18" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    {/* "Zalo" part in blue, "Pay" in darker blue */}
    <text x="48" y="26" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="15" fill="#006AF5">Zalo</text>
    <text x="90" y="26" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="15" fill="#004DB3">Pay</text>
  </svg>
);

export const PaymentMethods = () => {
  const { t } = useLocale();

  return (
    <div className="border-t border-line bg-surface py-8">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-4 px-5 sm:px-8">
        <p className="label-caps text-[9px] font-medium text-muted">{t.paymentMethods.label}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex h-12 items-center rounded-xl border border-line bg-page px-4 py-2 shadow-sm">
            <MomoLogo />
          </div>
          <div className="flex h-12 items-center rounded-xl border border-line bg-page px-4 py-2 shadow-sm">
            <VietQRLogo />
          </div>
          <div className="flex h-12 items-center rounded-xl border border-line bg-page px-4 py-2 shadow-sm">
            <ZaloPayLogo />
          </div>
        </div>
        <p className="text-[11px] text-muted">{t.paymentMethods.privacyNote}</p>
      </div>
    </div>
  );
};
