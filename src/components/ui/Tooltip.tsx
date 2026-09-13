'use client';

import { useState } from 'react';

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
};

export const Tooltip = ({ content, children, className = '' }: TooltipProps) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className={['relative inline-flex', className].join(' ')}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-app-ink px-3 py-1.5 text-[11px] text-white shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  );
};
