'use client';

import { useLocale } from '../../i18n/LocaleContext';

/**
 * Wordmark-style badges, not reproductions of the official logos — safer
 * than guessing at exact trademarked artwork. Swap in real logo assets here
 * once available. Colors are approximate brand references only.
 */
const methods = [
  { name: 'MoMo', color: '#D82D8B' },
  { name: 'VietQR', color: '#00529C' },
  { name: 'ZaloPay', color: '#0068FF' },
];

export const PaymentMethods = () => {
  const { t } = useLocale();

  return (
    <div className="border-t border-line bg-surface py-8">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-3 px-5 sm:px-8">
        <p className="label-caps text-[9px] font-medium text-muted">{t.paymentMethods.label}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {methods.map((method) => (
            <span
              key={method.name}
              className="rounded-lg border border-line bg-page px-4 py-2 font-serif text-[14px] font-medium"
              style={{ color: method.color }}
            >
              {method.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
