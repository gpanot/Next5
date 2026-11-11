'use client';

import { createPortal } from 'react-dom';
import { ManualWizard } from './ManualWizard';
import { WIZARD_FRAME } from './wizardFrame';

type Props = { token: string; runId: string; draftId: string; onClose: (changed: boolean) => void };

/** The wizard on its own sheet, to pick up a draft from its Draft card. A bottom sheet on phones. */
export function ManualWizardSheet({ token, runId, draftId, onClose }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => onClose(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-campaign-title"
        onClick={(e) => e.stopPropagation()}
        className={WIZARD_FRAME}
      >
        <ManualWizard token={token} runId={runId} draftId={draftId} castId={null} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
