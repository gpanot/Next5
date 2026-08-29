import type { StudioBooking } from '../../../app/api/studio/me/route';
import { BUNDLE_PERCENT } from '../booking/confirmed/UpsellOffer';
import { photoRoutes } from '../../data/routes';
import { applyDiscount, formatVnd } from '../../lib/format';
import type { DiscountOffer } from '../../types/offer';

type ShootSidebarProps = {
  shoots: StudioBooking[];
  selectedId: string | null;
  isCreating: boolean;
  activeOffer: DiscountOffer | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onClaimOffer: (offer: DiscountOffer) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const shootThumbnail = (shoot: StudioBooking): string | null =>
  shoot.photos.find((p) => p.url)?.url ?? null;

const shootStatusLabel = (shoot: StudioBooking): string => {
  if (shoot.shoot_status === 'delivered') return 'Ready';
  const ready = shoot.photos.filter((p) => p.url && p.type !== 'upload').length;
  return `${ready} of 5 ready`;
};

/** Every purchase is a dated session with a photographer — this is the list
 *  of them. Doubles as the mobile "list" pane; the parent controls which
 *  pane shows on narrow screens. */
export const ShootSidebar = ({
  shoots,
  selectedId,
  isCreating,
  activeOffer,
  onSelect,
  onCreateNew,
  onClaimOffer,
}: ShootSidebarProps) => {
  // "Complete your collection" means the studios she hasn't done yet — an
  // account-wide fact now, not tied to whichever shoot happens to be open.
  const missingRouteIds = photoRoutes
    .filter((route) => !shoots.some((s) => s.route_id === route.id))
    .map((route) => route.id);

  const claimBundle = () => {
    onClaimOffer({
      percent: BUNDLE_PERCENT,
      eligibleRouteIds: missingRouteIds,
      multiUse: true,
      label: 'Saigon Collection',
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onCreateNew}
        aria-pressed={isCreating}
        className={[
          'label-caps flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-medium transition-colors duration-200',
          isCreating ? 'bg-accent text-white' : 'bg-ink-block text-on-dark hover:bg-ink-block/85',
        ].join(' ')}
      >
        + Create another shooting
      </button>

      {activeOffer ? (
        <div className="rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3.5">
          <p className="text-[12px] text-ink">
            <span className="font-medium">{activeOffer.label}</span> discount (
            <span className="font-medium text-accent-strong">-{activeOffer.percent}%</span>) is open
            for {activeOffer.eligibleRouteIds.length} more studio
            {activeOffer.eligibleRouteIds.length === 1 ? '' : 's'}.
          </p>
        </div>
      ) : (
        missingRouteIds.length > 0 && (
          <button
            type="button"
            onClick={claimBundle}
            className="rounded-xl bg-ink-block px-4 py-3.5 text-left transition-colors duration-200 hover:bg-ink-block/85"
          >
            <span className="label-caps block text-[9px] font-medium text-on-dark-muted">
              Best value · today only
            </span>
            <span className="mt-1 block text-[12.5px] font-medium text-on-dark">
              Complete your Saigon Collection — {missingRouteIds.length} studio
              {missingRouteIds.length === 1 ? '' : 's'} left
            </span>
            <span className="mt-1 block text-[11px] text-on-dark-muted">
              {formatVnd(applyDiscount(photoRoutes[0].priceVnd, BUNDLE_PERCENT))} VND each · -{BUNDLE_PERCENT}%
            </span>
          </button>
        )
      )}

      {shoots.length > 0 && (
        <div>
          <p className="label-caps px-1 text-[9px] font-medium text-muted">Your shoots</p>
          <ul className="mt-2 space-y-1.5">
            {shoots.map((shoot) => {
              const thumbnail = shootThumbnail(shoot);
              const selected = shoot.id === selectedId && !isCreating;

              return (
                <li key={shoot.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(shoot.id)}
                    aria-pressed={selected}
                    className={[
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200',
                      selected ? 'border-accent-strong bg-accent/[0.06]' : 'border-line bg-page hover:bg-surface-alt',
                    ].join(' ')}
                  >
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
                      {thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {shoot.route_title || shoot.route_id}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {shoot.director_name && `${shoot.director_name} · `}
                        {dateFormatter.format(new Date(shoot.created_at))}
                      </span>
                    </span>
                    <span
                      className={[
                        'label-caps shrink-0 rounded-full px-2 py-1 text-[8.5px] font-medium',
                        shoot.shoot_status === 'delivered'
                          ? 'bg-accent/12 text-accent-strong'
                          : 'bg-surface-alt text-muted',
                      ].join(' ')}
                    >
                      {shootStatusLabel(shoot)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
