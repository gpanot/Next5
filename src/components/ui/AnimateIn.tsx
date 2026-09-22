'use client';

import { createElement, useEffect, useRef, useState } from 'react';

/**
 * Scroll-triggered entrance animation.
 * The element fades up (opacity + translateY) when it enters the viewport.
 * Automatically skipped when the user prefers reduced motion.
 *
 * @param delay  — ms to wait after entering viewport before starting the animation
 * @param as     — HTML tag to render (default: "div")
 */
export const AnimateIn = ({
  children,
  className = '',
  delay = 0,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: string;
}) => {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Instantly show when user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let timerId: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (delay) {
            timerId = setTimeout(() => setVisible(true), delay);
          } else {
            setVisible(true);
          }
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timerId);
    };
  }, [delay]);

  return createElement(
    as,
    {
      ref,
      className: [
        className,
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
      ]
        .filter(Boolean)
        .join(' '),
    },
    children,
  );
};
