'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { sessionTokenStore } from '../../../lib/localStore';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';

// ─── Confirmation dialog ──────────────────────────────────────────────────────

type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  /** The user must type this exact string to enable the confirm button. */
  confirmPhrase: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
};

const ConfirmDialog = ({ title, body, confirmLabel, confirmPhrase, onCancel, onConfirm, busy }: ConfirmDialogProps) => {
  const [typed, setTyped] = useState('');
  const ready = typed.trim().toLowerCase() === confirmPhrase.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-app-line bg-app-panel shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-app-line px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </span>
          <p className="text-[15px] font-semibold text-app-ink">{title}</p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-[13px] text-app-muted leading-relaxed">{body}</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-app-ink">
              Type <span className="font-mono text-red-600">{confirmPhrase}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              placeholder={confirmPhrase}
              className="h-10 rounded-xl border border-app-line bg-app-sunken px-3 text-[13px] text-app-ink placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-app-accent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-app-line px-5 py-4">
          <AppButton variant="secondary" size="md" onClick={onCancel} disabled={busy}>
            Cancel
          </AppButton>
          <AppButton variant="danger" size="md" onClick={onConfirm} disabled={!ready} loading={busy}>
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
};

// ─── Danger zone card ─────────────────────────────────────────────────────────

type Dialog = 'data' | 'account' | null;

export const DangerZoneCard = () => {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { setDialog(null); setError(null); };

  const handleDeleteData = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/app/me/data', { method: 'DELETE' });
      close();
      // Reload the app so workspace context is re-initialised from scratch.
      window.location.href = '/app';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/app/me', { method: 'DELETE' });
      // Clear the session token and redirect to home.
      sessionTokenStore.set(null);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <CardBody className="flex flex-col gap-4">
          <p className="text-[16px] font-semibold text-app-ink">Danger zone</p>

          {/* Delete all data */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-app-line p-4">
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-medium text-app-ink">Delete all my data</p>
              <p className="text-[12px] text-app-muted">
                Permanently removes all your photos, batches, products, sets and workspace settings.
                Your login is kept so you can start fresh.
              </p>
            </div>
            <AppButton
              variant="secondary"
              size="sm"
              className="mt-3 shrink-0 border-red-300 text-red-600 hover:bg-red-50 sm:mt-0 sm:ml-4"
              onClick={() => { setError(null); setDialog('data'); }}
            >
              Delete all data
            </AppButton>
          </div>

          {/* Delete account */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-red-200 bg-red-50/40 p-4">
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-medium text-red-700">Delete my account</p>
              <p className="text-[12px] text-app-muted">
                Permanently deletes all your data AND your account. This cannot be undone.
              </p>
            </div>
            <AppButton
              variant="danger"
              size="sm"
              className="mt-3 shrink-0 sm:mt-0 sm:ml-4"
              onClick={() => { setError(null); setDialog('account'); }}
            >
              Delete account
            </AppButton>
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </CardBody>
      </Card>

      {/* Confirmation dialogs */}
      {dialog === 'data' && (
        <ConfirmDialog
          title="Delete all your data?"
          body="This will permanently delete all your photos, batches, products, influencers, sets and workspace settings. Your login email is kept — you can create a new workspace afterwards. This action cannot be undone."
          confirmLabel="Yes, delete all data"
          confirmPhrase="delete my data"
          onCancel={close}
          onConfirm={handleDeleteData}
          busy={busy}
        />
      )}
      {dialog === 'account' && (
        <ConfirmDialog
          title="Delete your account?"
          body="This will permanently delete all your data AND your Next5 account. You will be logged out immediately and will not be able to recover your account or data. This action cannot be undone."
          confirmLabel="Yes, delete my account"
          confirmPhrase="delete my account"
          onCancel={close}
          onConfirm={handleDeleteAccount}
          busy={busy}
        />
      )}
    </>
  );
};
