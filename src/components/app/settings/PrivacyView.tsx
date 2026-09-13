'use client';

import { ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { Dialog } from '../../ui/Dialog';
import { Field } from '../../ui/Field';
import { TextInput } from '../../ui/TextInput';
import { useWorkspace } from '../shell/WorkspaceProvider';

export const PrivacyView = () => {
  const { me, refresh } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    try {
      const data = await apiFetch<{ deleted: number }>('/api/app/privacy/delete-identity', { method: 'POST', json: {} });
      setResult(`Deleted ${data.deleted} photo${data.deleted === 1 ? '' : 's'}. Add new selfies whenever you want to create more photos.`);
      setOpen(false);
      setConfirm('');
      refresh();
    } catch (err) {
      setResult(err instanceof ApiError ? err.message : 'Could not delete your photos. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <CardBody className="flex gap-4">
          <ShieldCheck aria-hidden className="h-6 w-6 shrink-0 text-app-accent" />
          <div className="flex flex-col gap-2 text-[14px] text-app-muted">
            <p className="text-[16px] font-semibold text-app-ink">How we use your photos</p>
            <p>Your selfies are stored privately and used only to create your photos. They are never used to train AI models or shared with anyone.</p>
            <p>Every photo we create carries an embedded “AI-generated” label, as platforms and Vietnam’s AI law ask for images of real people.</p>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="flex flex-col gap-3">
          <p className="text-[16px] font-semibold text-app-ink">Delete my face data</p>
          <p className="text-[14px] text-app-muted">Removes every selfie and full-body photo you uploaded. Photos you already created stay in your library. To create more, you’ll need to upload new selfies.</p>
          {result && <p role="status" className="text-[14px] text-app-ink">{result}</p>}
          <div><AppButton variant="danger" iconLeft={<Trash2 className="h-4 w-4" />} onClick={() => setOpen(true)} disabled={!me?.workspace?.hasIdentity}>Delete my face data</AppButton></div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="flex flex-col gap-2">
          <p className="text-[16px] font-semibold text-app-ink">Download or delete everything</p>
          <p className="text-[14px] text-app-muted">Email <a className="font-medium text-app-accent" href="mailto:hello@next5.studio">hello@next5.studio</a> from your account address and we’ll send your data or delete your account within 7 days.</p>
        </CardBody>
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your face data?" description="This can’t be undone.">
        <div className="flex flex-col gap-4">
          <Field label='Type "DELETE" to confirm' htmlFor="confirm-delete"><TextInput id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></Field>
          <div className="flex justify-end gap-2">
            <AppButton variant="ghost" onClick={() => setOpen(false)}>Cancel</AppButton>
            <AppButton variant="danger" disabled={confirm !== 'DELETE'} loading={busy} onClick={remove}>Delete</AppButton>
          </div>
        </div>
      </Dialog>
    </>
  );
};
