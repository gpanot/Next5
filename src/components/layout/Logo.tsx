type LogoProps = {
  className?: string;
};

export const Logo = ({ className = 'text-white' }: LogoProps) => (
  <a href="#top" className={`block leading-none ${className}`} aria-label="NEXT5 Photos — home">
    <span className="font-serif text-2xl font-medium tracking-[0.22em] sm:text-[26px]">NEXT5</span>
    <span className="label-caps mt-1 block text-[8px] opacity-80">Photos</span>
  </a>
);
