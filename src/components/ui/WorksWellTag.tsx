import { ThumbsUp } from 'lucide-react';

/** Small chip on the styles that perform best, so picking one is easy. */
export const WorksWellTag = ({ className = '' }: { className?: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-md bg-app-accent-soft px-1.5 py-px text-[10px] font-medium text-app-accent ${className}`}>
    <ThumbsUp aria-hidden className="h-2.5 w-2.5" />
    Works well
  </span>
);
