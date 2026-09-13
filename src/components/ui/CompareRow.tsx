import { ImageOff } from 'lucide-react';

type CompareRowProps = {
  originalSrc?: string;
  originalAlt?: string;
  generatedImages: { src?: string; alt: string }[];
  label?: string;
  className?: string;
};

/**
 * Product original pinned left, scrollable generated shots right.
 * Used in Shop Studio batch results.
 */
export const CompareRow = ({
  originalSrc,
  originalAlt = 'Original product photo',
  generatedImages,
  label,
  className = '',
}: CompareRowProps) => (
  <div className={['rounded-2xl border border-app-line bg-app-panel overflow-hidden', className].join(' ')}>
    {label && (
      <div className="border-b border-app-line px-4 py-3">
        <p className="text-[13px] font-medium text-app-ink">{label}</p>
      </div>
    )}
    <div className="flex gap-3 overflow-x-auto p-4">
      {/* Original — pinned */}
      <div className="shrink-0 w-28">
        <p className="mb-1.5 text-[10px] label-caps text-app-muted">Original</p>
        <div className="aspect-[3/4] w-28 overflow-hidden rounded-xl border border-app-line bg-app-sunken">
          {originalSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={originalSrc} alt={originalAlt} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-6 w-6 text-app-muted" />
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="shrink-0 w-px bg-app-line self-stretch" aria-hidden="true" />

      {/* Generated shots — scrollable */}
      <div className="flex gap-3">
        {generatedImages.map(({ src, alt }, i) => (
          <div key={i} className="shrink-0 w-28">
            <p className="mb-1.5 text-[10px] label-caps text-app-muted">Shot {i + 1}</p>
            <div className="aspect-[3/4] w-28 overflow-hidden rounded-xl border border-app-line bg-app-sunken">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={alt} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-6 w-6 text-app-muted" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
