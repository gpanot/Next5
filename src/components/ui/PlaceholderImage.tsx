'use client';

import { useState } from 'react';
import { PhotoIcon } from './Icons';

type PlaceholderImageProps = {
  src: string;
  fallbackSrc?: string;
  alt: string;
  label?: string;
  className?: string;
  imageClassName?: string;
  tone?: 'light' | 'dark';
  loading?: 'lazy' | 'eager';
};

const toneStyles: Record<'light' | 'dark', string> = {
  light: 'bg-[linear-gradient(135deg,#efe6da_0%,#e2d3c3_45%,#d8c6b4_100%)] text-[#8a7663]',
  dark: 'bg-[linear-gradient(135deg,#3a322b_0%,#282220_45%,#1d1815_100%)] text-[#a2917f]',
};

export const PlaceholderImage = ({
  src,
  fallbackSrc,
  alt,
  label,
  className = '',
  imageClassName = '',
  tone = 'light',
  loading = 'lazy',
}: PlaceholderImageProps) => {
  const [state, setState] = useState({ slot: src, source: src, failed: false });

  if (state.slot !== src) {
    setState({ slot: src, source: src, failed: false });
  }

  const handleError = () =>
    setState((current) =>
      fallbackSrc && current.source !== fallbackSrc
        ? { ...current, source: fallbackSrc }
        : { ...current, failed: true },
    );

  return (
    <div className={`overflow-hidden ${className}`}>
      {!state.failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.source}
          alt={alt}
          loading={loading}
          onError={handleError}
          className={`h-full w-full object-cover ${imageClassName}`}
        />
      )}

      {state.failed && (
        <div
          role="img"
          aria-label={alt}
          className={`flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center ${toneStyles[tone]}`}
        >
          <PhotoIcon className="h-6 w-6 opacity-70" />
          {label && (
            <span className="label-caps text-[9px] leading-relaxed font-medium opacity-80">
              {label}
            </span>
          )}
          <span className="max-w-full truncate text-[9px] tracking-wide opacity-55">{src}</span>
        </div>
      )}
    </div>
  );
};
