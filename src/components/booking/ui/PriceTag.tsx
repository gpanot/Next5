import { formatVnd } from '../../../lib/format';

type PriceTagProps = {
  amountVnd: number;
  note?: string;
  tone?: 'light' | 'dark';
};

export const PriceTag = ({ amountVnd, note, tone = 'light' }: PriceTagProps) => (
  <div>
    <p className="font-serif text-[21px] leading-none sm:text-[23px]">
      <span className={tone === 'dark' ? 'text-on-dark' : 'text-gold'}>{formatVnd(amountVnd)}</span>{' '}
      <span className={`text-[13px] ${tone === 'dark' ? 'text-on-dark-muted' : 'text-ink'}`}>VND</span>
    </p>
    {note && (
      <p className={`mt-1 text-[11.5px] ${tone === 'dark' ? 'text-on-dark-muted' : 'text-muted'}`}>
        {note}
      </p>
    )}
  </div>
);
