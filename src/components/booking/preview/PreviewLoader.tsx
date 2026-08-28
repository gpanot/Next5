'use client';

type PreviewLoaderProps = {
  label: string;
  note?: string;
  uploadedPhoto: string;
};

/** Shared wait screen for the real generation phases — the customer's own photo
 *  pulsing is a far better progress signal than an abstract spinner. */
export const PreviewLoader = ({ label, note, uploadedPhoto }: PreviewLoaderProps) => (
  <div className="flex min-h-full flex-col items-center justify-center gap-7 py-12 text-center">
    <div className="relative h-24 w-24">
      <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
      <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={uploadedPhoto} alt="" className="h-full w-full rounded-full object-cover" />
      </span>
    </div>

    <div>
      <p className="label-caps text-[10px] font-medium text-accent-strong" aria-live="polite">
        {label}
      </p>

      <div className="mt-3 flex justify-center gap-1">
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>

      {note && <p className="mt-4 text-[11.5px] text-muted">{note}</p>}
    </div>
  </div>
);
