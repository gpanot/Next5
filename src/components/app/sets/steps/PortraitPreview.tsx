'use client';

type Props = { url: string; alt: string; badge?: string; actions?: React.ReactNode };

/** The chosen face, large enough to judge, with its actions below. */
export const PortraitPreview = ({ url, alt, badge, actions }: Props) => (
  <div className="flex flex-col items-center gap-3">
    <div className="relative aspect-[3/4] w-44 overflow-hidden rounded-2xl bg-app-sunken shadow-sm ring-1 ring-app-line sm:w-52">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
      <img src={url} alt={alt} className="h-full w-full object-cover object-top" />
      {badge && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">{badge}</span>}
    </div>
    {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
  </div>
);
