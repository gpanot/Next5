'use client';

import { useState } from 'react';
import type { BatchItemDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { Dialog } from '../../ui/Dialog';
import { Field } from '../../ui/Field';
import { Textarea } from '../../ui/Textarea';

export type RedoReason = 'not_like_me' | 'product_mismatch' | 'bad_quality' | 'other';

const REASONS: Record<'brand' | 'shop', readonly { value: RedoReason; label: string }[]> = {
  brand: [
    { value: 'not_like_me', label: 'Doesn’t look like me' },
    { value: 'bad_quality', label: 'Bad pose or hands' },
    { value: 'other', label: 'Wrong vibe / other' },
  ],
  shop: [
    { value: 'product_mismatch', label: 'Doesn’t match product' },
    { value: 'not_like_me', label: 'Doesn’t look like me/model' },
    { value: 'bad_quality', label: 'Bad pose or hands' },
    { value: 'other', label: 'Other' },
  ],
};

type RedoDialogProps = {
  item: BatchItemDto | null;
  product: 'brand' | 'shop';
  highRes: boolean;
  onClose: () => void;
  onConfirm: (reason: RedoReason, note: string) => Promise<void>;
};

export const RedoDialog = ({ item, product, highRes, onClose, onConfirm }: RedoDialogProps) => {
  const [reason, setReason] = useState<RedoReason>(REASONS[product][0]?.value ?? 'other');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!item) return null;
  const free = item.freeRedosLeft > 0;

  return (
    <Dialog open onClose={onClose} title="Redo this photo" description={free ? `Free redo · ${item.freeRedosLeft} left for this photo` : `Uses ${highRes ? 2 : 1} photo${highRes ? 's' : ''} from your balance`}>
      <div className="flex flex-col gap-4">
        <Field label="What should we fix?">
          <ChipGroup options={REASONS[product]} value={reason} onChange={(v) => setReason(v as RedoReason)} />
        </Field>
        <Field label="Anything specific?" htmlFor="redo-note" helper="Optional">
          <Textarea id="redo-note" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. hair should be shorter" />
        </Field>
        <div className="flex justify-end gap-2">
          <AppButton variant="ghost" onClick={onClose}>Cancel</AppButton>
          <AppButton loading={busy} onClick={async () => { setBusy(true); await onConfirm(reason, note); setBusy(false); }}>Redo photo</AppButton>
        </div>
      </div>
    </Dialog>
  );
};
