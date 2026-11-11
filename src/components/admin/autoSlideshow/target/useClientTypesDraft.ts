'use client';

import { useState } from 'react';
import { cleanIndustries, MAX_CUSTOMER_INDUSTRIES } from '../../../../lib/customerIndustries';

/** Edits to a list of client types before saving. Follows `saved` until the first edit. Text left in the box counts. */
export const useClientTypesDraft = (saved: string[]) => {
  const [edited, setEdited] = useState<string[] | null>(null);
  const [text, setText] = useState('');
  const names = edited ?? saved;
  const withText = cleanIndustries([...names, text]);
  return {
    names,
    text,
    setText,
    tooMany: withText.length > MAX_CUSTOMER_INDUSTRIES,
    /** The list with the box's text in it. */
    final: () => withText,
    changed: withText.join('\n') !== saved.join('\n'),
    add: (name: string) => setEdited(cleanIndustries([...names, name]).slice(0, MAX_CUSTOMER_INDUSTRIES)),
    addText: () => {
      setEdited(withText.slice(0, MAX_CUSTOMER_INDUSTRIES));
      setText('');
    },
    remove: (name: string) => setEdited(names.filter((n) => n !== name)),
    /** After a save: shows the saved list from now on. */
    reset: () => {
      setEdited(null);
      setText('');
    },
  };
};

export type ClientTypesDraft = ReturnType<typeof useClientTypesDraft>;
