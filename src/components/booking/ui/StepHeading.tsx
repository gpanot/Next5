type StepHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export const StepHeading = ({ eyebrow, title, subtitle }: StepHeadingProps) => (
  <header>
    {eyebrow && (
      <p className="label-caps text-[9.5px] font-medium text-accent-strong">{eyebrow}</p>
    )}
    <h2 className="mt-2 font-serif text-[26px] leading-tight tracking-[0.08em] text-ink uppercase sm:text-[30px]">
      {title}
    </h2>
    {subtitle && <p className="mt-2 text-[13px] text-muted sm:text-[13.5px]">{subtitle}</p>}
  </header>
);
