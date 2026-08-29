import type { StudioBooking } from '../../../app/api/studio/me/route';

type ShootSidebarProps = {
  shoots: StudioBooking[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
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
 *  pane shows on narrow screens. Only ever rendered while viewing a shoot —
 *  "create another shooting" takes over the full width with no sidebar, so
 *  there's no "active" state for this button to show. The collection
 *  offers live on that screen too, not here — this is pure navigation. */
export const ShootSidebar = ({ shoots, selectedId, onSelect, onCreateNew }: ShootSidebarProps) => (
  <div className="flex flex-col gap-5">
    <button
      type="button"
      onClick={onCreateNew}
      className="label-caps flex w-full items-center justify-center gap-2 rounded-xl bg-ink-block px-4 py-3 text-[10px] font-medium text-on-dark transition-colors duration-200 hover:bg-ink-block/85"
    >
      + Create another shooting
    </button>

    {shoots.length > 0 && (
      <div>
        <p className="label-caps px-1 text-[9px] font-medium text-muted">Your shoots</p>
        <ul className="mt-2 space-y-1.5">
          {shoots.map((shoot) => {
            const thumbnail = shootThumbnail(shoot);
            const selected = shoot.id === selectedId;

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
