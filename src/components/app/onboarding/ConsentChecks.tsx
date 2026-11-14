'use client';

import Link from 'next/link';
import { Checkbox } from '../../ui/Checkbox';

type ConsentChecksProps = {
  labels: boolean;
  terms: boolean;
  onLabels: (v: boolean) => void;
  onTerms: (v: boolean) => void;
};

/** The two required consents (AI labels + Terms/Privacy/AI & face data), shown once per account. */
export const ConsentChecks = ({ labels, terms, onLabels, onTerms }: ConsentChecksProps) => (
  <div className="flex flex-col gap-4 border-t border-app-line pt-5">
    <p className="text-[13px] text-app-muted">A couple of things to confirm before we start.</p>
    <Checkbox checked={labels} onChange={onLabels} label={
      <span className="text-[14px] text-app-ink">
        <strong className="font-semibold">I understand my photos are AI-generated.</strong> Every file carries an AI label, and I’ll follow platform rules when posting.
      </span>
    } />
    <Checkbox checked={terms} onChange={onTerms} label={
      <span className="text-[14px] text-app-ink">I agree to the Next5 <Link href="/legal/terms" target="_blank" className="text-app-accent underline">Terms</Link>, <Link href="/legal/privacy" target="_blank" className="text-app-accent underline">Privacy Policy</Link> and <Link href="/legal/ai-and-face-data" target="_blank" className="text-app-accent underline">AI & face data</Link> notice.</span>
    } />
  </div>
);
