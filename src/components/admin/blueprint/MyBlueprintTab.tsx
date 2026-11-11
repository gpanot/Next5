'use client';

import { BlueprintPage } from '../../app/blueprint/BlueprintPage';
import { natSerif, natTight } from './natFonts';

/** Admin › Jun Yuh › My Blueprint: a personal test of the Jun Yuh content method, in the Brand Nat look. */
export function MyBlueprintTab({ token }: { token: string }) {
  return (
    <div data-surface="brand-nat" className={`${natTight.variable} ${natSerif.variable} min-h-full rounded-3xl px-8 py-8 font-sans`}>
      <BlueprintPage token={token} />
    </div>
  );
}
