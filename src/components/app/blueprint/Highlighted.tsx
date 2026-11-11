import { Fragment } from 'react';
import { PLACEHOLDER_RE } from '../../../lib/scriptGenerator/types';

/** Text with every [placeholder] shown in a warning style. */
export const Highlighted = ({ text }: { text: string }) => {
  const parts = text.split(new RegExp(`(${PLACEHOLDER_RE.source})`, 'g'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-app-warning/20 px-1 font-medium text-app-ink">{part}</mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
};
