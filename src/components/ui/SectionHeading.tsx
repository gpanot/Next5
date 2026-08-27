type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export const SectionHeading = ({ title, subtitle, className = '' }: SectionHeadingProps) => (
  <div className={`text-center ${className}`}>
    <h2 className="font-serif text-[26px] leading-tight font-normal tracking-[0.1em] text-ink uppercase sm:text-[32px] lg:text-[34px]">
      {title}
    </h2>
    {subtitle && <p className="mt-3 text-[12.5px] text-muted sm:text-[13.5px]">{subtitle}</p>}
  </div>
);
