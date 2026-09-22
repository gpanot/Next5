'use client';

import { Check, ChevronDown, Link2, Loader2, PartyPopper, X } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { isImportBusy, useListingImport } from '../../../hooks/useListingImport';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { parseZillowUrl } from '../../../lib/listingPhotos';
import { quickstartStore } from '../../../lib/localStore';
import type { CalendarDto } from '../../../types/business/calendar';
import type { IntegrationsDto, SocialProviderDto } from '../../../types/business/integrations';
import type { ListingDto } from '../../../types/business/listings';
import type { MeDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { Dialog } from '../../ui/Dialog';
import { AppLink as Link } from '../shell/AppLink';
import { useAppRouter } from '../shell/AppLink';
import { useWorkspace } from '../shell/WorkspaceProvider';

// ─── Persisted state ────────────────────────────────────────────────────────

type SavedState = {
  workspaceId: string | null;
  step2Done: boolean;
  step3Done: boolean;
  dismissed: boolean;
};

const EMPTY: SavedState = { workspaceId: null, step2Done: false, step3Done: false, dismissed: false };

const parseState = (raw: string | null | undefined): SavedState => {
  if (!raw) return EMPTY;
  try {
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<SavedState>) };
  } catch {
    return EMPTY;
  }
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const StepCheckmark = ({ done }: { done: boolean }) => (
  <span
    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
      done ? 'border-emerald-500 bg-emerald-500' : 'border-app-muted/60'
    }`}
  >
    {done && <Check aria-hidden className="h-3 w-3 text-white" />}
  </span>
);

// ─── Import status dialog ────────────────────────────────────────────────────

type ImportDialogProps = {
  open: boolean;
  ready: boolean;
  error: string | null;
  onClose: () => void;
  onGoToCreate: () => void;
};

const ImportStatusDialog = ({ open, ready, error, onClose, onGoToCreate }: ImportDialogProps) => (
  <Dialog
    open={open}
    onClose={error ? onClose : () => undefined}
    title={ready ? 'Your listing is ready' : 'Getting your listing ready…'}
  >
    <div className="flex flex-col gap-5">
      {/* Status indicator */}
      <div className="flex items-start gap-3">
        {ready ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Check aria-hidden className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </span>
        ) : error ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-danger/10">
            <X aria-hidden className="h-5 w-5 text-app-danger" />
          </span>
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent/10">
            <Loader2 aria-hidden className="h-5 w-5 animate-spin text-app-accent" />
          </span>
        )}
        <div className="flex flex-col gap-1">
          {error ? (
            <p className="text-[14px] text-app-danger">{error}</p>
          ) : ready ? (
            <p className="text-[14px] text-app-ink">
              Your listing photos are in — head to the Create page to pick a few and see your first results.
            </p>
          ) : (
            <>
              <p className="text-[14px] text-app-ink">
                We&apos;re pulling your listing photos from Zillow. This takes about 20 seconds.
              </p>
              <p className="mt-1 text-[13px] text-app-muted">
                We recommend selecting just a few photos to start so you can see the results quickly.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {ready && (
        <AppButton fullWidth onClick={onGoToCreate}>
          Select photos &amp; create →
        </AppButton>
      )}
      {error && (
        <AppButton variant="secondary" fullWidth onClick={onClose}>
          Close
        </AppButton>
      )}
      {!ready && !error && (
        <p className="text-center text-[12px] text-app-muted">
          Hang tight — you&apos;ll be taken to the Create page automatically.
        </p>
      )}
    </div>
  </Dialog>
);

// ─── Main component ──────────────────────────────────────────────────────────

export const QuickstartCard = ({ me }: { me: MeDto }) => {
  const raw = quickstartStore.useValue();
  const parsed = parseState(raw);
  const router = useAppRouter();
  const { href } = useWorkspace();

  // Reset if workspace changed (new user or studio switch).
  const workspaceId = me.workspace?.id ?? null;
  const saved: SavedState =
    parsed.workspaceId !== null && parsed.workspaceId !== workspaceId
      ? { ...EMPTY, workspaceId }
      : { ...parsed, workspaceId };

  const save = (patch: Partial<Omit<SavedState, 'workspaceId'>>) =>
    quickstartStore.set(JSON.stringify({ ...saved, ...patch, workspaceId }));

  // ── Remote data ─────────────────────────────────────────────────────────
  const { data: calendarData, refresh: refreshCalendar } = useApi<CalendarDto>('/api/app/calendar');
  const { data: integrationsData } = useApi<IntegrationsDto>('/api/app/integrations?product=brand');

  // ── Step states ─────────────────────────────────────────────────────────
  const step1Done = Boolean(me.workspace?.hasIdentity);
  const step2Done = saved.step2Done;
  // Done when the user has successfully autofilled at least once (photos were available).
  const step3Done = saved.step3Done || (calendarData?.progress.planned ?? 0) > 0;
  const step4Done = (integrationsData?.connections.length ?? 0) > 0;

  const stepsCompleted = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;
  const allDone = stepsCompleted === 4;

  // ── Step 2: asset import ─────────────────────────────────────────────────
  const [assetUrl, setAssetUrl] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [activeListing, setActiveListing] = useState<ListingDto | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importReady, setImportReady] = useState(false);
  // listingId held so we can build the Create-page deep link on navigate.
  const [importedListingId, setImportedListingId] = useState<string | null>(null);

  useListingImport(activeListing, (result) => {
    setImportBusy(false);
    setActiveListing(null);
    if (result.error) {
      setImportError(result.error);
      setImportReady(false);
    } else {
      save({ step2Done: true });
      setImportReady(true);
      // Auto-navigate to Create page with the listing pre-selected.
      const id = importedListingId ?? result.listing?.id ?? null;
      if (id) {
        router.push(href(`/create?listing=${id}`));
      }
    }
  });

  const handleImport = async () => {
    const url = assetUrl.trim();
    if (!url) return;
    // Client-side guard: only Zillow URLs are supported by the import endpoint.
    if (!parseZillowUrl(url)) {
      setImportError(
        'Paste a Zillow listing URL (zillow.com/homedetails/…). Shop sellers: use the Create page to add product photos.',
      );
      return;
    }
    setImportBusy(true);
    setImportError(null);
    setImportReady(false);
    setImportDialogOpen(true);
    try {
      const res = await apiFetch<{ listing: ListingDto }>('/api/app/listings/import', {
        method: 'POST',
        json: { url, attest: true },
      });
      setImportedListingId(res.listing.id);
      if (!isImportBusy(res.listing)) {
        // Already ready (same ZPID re-imported) — navigate immediately.
        save({ step2Done: true });
        setImportReady(true);
        setImportBusy(false);
        router.push(href(`/create?listing=${res.listing.id}`));
      } else {
        setActiveListing(res.listing);
        // importBusy stays true; polling in useListingImport will resolve it.
      }
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : 'Could not import. Try again.');
      setImportBusy(false);
      setImportReady(false);
    }
  };

  const handleGoToCreate = () => {
    if (importedListingId) {
      router.push(href(`/create?listing=${importedListingId}`));
    }
    setImportDialogOpen(false);
  };

  // ── Step 3: autofill calendar ────────────────────────────────────────────
  const [autofillBusy, setAutofillBusy] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [noPhotos, setNoPhotos] = useState(false);

  const handleAutofill = async () => {
    setAutofillBusy(true);
    setAutofillError(null);
    setNoPhotos(false);
    try {
      const sch = calendarData?.schedule;
      const result = await apiFetch<CalendarDto>('/api/app/calendar', {
        method: 'PUT',
        json: {
          active: sch?.active ?? true,
          weekdays: sch?.weekdays ?? [2, 4, 6],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          autoFill: sch?.autoFill ?? true,
          autopilot: false,
          weeklyDigest: sch?.weeklyDigest ?? true,
          platform: sch?.platform ?? 'instagram',
        },
      });
      if ((result.progress.planned ?? 0) === 0) {
        setNoPhotos(true);
      } else {
        save({ step3Done: true });
      }
      refreshCalendar();
    } catch (err) {
      setAutofillError(err instanceof ApiError ? err.message : 'Could not fill calendar. Try again.');
    } finally {
      setAutofillBusy(false);
    }
  };

  // ── Step 4: connect social ───────────────────────────────────────────────
  const [connectBusy, setConnectBusy] = useState<SocialProviderDto | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = async (provider: SocialProviderDto) => {
    setConnectBusy(provider);
    setConnectError(null);
    try {
      const res = await apiFetch<{ url: string }>(`/api/app/integrations/${provider}`, {
        method: 'POST',
        json: { product: 'brand' },
      });
      window.location.href = res.url;
    } catch (err) {
      setConnectError(err instanceof ApiError ? err.message : 'Could not start the connection.');
      setConnectBusy(null);
    }
  };

  // ── Collapsed / dismissed view ───────────────────────────────────────────
  if (saved.dismissed) {
    const planned = calendarData?.progress.planned ?? 0;
    const month = new Date().toLocaleDateString('en-US', { month: 'long' });
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-app-line bg-app-panel px-4 py-3">
        <p className="text-[13px] text-app-muted">
          {allDone
            ? `Calendar active · ${planned} post${planned !== 1 ? 's' : ''} ready for ${month}`
            : `Quickstart · ${stepsCompleted}/4 steps done`}
        </p>
        <AppButton variant="ghost" size="sm" onClick={() => save({ dismissed: false })}>
          Show checklist
        </AppButton>
      </div>
    );
  }

  // ── All-done completion banner ───────────────────────────────────────────
  if (allDone) {
    const planned = calendarData?.progress.planned ?? 0;
    const month = new Date().toLocaleDateString('en-US', { month: 'long' });
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
        <p className="flex items-center gap-2 text-[14px] font-medium text-emerald-700 dark:text-emerald-400">
          <PartyPopper aria-hidden className="h-4 w-4" />
          Calendar active · {planned} post{planned !== 1 ? 's' : ''} ready for {month}
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => save({ dismissed: true })}
          className="text-app-muted transition-colors duration-200 hover:text-app-ink"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ── Full checklist ───────────────────────────────────────────────────────
  return (
    <>
      {/* Import status dialog — shown while Zillow is being scraped */}
      <ImportStatusDialog
        open={importDialogOpen}
        ready={importReady}
        error={importError}
        onClose={() => setImportDialogOpen(false)}
        onGoToCreate={handleGoToCreate}
      />

      <div className="rounded-2xl border border-app-line bg-app-panel">
        {/* Card header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[17px] font-semibold text-app-ink">Get your 30-day calendar ready</p>
            <p className="mt-0.5 text-[13px] text-app-muted">
              Complete these quick steps to generate your posts and fill your calendar.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
            {/* Progress badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                stepsCompleted > 0 ? 'bg-app-accent/10 text-app-accent' : 'bg-app-sunken text-app-muted'
              }`}
            >
              {stepsCompleted}/4 completed
            </span>
            {/* Progress bar */}
            <div
              className="h-1.5 w-24 overflow-hidden rounded-full bg-app-sunken"
              role="progressbar"
              aria-valuenow={stepsCompleted}
              aria-valuemin={0}
              aria-valuemax={4}
            >
              <div
                className="h-full rounded-full bg-app-accent transition-[width] duration-500"
                style={{ width: `${(stepsCompleted / 4) * 100}%` }}
              />
            </div>
            {/* Collapse */}
            <button
              type="button"
              aria-label="Collapse quickstart"
              onClick={() => save({ dismissed: true })}
              className="mt-0.5 text-app-muted transition-colors duration-200 hover:text-app-ink"
            >
              <ChevronDown aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Step list */}
        <ul className="divide-y divide-app-line border-t border-app-line">
          {/* ── Step 1: Selfie ────────────────────────────────────────────── */}
          <li className="flex items-start gap-4 px-5 py-4">
            <StepCheckmark done={step1Done} />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[14px] font-medium leading-snug ${step1Done ? 'text-app-muted line-through' : 'text-app-ink'}`}
              >
                1. Upload base selfie / create AI headshot
              </p>
              {!step1Done && (
                <Link
                  href="/app/start/brand"
                  className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-xl bg-app-cta px-3 text-[12px] font-medium text-app-cta-ink transition-opacity duration-200 hover:opacity-90"
                >
                  Upload selfie →
                </Link>
              )}
            </div>
          </li>

          {/* ── Step 2: Import listing / asset ───────────────────────────── */}
          <li className="flex items-start gap-4 px-5 py-4">
            <StepCheckmark done={step2Done} />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[14px] font-medium leading-snug ${step2Done ? 'text-app-muted line-through' : 'text-app-ink'}`}
              >
                2. Import your listing or product asset
              </p>
              {!step2Done && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Link2
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-muted/70"
                      />
                      <input
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        value={assetUrl}
                        onChange={(e) => {
                          setAssetUrl(e.target.value);
                          setImportError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleImport();
                        }}
                        placeholder="Paste Zillow URL or product link (or upload photo)..."
                        className="h-10 w-full rounded-xl border border-app-line bg-app-panel py-2 pl-8 pr-3 text-[13px] text-app-ink placeholder:text-app-muted/60 transition-colors duration-200 focus:border-app-accent focus:outline-none"
                      />
                    </div>
                    <AppButton
                      size="sm"
                      loading={importBusy && !importDialogOpen}
                      disabled={!assetUrl.trim() || importBusy}
                      onClick={() => void handleImport()}
                    >
                      Import Asset →
                    </AppButton>
                  </div>
                  {importError && !importDialogOpen && (
                    <p className="text-[12px] text-app-danger" role="alert">
                      {importError}
                    </p>
                  )}
                  <p className="text-[11px] text-app-muted">
                    Realtors: paste Zillow listing URL · Shop sellers: paste product/shop link or photo
                  </p>
                </div>
              )}
            </div>
          </li>

          {/* ── Step 3: Autofill calendar ─────────────────────────────────── */}
          <li className="flex items-start gap-4 px-5 py-4">
            <StepCheckmark done={step3Done} />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[14px] font-medium leading-snug ${step3Done ? 'text-app-muted line-through' : 'text-app-ink'}`}
              >
                3. Generate 30-day content calendar &amp; UGC video
              </p>
              {!step3Done && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <AppButton
                    size="sm"
                    loading={autofillBusy}
                    disabled={autofillBusy || (!step1Done && !step2Done)}
                    onClick={() => void handleAutofill()}
                    className="w-fit"
                  >
                    Autofill Calendar →
                  </AppButton>
                  {autofillError && (
                    <p className="text-[12px] text-app-danger" role="alert">
                      {autofillError}
                    </p>
                  )}
                  {noPhotos && !autofillError && (
                    <p className="text-[12px] text-app-muted">
                      No photos yet — create content first, then come back to fill your calendar.
                    </p>
                  )}
                  {!step1Done && !step2Done && (
                    <p className="text-[11px] text-app-muted">Complete Step 1 or 2 first to unlock.</p>
                  )}
                </div>
              )}
            </div>
          </li>

          {/* ── Step 4: Connect social ────────────────────────────────────── */}
          <li className="flex items-start gap-4 px-5 py-4">
            <StepCheckmark done={step4Done} />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[14px] font-medium leading-snug ${step4Done ? 'text-app-muted line-through' : 'text-app-ink'}`}
              >
                4. Connect social channels
              </p>
              {!step4Done && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex flex-wrap gap-2">
                    {(['instagram', 'tiktok'] as SocialProviderDto[]).map((provider) => {
                      const available = integrationsData?.available.includes(provider) ?? true;
                      return (
                        <AppButton
                          key={provider}
                          size="sm"
                          variant={provider === 'instagram' ? 'primary' : 'secondary'}
                          loading={connectBusy === provider}
                          disabled={!available || connectBusy !== null}
                          onClick={() => void handleConnect(provider)}
                        >
                          Connect {provider === 'instagram' ? 'Instagram' : 'TikTok'}
                        </AppButton>
                      );
                    })}
                  </div>
                  {connectError && (
                    <p className="text-[12px] text-app-danger" role="alert">
                      {connectError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </li>
        </ul>
      </div>
    </>
  );
};
