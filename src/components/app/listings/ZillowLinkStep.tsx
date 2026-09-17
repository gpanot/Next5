'use client';

import { ClipboardPaste, Link2, Upload } from 'lucide-react';
import { useState } from 'react';
import { parseZillowUrl } from '../../../lib/listingPhotos';
import { AppButton } from '../../ui/AppButton';
import { Checkbox } from '../../ui/Checkbox';

type Props = {
  busy: boolean;
  error: string | null;
  onSubmit: (url: string) => void;
  onUploadInstead: () => void;
};

/** Paste the Zillow link and say she represents the home. Upload stays one tap away — not every agent uses Zillow. */
export const ZillowLinkStep = ({ busy, error, onSubmit, onUploadInstead }: Props) => {
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [attest, setAttest] = useState(false);
  const valid = parseZillowUrl(url) !== null;
  const hint = touched && url.trim() && !valid ? 'Open the home on Zillow, then copy that link.' : null;

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      setTouched(true);
    } catch {
      document.getElementById('zillow-link')?.focus();
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (valid && attest) onSubmit(url);
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="zillow-link" className="flex items-center gap-2 text-[15px] font-semibold text-app-ink">
          <Link2 aria-hidden className="h-4 w-4 text-app-accent" /> Paste your Zillow link
        </label>
        <p className="text-[13px] text-app-muted">We add all the photos of your listing. Then you remove the ones you don’t want to be in.</p>
      </div>
      <div className="flex gap-2">
        <input
          id="zillow-link"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="zillow.com/homedetails/…"
          aria-invalid={Boolean(hint) || undefined}
          className="h-11 min-w-0 flex-1 rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink placeholder:text-app-muted transition-colors duration-200 focus:border-app-accent focus:outline-none"
        />
        <AppButton type="button" variant="secondary" size="md" className="h-11" iconLeft={<ClipboardPaste aria-hidden className="h-4 w-4" />} onClick={() => void paste()}>
          Paste
        </AppButton>
      </div>
      {(hint ?? error) && <p className="text-[13px] text-app-danger" role="alert">{hint ?? error}</p>}
      <Checkbox checked={attest} onChange={setAttest} label={<span className="text-[13px] text-app-ink">I represent this property.</span>} />
      <AppButton type="submit" size="lg" fullWidth loading={busy} disabled={!valid || !attest}>Add property</AppButton>

      <div className="flex items-center gap-3 text-[12px] text-app-muted">
        <span className="h-px flex-1 bg-app-line" /> or <span className="h-px flex-1 bg-app-line" />
      </div>
      <AppButton type="button" variant="ghost" fullWidth iconLeft={<Upload aria-hidden className="h-4 w-4" />} onClick={onUploadInstead}>
        Upload photos instead
      </AppButton>
    </form>
  );
};
