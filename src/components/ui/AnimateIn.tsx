'use client';

import { useEffect, useRef, useState, type ElementType } from 'react';

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
    // Reduced motion: shown at once by the motion-reduce classes, nothing to watch
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

  const Tag = as as ElementType;
  return (
    <Tag
      ref={ref}
      className={[
        className,
        'transition-[opacity,transform] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
};
