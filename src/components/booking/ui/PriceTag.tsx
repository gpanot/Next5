import { formatVnd } from '../../../lib/format';

type PriceTagProps = {
  amountVnd: number;
  /** Shown struck through, ahead of `amountVnd`, when a discount is applied. */
  originalAmountVnd?: number;
  note?: string;
  tone?: 'light' | 'dark';
};

export const PriceTag = ({ amountVnd, originalAmountVnd, note, tone = 'light' }: PriceTagProps) => (
  <div>
    <p className="font-serif text-[21px] leading-none sm:text-[23px]">
      {originalAmountVnd && originalAmountVnd > amountVnd && (
        <span
          className={`mr-2 text-[14px] line-through ${tone === 'dark' ? 'text-on-dark-muted' : 'text-muted'}`}
        >
          {formatVnd(originalAmountVnd)}
        </span>
      )}
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
