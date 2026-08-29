'use client';

import { useLocale } from '../../i18n/LocaleContext';

type LocaleToggleProps = {
  /** 'light' = white text, for the transparent hero header.
   *  'dark' = ink text, for the scrolled header and footer. */
  tone?: 'light' | 'dark';
  className?: string;
};

const toneStyles = {
  light: {
    border: 'border-white/40',
    active: 'bg-white text-ink',
    inactive: 'text-white/70 hover:text-white',
  },
  dark: {
    border: 'border-ink/25',
    active: 'bg-ink-block text-on-dark',
    inactive: 'text-muted hover:text-ink',
  },
};

/** EN / VI pill switch. Two buttons rather than a single toggle so both
 *  states are always visible — no icon to decode, no current-state guessing. */
export const LocaleToggle = ({ tone = 'dark', className = '' }: LocaleToggleProps) => {
  const { locale, setLocale } = useLocale();
  const styles = toneStyles[tone];

  const optionClass = (value: 'en' | 'vi') =>
    [
      'label-caps rounded-full px-2.5 py-1 text-[9.5px] font-medium transition-colors duration-200',
      locale === value ? styles.active : styles.inactive,
    ].join(' ');

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${styles.border} ${className}`}
    >
      <button type="button" onClick={() => setLocale('en')} aria-pressed={locale === 'en'} className={optionClass('en')}>
        EN
      </button>
      <button type="button" onClick={() => setLocale('vi')} aria-pressed={locale === 'vi'} className={optionClass('vi')}>
        VI
      </button>
    </div>
  );
};
